// src/services/reports.js
const utils = require("./reportUtils");
const filters = require("./reportFilters");
const queries = require("../constants/reportQueries"); // your existing queries file

const fetchRows = utils.fetchRows;

/**
 * Utility: Pretty label generator and overrides for human readable PDF/CSV headings.
 * Use getFieldDisplayNames(componentName) to obtain mapping.
 */
const LABEL_OVERRIDES = {
  // specific manual overrides
  replacement_task: "Replacement Task",
  H_F_day: "Half/Full Day",
  H_F_Day: "Half/Full Day",
  emp_status: "Employee Status",
  sup_status: "Supervisor Status",
  sup_review_status: "Supervisor Review Status",
  punchin_time: "Punch In Time",
  punchout_time: "Punch Out Time",
  created_at: "Created At",
  updated_at: "Updated At",
  employee_id: "Employee ID",
  employee_name: "Employee Name",
  department_name: "Department",
  claim_type: "Claim Type",
  transport_type: "Transport Type",
  accommodation_fees: "Accommodation Fees",
  total_amount: "Total Amount",
  approver_name: "Approver Name",
  approver_designation: "Approver Designation",
  approver_comments: "Approver Comments",
  payment_status: "Payment Status",
  paid_date: "Paid Date",
  joining_date: "Joining Date",
  dob: "Date of Birth",
  spouse_dob: "Spouse DOB",
  father_dob: "Father DOB",
  mother_dob: "Mother DOB",
  aadhaar_number: "Aadhaar Number",
  pan_number: "PAN Number",
  passport_number: "Passport Number",
  alternate_email: "Alternate Email",
  alternate_number: "Alternate Number",
  driving_license_number: "Driving License Number",
  uan_number: "UAN Number",
  pf_number: "PF Number",
  esi_number: "ESI Number",
  H_F: "Half/Full",
  H_F_day: "Half/Full Day",
};

/** Convert snake_case / camelCase keys to Title Case fallback label */
function prettyLabel(k) {
  if (!k || typeof k !== "string") return k;
  if (Object.prototype.hasOwnProperty.call(LABEL_OVERRIDES, k))
    return LABEL_OVERRIDES[k];
  // replace underscores and camelCase boundaries with spaces, then title case
  const spaced = k
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spaced
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getFieldDisplayNames(component = "default") {
  // some pre-built field sets for components - can be extended
  const sets = {
    employees: [
      "employee_id",
      "first_name",
      "last_name",
      "employee_name",
      "email",
      "dob",
      "phone_number",
      "status",
      "address",
      "domain",
      "employee_type",
      "role",
      "position",
      "department_id",
      "department_name",
      "supervisor_id",
      "supervisor_name",
      "salary",
      "joining_date",
      "resume_url",
    ],
    leaves: [
      "leave_id",
      "employee_id",
      "employee_name",
      "department_name",
      "leave_type",
      "H_F_day",
      "compensated_days",
      "deducted_days",
      "loss_of_pay_days",
      "preserved_leave_days",
      "start_date",
      "end_date",
      "reason",
      "comments",
      "is_defaulted",
      "status",
      "created_at",
      "updated_at",
    ],
    reimbursements: [
      "id",
      "reimbursement_id",
      "employee_id",
      "employee_name",
      "department_name",
      "claim_type",
      "transport_type",
      "from_date",
      "to_date",
      "date",
      "travel_from",
      "travel_to",
      "purpose",
      "purchasing_item",
      "accommodation_fees",
      "no_of_days",
      "total_amount",
      "meal_type",
      "service_provider",
      "da",
      "transport_amount",
      "stationary",
      "status",
      "approval_status",
      "payment_status",
      "approver_id",
      "approver_name",
      "approver_designation",
      "approver_comments",
      "approved_date",
      "paid_date",
      "created_at",
      "updated_at",
      "project",
      "meals_objective",
    ],
    attendance: [
      "punch_id",
      "employee_id",
      "employee_name",
      "department_name",
      "punch_status",
      "punchin_time",
      "punchin_device",
      "punchin_location",
      "punchout_time",
      "punchout_device",
      "punchout_location",
      "punchmode",
      "created_at",
    ],
    tasks: [
      "task_id",
      "employee_id",
      "employee_name",
      "task_title",
      "description",
      "start_date",
      "due_date",
      "status",
      "percentage",
      "progress_percentage",
      "created_at",
      "updated_at",
    ],
    weekly_tasks: [
      "task_id",
      "week_id",
      "task_date",
      "project_id",
      "project_name",
      "task_name",
      "replacement_task",
      "employee_id",
      "employee_name",
      "emp_status",
      "emp_comment",
      "sup_status",
      "sup_comment",
      "sup_review_status",
      "star_rating",
      "parent_task_id",
      "created_at",
      "updated_at",
    ],
  };

  const set = sets[component] || sets["default"] || [];
  // build mapping
  const map = {};
  for (const key of set) {
    map[key] = prettyLabel(key);
  }
  return map;
}

/**
 * attachEmployeeNames(rows)
 * If rows have employee_id but not employee_name, batch query employees table to attach names.
 * Also can attach some professional fields from employee_professional when missing.
 */
async function attachEmployeeNames(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const needName = rows.some((r) => r.employee_id && !r.employee_name);
  const needProf = rows.some(
    (r) =>
      r.employee_id &&
      (!r.employee_type ||
        !r.role ||
        !r.position ||
        (!r.joining_date && !r.joiningdate))
  );
  if (!needName && !needProf) return;

  const empIds = Array.from(
    new Set(
      rows
        .map((r) =>
          r.employee_id != null ? String(r.employee_id).trim() : null
        )
        .filter(Boolean)
    )
  );
  if (empIds.length === 0) return;

  const placeholders = empIds.map(() => "?").join(",");

  // Query employees table for name fields
  const empSql = `SELECT employee_id, first_name, last_name, email FROM employees WHERE employee_id IN (${placeholders})`;
  // Query professional table for additional info
  const profSql = `SELECT employee_id, department_id, domain, employee_type, role, position, supervisor_id, salary, resume_url, joining_date, FROM employee_professional WHERE employee_id IN (${placeholders})`;
  try {
    const [empRows, profRows] = await Promise.all([
      fetchRows(empSql, empIds).catch(() => []),
      fetchRows(profSql, empIds).catch(() => []),
    ]);
    const empMap = new Map();
    if (Array.isArray(empRows)) {
      for (const er of empRows) {
        const full =
          (er.employee_name && String(er.employee_name).trim()) ||
          `${(er.first_name || "").trim()} ${(
            er.last_name || ""
          ).trim()}`.trim();
        empMap.set(String(er.employee_id), {
          employee_name: full || "",
          email: er.email || "",
        });
      }
    }
    const profMap = new Map();
    if (Array.isArray(profRows)) {
      for (const pr of profRows) {
        profMap.set(String(pr.employee_id), {
          department_id:
            pr.department_id != null ? String(pr.department_id) : null,
          domain: pr.domain || null,
          employee_type: pr.employee_type || null,
          role: pr.role || null,
          position: pr.position || null,
          supervisor_id: pr.supervisor_id || null,
          salary: pr.salary != null ? pr.salary : null,
          resume_url: pr.resume_url || null,
          joining_date: pr.joining_date || null,
        });
      }
    }

    for (const r of rows) {
      const eid = r.employee_id != null ? String(r.employee_id).trim() : null;
      if (!eid) continue;
      if (!r.employee_name) {
        const em = empMap.get(eid);
        if (em && em.employee_name) {
          r.employee_name = em.employee_name;
        } else {
          // attempt to build from first/last present on row
          if (r.first_name || r.last_name) {
            r.employee_name = `${(r.first_name || "").trim()} ${(
              r.last_name || ""
            ).trim()}`.trim();
          } else {
            r.employee_name = r.employee_name || "";
          }
        }
      }
      const prof = profMap.get(eid);
      if (prof) {
        if (!r.department_id && prof.department_id != null)
          r.department_id = prof.department_id;
        if (!r.department_name && prof.department_id != null)
          r.department_name = r.department_name || "";
        if (!r.domain && prof.domain) r.domain = prof.domain;
        if (!r.employee_type && prof.employee_type)
          r.employee_type = prof.employee_type;
        if (!r.role && prof.role) r.role = prof.role;
        if (!r.position && prof.position) r.position = prof.position;
        if ((!r.joining_date || r.joining_date === "") && prof.joining_date)
          r.joining_date = prof.joining_date;

        if (!r.salary && prof.salary != null) r.salary = prof.salary;
      }
    }
  } catch (e) {
    console.warn("[reports] attachEmployeeNames failed:", e && e.message);
  }
}

/**
 * attachDeptNames(rows)
 * If rows have department_id but not department_name, query departments to attach names.
 */
async function attachDeptNames(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const missing = rows.some(
    (r) => (r.department_id || r.pr_department_id) && !r.department_name
  );
  if (!missing) return;

  const deptIds = Array.from(
    new Set(
      rows
        .map((r) => {
          if (r.department_id != null) return String(r.department_id);
          if (r.pr_department_id != null) return String(r.pr_department_id);
          return null;
        })
        .filter(Boolean)
    )
  );
  if (deptIds.length === 0) return;

  const placeholders = deptIds.map(() => "?").join(",");
  const sql = `SELECT id, name FROM departments WHERE id IN (${placeholders})`;
  try {
    const dbRows = await fetchRows(sql, deptIds);
    const map = new Map();
    if (Array.isArray(dbRows)) {
      for (const dr of dbRows) {
        map.set(String(dr.id), dr.name || "");
      }
    }
    for (const r of rows) {
      const did =
        r.department_id != null
          ? String(r.department_id)
          : r.pr_department_id != null
          ? String(r.pr_department_id)
          : null;
      if (did && !r.department_name)
        r.department_name = map.get(did) || r.department_name || "";
    }
  } catch (e) {
    console.warn("[reports] attachDeptNames failed:", e && e.message);
  }
}

/* --------------------------- Report functions (original logic, improved) --------------------------- */

async function getLeaveRows(
  startDate,
  endDate,
  status,
  fields,
  employeeId = null,
  departmentId = null
) {
  const sql = queries.GET_LEAVE_REPORT;
  if (!sql) {
    console.error("[reports] GET_LEAVE_REPORT missing in reportQueries");
    throw new Error("Missing GET_LEAVE_REPORT SQL definition");
  }
  const params = filters.buildDateStatusParams(startDate, endDate, status);
  let rows;
  try {
    rows = await fetchRows(sql, params);
    rows = Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error("[reports] getLeaveRows SQL error:", err);
    throw err;
  }

  // attach employee/department readable names if missing
  await attachEmployeeNames(rows);
  await attachDeptNames(rows);

  try {
    rows = await filters.applyEmployeeAndDepartmentFilters(
      rows,
      employeeId,
      departmentId,
      async (deptId) => {
        if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
          return await fetchRows(queries.GET_DEPARTMENT_NAME_BY_ID, [deptId]);
        }
        return [];
      }
    );
  } catch (e) {
    console.warn(
      "[reports] Warning applying emp/dept filters:",
      e && e.message
    );
  }

  // Server-side safe status filter (fallback if SQL didn't filter)
  try {
    const statusCandidate = filters.normalizeStatusForQuery(status);
    if (statusCandidate) {
      const before = rows.length;
      rows = rows.filter((r) =>
        filters.statusMatches(statusCandidate, [r.status])
      );
      const after = rows.length;
      console.debug(
        `[reports] getLeaveRows status filter applied '${statusCandidate}': ${before} -> ${after}`
      );
    }
  } catch (e) {
    console.warn(
      "[reports] getLeaveRows status safety filter failed:",
      e && e.message
    );
  }

  const defaultOrder = [
    "leave_id",
    "employee_id",
    "employee_name",
    "department_name",
    "leave_type",
    "H_F_day",
    "start_date",
    "end_date",
    "status",
    "reason",
    "comments",
    "is_defaulted",
    "created_at",
    "updated_at",
    "compensated_days",
    "deducted_days",
    "loss_of_pay_days",
    "preserved_leave_days",
  ];
  return filters.keepOnlyFields(rows, fields, defaultOrder);
}

async function getReimbursementRows(
  startDate,
  endDate,
  status,
  fields,
  employeeId = null,
  departmentId = null
) {
  const rawSql = queries.GET_REIMBURSEMENT_REPORT;
  if (!rawSql || typeof rawSql !== "string") {
    console.error(
      "[reports] GET_REIMBURSEMENT_REPORT missing in reportQueries"
    );
    throw new Error("Missing GET_REIMBURSEMENT_REPORT SQL definition");
  }

  const s = startDate || null;
  const e = endDate || null;
  const stRaw = filters.normalizeStatusForQuery(status);
  const st = stRaw ? String(stRaw).trim().toLowerCase() : null;

  let baseSql = rawSql;
  try {
    const statusClauseRegex =
      /AND\s*\(\s*\?\s*IS\s*NULL\s*OR\s*LOWER\s*\(\s*COALESCE\s*\(\s*r\.payment_status\s*,\s*r\.status\s*,\s*''\s*\)\s*\)\s*=\s*LOWER\s*\(\s*\?\s*\)\s*\)\s*/i;
    baseSql = rawSql.replace(statusClauseRegex, "");
  } catch (e) {
    baseSql = rawSql;
  }

  const params = [s, s, e, e];
  let statusSql = "";
  if (!st) {
    // nothing - SQL expects null placeholders from buildDateStatusParams earlier
  } else if (st === "approved/paid") {
    statusSql =
      " AND LOWER(COALESCE(r.status, '')) = ? AND LOWER(COALESCE(r.payment_status, '')) = ? ";
    params.push("approved", "paid");
  } else if (st === "approved/pending") {
    statusSql =
      " AND LOWER(COALESCE(r.status, '')) = ? AND LOWER(COALESCE(r.payment_status, '')) = ? ";
    params.push("approved", "pending");
  } else if (st === "approved/unpaid") {
    statusSql =
      " AND LOWER(COALESCE(r.status, '')) = ? AND (r.payment_status IS NULL OR r.payment_status = '' OR LOWER(r.payment_status) = ?) ";
    params.push("approved", "unpaid");
  } else if (st === "paid" || st === "unpaid") {
    if (st === "unpaid") {
      statusSql =
        " AND (r.payment_status IS NULL OR r.payment_status = '' OR LOWER(r.payment_status) = ?) ";
      params.push("unpaid");
    } else {
      statusSql = " AND LOWER(COALESCE(r.payment_status, '')) = ? ";
      params.push("paid");
    }
  } else if (["approved", "pending", "rejected"].includes(st)) {
    statusSql = " AND LOWER(COALESCE(r.status, '')) = ? ";
    params.push(st);
  } else {
    statusSql = " AND LOWER(COALESCE(r.payment_status, r.status, '')) = ? ";
    params.push(st);
  }

  let finalSql = baseSql;
  try {
    const orderByMatch = /ORDER\s+BY/i;
    const idx = finalSql.search(orderByMatch);
    if (idx >= 0) {
      finalSql = finalSql.slice(0, idx) + statusSql + " " + finalSql.slice(idx);
    } else {
      finalSql = finalSql + " " + statusSql;
    }
  } catch (e) {
    finalSql = finalSql + " " + statusSql;
  }

  const rawRows = await fetchRows(finalSql, params);
  let normalized = Array.isArray(rawRows) ? rawRows : [];

  // attach names if missing
  await attachEmployeeNames(normalized);
  await attachDeptNames(normalized);

  try {
    normalized = await filters.applyEmployeeAndDepartmentFilters(
      normalized,
      employeeId,
      departmentId,
      async (deptId) => {
        if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
          return await fetchRows(queries.GET_DEPARTMENT_NAME_BY_ID, [deptId]);
        }
        return [];
      }
    );
  } catch (e) {
    console.warn(
      "[reports] Warning applying emp/dept filters:",
      e && e.message
    );
  }

  // Safety server-side status filter (extra guard)
  try {
    const statusCandidate = filters.normalizeStatusForQuery(status);
    if (statusCandidate) {
      const before = normalized.length;
      normalized = normalized.filter((r) =>
        filters.statusMatches(statusCandidate, [
          r.status,
          r.payment_status,
          r.approval_status,
        ])
      );
      const after = normalized.length;
      console.debug(
        `[reports] getReimbursementRows status filter '${statusCandidate}': ${before} -> ${after}`
      );
    }
  } catch (e) {
    console.warn(
      "[reports] getReimbursementRows status safety filter failed:",
      e && e.message
    );
  }

  const defaultOrder = [
    "id",
    "reimbursement_id",
    "employee_id",
    "employee_name",
    "department_name",
    "claim_type",
    "transport_type",
    "from_date",
    "to_date",
    "date",
    "travel_from",
    "travel_to",
    "purpose",
    "purchasing_item",
    "accommodation_fees",
    "no_of_days",
    "total_amount",
    "meal_type",
    "service_provider",
    "da",
    "transport_amount",
    "stationary",
    "status",
    "approval_status",
    "payment_status",
    "approver_id",
    "approver_name",
    "approver_designation",
    "approver_comments",
    "approved_date",
    "paid_date",
    "created_at",
    "updated_at",
    "project",
    "meals_objective",
  ];

  return filters.keepOnlyFields(normalized, fields, defaultOrder);
}

async function getAttendanceRows(
  startDate,
  endDate,
  status,
  fields,
  employeeId = null,
  departmentId = null
) {
  const sql = queries.GET_EMPLOYEE_ATTENDANCE_REPORT;
  if (!sql) {
    console.error(
      "[reports] GET_EMPLOYEE_ATTENDANCE_REPORT missing in reportQueries"
    );
    throw new Error("Missing GET_EMPLOYEE_ATTENDANCE_REPORT SQL definition");
  }

  // FIX: attendance SQL commonly expects exactly four date params [s, s, e, e]
  // (e.g. ? IS NULL OR (punchin_time >= ?)  ... ? IS NULL OR (punchin_time < DATE_ADD(?, INTERVAL 1 DAY)))
  // Using filters.buildDateStatusParams could produce extra placeholders (status-related)
  // which led to "Malformed communication packet" when params length didn't match SQL.
  const s = startDate || null;
  const e = endDate || null;
  const params = [s, s, e, e];

  let rows;
  try {
    rows = await fetchRows(sql, params);
    rows = Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error(
      "[reports] getAttendanceRows SQL error:",
      err && (err.stack || err)
    );
    throw err;
  }

  // Attach employee name / department name if missing on attendance rows
  await attachEmployeeNames(rows);
  await attachDeptNames(rows);

  try {
    rows = await filters.applyEmployeeAndDepartmentFilters(
      rows,
      employeeId,
      departmentId,
      async (deptId) => {
        if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
          return await fetchRows(queries.GET_DEPARTMENT_NAME_BY_ID, [deptId]);
        }
        return [];
      }
    );
  } catch (e) {
    console.warn(
      "[reports] Warning applying emp/dept filters (attendance):",
      e && e.message
    );
  }

  // Safety server-side filter for attendance status (punching)
  try {
    const statusCandidate = filters.normalizeStatusForQuery(status);
    if (statusCandidate) {
      const before = rows.length;
      rows = rows.filter((r) =>
        filters.statusMatches(statusCandidate, [r.punch_status, r.status])
      );
      const after = rows.length;
      console.debug(
        `[reports] getAttendanceRows status filter '${statusCandidate}': ${before} -> ${after}`
      );
    }
  } catch (e) {
    console.warn(
      "[reports] getAttendanceRows status safety filter failed:",
      e && e.message
    );
  }

  const defaultOrder = [
    "punch_id",
    "employee_id",
    "employee_name",
    "department_name",
    "punch_status",
    "punchin_time",
    "punchin_device",
    "punchin_location",
    "punchout_time",
    "punchout_device",
    "punchout_location",
    "punchmode",
    "created_at",
  ];
  return filters.keepOnlyFields(rows, fields, defaultOrder);
}

async function getTaskRows(
  startDate,
  endDate,
  status,
  fields,
  employeeId = null,
  departmentId = null
) {
  const sql = queries.GET_TASK_REPORT;
  if (!sql) {
    console.error("[reports] GET_TASK_REPORT missing in reportQueries");
    throw new Error("Missing GET_TASK_REPORT SQL definition");
  }
  const s = startDate || null;
  const e = endDate || null;
  const st = filters.normalizeStatusForQuery(status);
  const params = [s, s, e, e, st, st];

  try {
    let rows = await fetchRows(sql, params);
    rows = Array.isArray(rows) ? rows : [];

    // attach names if missing
    await attachEmployeeNames(rows);
    await attachDeptNames(rows);

    // Apply employee/department filters
    let afterRows = rows;
    try {
      afterRows = await filters.applyEmployeeAndDepartmentFilters(
        rows,
        employeeId,
        departmentId,
        async (deptId) => {
          if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
            return await fetchRows(queries.GET_DEPARTMENT_NAME_BY_ID, [deptId]);
          }
          return [];
        }
      );
    } catch (e) {
      console.warn(
        "[reports] Warning applying emp/dept filters (tasks):",
        e && e.message
      );
      afterRows = rows;
    }

    const defaultOrder = [
      "task_id",
      "employee_id",
      "employee_name",
      "task_title",
      "description",
      "start_date",
      "due_date",
      "status",
      "percentage",
      "progress_percentage",
      "created_at",
      "updated_at",
    ];
    return filters.keepOnlyFields(afterRows, fields, defaultOrder);
  } catch (err) {
    console.error(
      "[reports] getTaskRows SQL error:",
      (err && err.stack) || err
    );
    throw err;
  }
}

async function getWeeklyTaskRows(
  startDate,
  endDate,
  status,
  fields,
  employeeId = null,
  departmentId = null
) {
  const sql = queries.GET_EMPLOYEE_TASK_REPORT;
  if (!sql) {
    console.error(
      "[reports] GET_EMPLOYEE_TASK_REPORT missing in reportQueries"
    );
    throw new Error("Missing GET_EMPLOYEE_TASK_REPORT SQL definition");
  }

  const s = startDate || null;
  const e = endDate || null;
  const stRaw = filters.normalizeStatusForQuery(status);
  const st = stRaw !== undefined && stRaw !== null ? stRaw : null;

  let finalSql = sql;
  let params = [s, s, e, e];

  try {
    const hasBuiltInStatusPlaceholder = /\?\s*IS\s*NULL\s*OR/i.test(finalSql);

    if (hasBuiltInStatusPlaceholder) {
      params = [...params, st, st, st, st];
    } else {
      if (st && st !== "all") {
        const statusClause = `
          AND (
            LOWER(COALESCE(wt.emp_status, '')) = LOWER(?) OR
            LOWER(COALESCE(wt.sup_status, '')) = LOWER(?) OR
            LOWER(COALESCE(wt.sup_review_status, '')) = LOWER(?)
          )
        `;
        const orderByMatch = /ORDER\s+BY/i;
        const idx = finalSql.search(orderByMatch);
        if (idx >= 0) {
          finalSql =
            finalSql.slice(0, idx) + statusClause + " " + finalSql.slice(idx);
        } else {
          finalSql = finalSql + " " + statusClause;
        }
        params = [...params, st, st, st];
      }
    }
  } catch (e) {
    console.warn(
      "[reports] Warning preparing weekly task SQL status clause:",
      e && e.message
    );
    if (st && st !== "all") {
      finalSql =
        finalSql +
        `
        AND (
          LOWER(COALESCE(wt.emp_status, '')) = LOWER(?) OR
          LOWER(COALESCE(wt.sup_status, '')) = LOWER(?) OR
          LOWER(COALESCE(wt.sup_review_status, '')) = LOWER(?)
        )
      `;
      params = [...params, st, st, st];
    } else if (/\?\s*IS\s*NULL\s*OR/i.test(finalSql)) {
      params = [...params, null, null, null, null];
    }
  }

  let rows;
  try {
    rows = await fetchRows(finalSql, params);
    rows = Array.isArray(rows) ? rows : [];

    await attachEmployeeNames(rows);
    await attachDeptNames(rows);

    try {
      rows = await filters.applyEmployeeAndDepartmentFilters(
        rows,
        employeeId,
        departmentId,
        async (deptId) => {
          if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
            return await fetchRows(queries.GET_DEPARTMENT_NAME_BY_ID, [deptId]);
          }
          return [];
        }
      );
    } catch (e) {
      console.warn(
        "[reports] Warning applying emp/dept filters (weekly tasks):",
        e && e.message
      );
    }

    const defaultOrder = [
      "task_id",
      "week_id",
      "task_date",
      "project_id",
      "project_name",
      "task_name",
      "replacement_task",
      "employee_id",
      "employee_name",
      "emp_status",
      "emp_comment",
      "sup_status",
      "sup_comment",
      "sup_review_status",
      "star_rating",
      "parent_task_id",
      "created_at",
      "updated_at",
    ];
    return filters.keepOnlyFields(rows, fields, defaultOrder);
  } catch (err) {
    console.error(
      "[reports] getWeeklyTaskRows SQL error:",
      err && (err.stack || err)
    );
    throw err;
  }
}

async function getEmployeeRows(
  startDate,
  endDate,
  status,
  fields,
  employeeId = null,
  departmentId = null
) {
  const sql = queries.GET_EMPLOYEE_REPORT;
  if (!sql) {
    console.error("[reports] GET_EMPLOYEE_REPORT missing in reportQueries");
    throw new Error("Missing GET_EMPLOYEE_REPORT SQL definition");
  }
  const params = filters.buildDateStatusParams(startDate, endDate, status);
  let rows;
  try {
    rows = await fetchRows(sql, params);
    rows = Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error("[reports] getEmployeeRows SQL error:", err);
    throw err;
  }

  // ensure employee_name alias exists even if SQL alias is 'name'
  for (const r of rows) {
    if (!r.employee_name) {
      r.employee_name =
        r.employee_name ||
        r.name ||
        `${(r.first_name || "").trim()} ${(r.last_name || "").trim()}`.trim() ||
        "";
    }
    // department fallback
    if (!r.department_name) {
      r.department_name = r.department_name || r.department || "";
    }
  }

  // Attach professional/personal data where missing
  await attachEmployeeNames(rows); // already attaches prof fields like role/position/joining_date
  await attachDeptNames(rows);

  try {
    rows = await filters.applyEmployeeAndDepartmentFilters(
      rows,
      employeeId,
      departmentId,
      async (deptId) => {
        if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
          return await fetchRows(queries.GET_DEPARTMENT_NAME_BY_ID, [deptId]);
        }
        return [];
      }
    );
  } catch (e) {
    console.warn(
      "[reports] Warning applying emp/dept filters (employees):",
      e && e.message
    );
  }

  // Server-side safe status filter for employees (Active/Inactive etc)
  try {
    const statusCandidate = filters.normalizeStatusForQuery(status);
    if (statusCandidate) {
      const before = rows.length;
      rows = rows.filter((r) =>
        filters.statusMatches(statusCandidate, [
          r.status,
          r.emp_status,
          r.approval_status,
        ])
      );
      const after = rows.length;
      console.debug(
        `[reports] getEmployeeRows status filter '${statusCandidate}': ${before} -> ${after}`
      );
    }
  } catch (e) {
    console.warn(
      "[reports] getEmployeeRows status safety filter failed:",
      e && e.message
    );
  }

  const defaultOrder = [
    "employee_id",
    "employee_name",
    "first_name",
    "last_name",
    "email",
    "phone_number",
    "status",
    "department_id",
    "department_name",
    "role",
    "position",
    "joining_date",
    "salary",
    "dob",
    "created_at",
  ];
  return filters.keepOnlyFields(rows, fields, defaultOrder);
}

async function getVendorRows(
  startDate,
  endDate,
  status,
  fields,
  employeeId = null,
  departmentId = null
) {
  const sql = queries.GET_VENDOR_REPORT;
  if (!sql) {
    console.error("[reports] GET_VENDOR_REPORT missing in reportQueries");
    throw new Error("Missing GET_VENDOR_REPORT SQL definition");
  }
  const params = filters.buildDateStatusParams(startDate, endDate, status);
  let rows;
  try {
    rows = await fetchRows(sql, params);
    rows = Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error("[reports] getVendorRows SQL error:", err);
    throw err;
  }
  try {
    rows = await filters.applyEmployeeAndDepartmentFilters(
      rows,
      employeeId,
      departmentId,
      async (deptId) => {
        if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
          return await fetchRows(queries.GET_DEPARTMENT_NAME_BY_ID, [deptId]);
        }
        return [];
      }
    );
  } catch (e) {
    console.warn(
      "[reports] Warning applying emp/dept filters (vendors):",
      e && e.message
    );
  }
  const defaultOrder = [
    "vendor_id",
    "company_name",
    "registered_address",
    "city",
    "state",
    "pin_code",
    "gst_number",
    "pan_number",
    "company_type",
    "contact1_mobile",
    "contact1_email",
    "bank_name",
    "branch",
    "account_number",
    "ifsc_code",
    "bank_branch",
    "product_category",
    "years_of_experience",
    "created_at",
  ];
  return filters.keepOnlyFields(rows, fields, defaultOrder);
}

async function getAssetRows(
  startDate,
  endDate,
  status,
  fields,
  employeeId = null,
  departmentId = null
) {
  const sql = queries.GET_ASSET_REPORT;
  if (!sql) {
    console.error("[reports] GET_ASSET_REPORT missing in reportQueries");
    throw new Error("Missing GET_ASSET_REPORT SQL definition");
  }
  const s = startDate || null;
  const e = endDate || null;
  const st =
    status && String(status).trim().toLowerCase() !== "all" ? status : null;
  const params = [s, s, e, e, st, st, st, st, st, st, st];
  let rows;
  try {
    rows = await fetchRows(sql, params);
    rows = Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error("[reports] getAssetRows SQL error:", err);
    throw err;
  }
  try {
    if (
      (employeeId != null && String(employeeId).trim() !== "") ||
      (departmentId != null && String(departmentId).trim() !== "")
    ) {
      const adaptedRows = rows.map((r) => {
        const copy = Object.assign({}, r);
        if (
          !Object.prototype.hasOwnProperty.call(copy, "employee_id") &&
          copy.assigned_to
        ) {
          copy.employee_id = copy.assigned_to;
        }
        return copy;
      });
      rows = await filters.applyEmployeeAndDepartmentFilters(
        adaptedRows,
        employeeId,
        departmentId,
        async (deptId) => {
          if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
            return await fetchRows(queries.GET_DEPARTMENT_NAME_BY_ID, [deptId]);
          }
          return [];
        }
      );
    }
  } catch (e) {
    console.warn(
      "[reports] Warning applying emp/dept filters (assets):",
      e && e.message
    );
  }
  const defaultOrder = [
    "asset_id",
    "asset_code",
    "asset_name",
    "configuration",
    "category",
    "sub_category",
    "assigned_to",
    "document_path",
    "valuation_date",
    "status",
    "count",
    "created_at",
  ];
  return filters.keepOnlyFields(rows, fields, defaultOrder);
}

/* get departments - same robust attempts as before */
async function getDepartments() {
  try {
    if (queries && queries.GET_DEPARTMENTS) {
      const rows = await fetchRows(queries.GET_DEPARTMENTS, []);
      if (!Array.isArray(rows)) return [];
      return rows.map((r) => ({
        department_id:
          r.department_id ?? r.id ?? r.dept_id ?? r.departmentId ?? null,
        department_name:
          r.department_name ?? r.name ?? r.departmentName ?? r.department ?? "",
      }));
    }
    const attempts = [
      `SELECT id AS department_id, name AS department_name FROM departments ORDER BY name ASC LIMIT 1000`,
      `SELECT department_id, department_name FROM departments ORDER BY department_name ASC LIMIT 1000`,
      `SELECT department_id, department_name FROM department ORDER BY department_name ASC LIMIT 1000`,
      `SELECT id as department_id, department_name as department_name FROM department ORDER BY department_name ASC LIMIT 1000`,
      `SELECT * FROM departments LIMIT 1000`,
      `SELECT * FROM department LIMIT 1000`,
    ];
    for (const sql of attempts) {
      try {
        const rows = await fetchRows(sql, []);
        if (Array.isArray(rows)) {
          return rows.map((r) => ({
            department_id:
              r.department_id ?? r.id ?? r.dept_id ?? r.departmentId ?? null,
            department_name:
              r.department_name ??
              r.name ??
              r.departmentName ??
              r.department ??
              "",
          }));
        }
      } catch (e) {}
    }
    return [];
  } catch (err) {
    console.error(
      "[reports] getDepartments error:",
      err && err.stack ? err.stack : err
    );
    throw err;
  }
}

async function searchEmployees(arg) {
  // If arg is a string: treat as q and return array
  if (typeof arg === "string") {
    const q = arg.trim();
    if (!q) return [];
    const res = await searchEmployees({ q, limit: 10 });
    return Array.isArray(res.results) ? res.results : [];
  }

  // otherwise treat arg as options object
  const { q, limit = 10, departmentId = null } = arg || {};
  const trimmed = typeof q === "string" ? q.trim() : "";
  if (!trimmed) return { results: [], total: 0 };

  // coerce and clamp limit (we will interpolate this into SQL)
  let lim = Number(limit);
  if (!Number.isFinite(lim) || lim <= 0) lim = 10;
  lim = Math.min(lim, 500);

  try {
    // First try using pre-defined query constant if present
    if (queries && queries.SEARCH_EMPLOYEES) {
      try {
        let sql = queries.SEARCH_EMPLOYEES;
        const wildcard = `%${trimmed}%`;
        const params = [wildcard, wildcard, wildcard];

        // Detect and handle optional department clause patterns.
        // If departmentId provided, keep clause and push the param(s).
        // If NOT provided, remove the optional clause so placeholders match params.
        // The pattern attempts to match common optional patterns used in this project.
        const deptClausePatterns = [
          /\s*AND\s*\(\s*\?\s*IS\s*NULL\s*OR\s*pr\.department_id\s*=\s*\?\s*\)\s*/i,
          /\s*AND\s*\(\s*\?\s*IS\s*NULL\s*OR\s*d\.id\s*=\s*\?\s*\)\s*/i,
          /\s*AND\s*\(NULL\s*\?\s*OR\s*pr\.department_id\s*=\s*\?\s*\)\s*/i,
        ];

        let removedDeptClause = false;
        if (departmentId && String(departmentId).trim() !== "") {
          // push department param(s) expected by most optional clause shapes
          params.push(String(departmentId));
          params.push(String(departmentId));
        } else {
          // try to remove any known optional dept clause so params remain correct
          for (const pat of deptClausePatterns) {
            if (pat.test(sql)) {
              sql = sql.replace(pat, " ");
              removedDeptClause = true;
              break;
            }
          }
        }

        // Many SEARCH_EMPLOYEES SQL variants include a final LIMIT ? placeholder.
        // To avoid binding LIMIT as a parameter (which can trigger driver errors),
        // remove a trailing "LIMIT ?" if present and instead append a literal LIMIT.
        // We'll attempt to replace "LIMIT ?" with an empty string (if present)
        // and then add "LIMIT <lim>" at the end.
        sql = sql.replace(/\bLIMIT\s*\?\s*;?$/i, ""); // remove ending LIMIT ?
        // ensure we don't accidentally leave multiple queries; keep SQL tidy
        sql = sql.trim();

        // Append safe LIMIT (coerced integer)
        sql = sql + ` LIMIT ${lim}`;

        // Execute
        const rows = await fetchRows(sql, params);
        const items = Array.isArray(rows) ? rows : [];
        // ensure department_name present
        for (const r of items) {
          if (!r.department_name) r.department_name = r.department_name || "";
        }

        // Now compute total if possible (do separate count query)
        let total = items.length;
        try {
          let countSql = `
            SELECT COUNT(*) AS cnt
            FROM employees e
            LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
            WHERE (CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
          `;
          const countParams = [wildcard, wildcard, wildcard];
          if (departmentId && String(departmentId).trim() !== "") {
            countSql += " AND pr.department_id = ?";
            countParams.push(String(departmentId));
          }
          const cntRows = await fetchRows(countSql, countParams);
          if (
            Array.isArray(cntRows) &&
            cntRows[0] &&
            typeof cntRows[0].cnt !== "undefined"
          ) {
            total = Number(cntRows[0].cnt);
          }
        } catch (countErr) {
          // ignore count fallback errors (we already have items)
        }

        return { results: items, total };
      } catch (e) {
        console.warn(
          "[reports] queries.SEARCH_EMPLOYEES failed, falling back:",
          e && e.message
        );
      }
    }

    // fallback SQL (no pre-defined constant)
    const safe = trimmed.replace(/%/g, "\\%");
    const wildcard = `%${safe}%`;

    // Build fallback SQL and INTERPOLATE LIMIT rather than binding it.
    let sql = `
      SELECT
        e.employee_id,
        CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name,
        e.email,
        pr.department_id,
        COALESCE(d.name, '') AS department_name
      FROM employees e
      LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
      LEFT JOIN departments d ON pr.department_id = d.id
      WHERE (CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
    `;
    const params = [wildcard, wildcard, wildcard];

    if (departmentId && String(departmentId).trim() !== "") {
      sql += " AND pr.department_id = ?";
      params.push(String(departmentId));
    }

    sql += `
      ORDER BY employee_name ASC
      LIMIT ${lim}
    `;

    const rows = await fetchRows(sql, params);
    let total = Array.isArray(rows) ? rows.length : 0;
    try {
      let countSql = `
        SELECT COUNT(*) AS cnt
        FROM employees e
        LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
        WHERE (CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
      `;
      const countParams = [wildcard, wildcard, wildcard];
      if (departmentId && String(departmentId).trim() !== "") {
        countSql += " AND pr.department_id = ?";
        countParams.push(String(departmentId));
      }
      const cntRows = await fetchRows(countSql, countParams);
      if (
        Array.isArray(cntRows) &&
        cntRows[0] &&
        typeof cntRows[0].cnt !== "undefined"
      ) {
        total = Number(cntRows[0].cnt);
      }
    } catch (countErr) {
      // ignore
    }

    const results = Array.isArray(rows)
      ? rows.map((r) => ({
          employee_id: r.employee_id ?? null,
          employee_name: r.employee_name ?? "",
          email: r.email ?? "",
          department_id: r.department_id ?? null,
          department_name: r.department_name ?? "",
        }))
      : [];

    return { results, total };
  } catch (err) {
    console.error(
      "[reports] searchEmployees error:",
      err && (err.stack || err)
    );
    throw err;
  }
}

async function buildMetaFromReqQuery(query) {
  // Return an object with readable strings so PDF header generation
  // doesn't end up with objects (e.g. "[object Object]").
  const meta = {
    filters: [],
    summary: "",
    employeeName: null,
    departmentName: null,
    employee: null,
    department: null,
  };
  try {
    const q = query || {};
    const startDate = q.startDate || q.start_date || null;
    const endDate = q.endDate || q.end_date || null;
    const status = q.status || null;
    const employeeId = q.employee_id || q.employeeId || null;
    const departmentId = q.department_id || q.departmentId || null;

    // Date filter display
    if (startDate || endDate) {
      if (startDate && endDate)
        meta.filters.push(`Date: ${startDate} → ${endDate}`);
      else if (startDate) meta.filters.push(`From: ${startDate}`);
      else meta.filters.push(`To: ${endDate}`);
    } else {
      meta.filters.push("Date: (no range specified)");
    }

    // Status
    if (status && String(status).trim() !== "") {
      meta.filters.push(`Status: ${status}`);
      meta.status = String(status);
    }

    // Employee lookup (human name)
    if (employeeId && String(employeeId).trim() !== "") {
      try {
        const rows = await fetchRows(
          `SELECT employee_id, first_name, last_name, email FROM employees WHERE employee_id = ? LIMIT 1`,
          [String(employeeId)]
        ).catch(() => []);
        if (Array.isArray(rows) && rows[0]) {
          const r = rows[0];
          const name =
            `${(r.first_name || "").trim()} ${(
              r.last_name || ""
            ).trim()}`.trim() ||
            r.email ||
            r.employee_id;
          meta.employee = { id: r.employee_id, name };
          meta.employeeName = name;
          meta.filters.push(`Employee: ${name} (${r.employee_id})`);
        } else {
          meta.employeeName = String(employeeId);
          meta.filters.push(`Employee: ${employeeId}`);
        }
      } catch (e) {
        meta.employeeName = String(employeeId);
        meta.filters.push(`Employee: ${employeeId}`);
      }
    }

    // Department lookup
    if (departmentId && String(departmentId).trim() !== "") {
      try {
        const drows = await fetchRows(
          `SELECT id, name FROM departments WHERE id = ? LIMIT 1`,
          [String(departmentId)]
        ).catch(() => []);
        if (Array.isArray(drows) && drows[0]) {
          meta.department = { id: drows[0].id, name: drows[0].name };
          meta.departmentName = drows[0].name;
          meta.filters.push(`Department: ${drows[0].name}`);
        } else {
          meta.departmentName = String(departmentId);
          meta.filters.push(`Department: ${departmentId}`);
        }
      } catch (e) {
        meta.departmentName = String(departmentId);
        meta.filters.push(`Department: ${departmentId}`);
      }
    }

    // Build a one-line summary string for convenience in templates
    meta.summary = meta.filters.join(" | ");
    return meta;
  } catch (err) {
    console.warn("[reports] buildMetaFromReqQuery failed:", err && err.message);
    return { filters: [], summary: "" };
  }
}

/* export public API */
module.exports = {
  getLeaveRows,
  getReimbursementRows,
  getAttendanceRows,
  getTaskRows,
  getWeeklyTaskRows,
  getEmployeeRows,
  getVendorRows,
  getAssetRows,
  getDepartments,
  // searchEmployees: wrapper
  searchEmployees,
  // Extra utility: mapping for pretty PDF headers
  getFieldDisplayNames,
  buildMetaFromReqQuery,
};
