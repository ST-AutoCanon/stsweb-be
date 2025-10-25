// src/services/reports.js
const utils = require("./reportUtils");
const filters = require("./reportFilters");
const queries = require("../constants/reportQueries"); // your existing queries file, unchanged

const fetchRows = utils.fetchRows;

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
  } catch (err) {
    console.error("[reports] getLeaveRows SQL error:", err);
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
      "[reports] Warning applying emp/dept filters:",
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
    // no status -> do nothing
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

  let normalized = (Array.isArray(rawRows) ? rawRows : []).map((r) =>
    filters.normalizeReimbursementRow(r)
  );

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

  const defaultOrder = [
    "id",
    "employee_id",
    "employee_name",
    "department_name",
    "claim_title",
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
    "status",
    "created_at",
    "updated_at",
    "approved_date",
    "approver_comments",
    "da",
    "transport_amount",
    "approver_name",
    "approver_designation",
    "approver_id",
    "stationary",
    "payment_status",
    "paid_date",
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
  // buildDateStatusParams returns [s,s,e,e,st,st] which matches this query (2 status placeholders)
  const params = filters.buildDateStatusParams(startDate, endDate, status);
  let rows;
  try {
    rows = await fetchRows(sql, params);
  } catch (err) {
    console.error("[reports] getAttendanceRows SQL error:", err);
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
      "[reports] Warning applying emp/dept filters (attendance):",
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
  // GET_SUPERVISOR_TASK_REPORT expects two status placeholders ( ? IS NULL OR LOWER(t.status)=LOWER(?) )
  const params = [s, s, e, e, st, st];

  try {
    // Diagnostics logging to help trace why rows might be filtered out
    console.debug(
      "[reports] getTaskRows - using GET_TASK_REPORT (exists):",
      !!queries.GET_TASK_REPORT
    );
    console.debug("[reports] getTaskRows - params:", params);

    // fetch raw rows from DB
    let rows = await fetchRows(sql, params);
    console.debug(
      "[reports] getTaskRows - raw rows type:",
      Array.isArray(rows) ? "array" : typeof rows
    );
    const rawCount = Array.isArray(rows) ? rows.length : 0;
    console.debug("[reports] getTaskRows - raw rows count:", rawCount);

    if (rawCount > 0) {
      // show a sample (first) row lightly
      try {
        console.debug(
          "[reports] getTaskRows - sample row keys:",
          Object.keys(rows[0] || {}).slice(0, 12)
        );
        const sample = Object.fromEntries(
          Object.entries(rows[0] || {}).map(([k, v]) => [
            k,
            v && String(v).length > 200
              ? String(v).slice(0, 200) + "…(truncated)"
              : v,
          ])
        );
        console.debug("[reports] getTaskRows - sample row (first):", sample);
      } catch (e) {
        console.debug(
          "[reports] getTaskRows - error printing sample row:",
          e && e.message
        );
      }
    }

    // Apply employee/department filters and log counts before/after
    let beforeFilterRows = Array.isArray(rows) ? rows : [];
    let afterRows = beforeFilterRows;
    try {
      afterRows = await filters.applyEmployeeAndDepartmentFilters(
        beforeFilterRows,
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
        e && (e.message || e)
      );
      // if filter fails, keep beforeFilterRows so we don't silently drop data
      afterRows = beforeFilterRows;
    }

    const afterCount = Array.isArray(afterRows) ? afterRows.length : 0;
    console.debug(
      "[reports] getTaskRows - rows after employee/department filters:",
      afterCount
    );

    // If filtering removed all rows, log diagnostic details so we can inspect
    if (rawCount > 0 && afterCount === 0) {
      console.warn(
        "[reports] getTaskRows - raw rows present but all removed by employee/department filters.",
        { employeeId, departmentId, status }
      );
      try {
        const uniqEmp = Array.from(
          new Set(
            beforeFilterRows
              .map((r) => (r.employee_id || "").toString())
              .filter(Boolean)
          )
        ).slice(0, 10);
        const uniqDept = Array.from(
          new Set(
            beforeFilterRows
              .map((r) => (r.department_name || "").toString())
              .filter(Boolean)
          )
        ).slice(0, 10);
        console.debug(
          "[reports] getTaskRows - unique employee_id(s) in raw rows (sample):",
          uniqEmp
        );
        console.debug(
          "[reports] getTaskRows - unique department_name(s) in raw rows (sample):",
          uniqDept
        );
      } catch (e) {}
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

/**
 * getWeeklyTaskRows
 *
 * Handles two cases:
 * 1) If the SQL already contains a leading "? IS NULL OR (... emp_status ... sup_status ... sup_review_status ...)"
 *    then the SQL expects FOUR status placeholders. Provide four placeholders (may be null).
 * 2) Otherwise inject a 3-comparison status clause only when a specific status is requested.
 */
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
    // detect whether the SQL already includes a leading '? IS NULL OR' style clause
    const hasBuiltInStatusPlaceholder = /\?\s*IS\s*NULL\s*OR/i.test(finalSql);

    if (hasBuiltInStatusPlaceholder) {
      // SQL expects 4 status placeholders — always provide four (can be null)
      params = [...params, st, st, st, st];
    } else {
      // SQL does not have the built-in clause: inject only if a status requested
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
      // if no status requested, params remain [s,s,e,e]
    }
  } catch (e) {
    console.warn(
      "[reports] Warning preparing weekly task SQL status clause:",
      e && (e.message || e)
    );
    // fallback handling
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
  } catch (err) {
    console.error("[reports] getWeeklyTaskRows SQL error:", err);
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
  } catch (err) {
    console.error("[reports] getEmployeeRows SQL error:", err);
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
      "[reports] Warning applying emp/dept filters (employees):",
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

async function searchEmployees({ q, limit = 10, departmentId = null } = {}) {
  const trimmed = typeof q === "string" ? q.trim() : "";
  if (!trimmed) return { results: [], total: 0 };
  const lim = Math.min(Number.isNaN(Number(limit)) ? 10 : Number(limit), 500);
  try {
    if (queries && queries.SEARCH_EMPLOYEES) {
      try {
        const params = [
          `%${trimmed}%`,
          `%${trimmed}%`,
          `%${trimmed}%`,
          departmentId,
          departmentId,
          lim,
        ];
        const rows = await fetchRows(queries.SEARCH_EMPLOYEES, params);
        return {
          results: Array.isArray(rows) ? rows : [],
          total: Array.isArray(rows) ? rows.length : 0,
        };
      } catch (e) {
        console.warn(
          "[reports] queries.SEARCH_EMPLOYEES failed, falling back:",
          e && e.message ? e.message : e
        );
      }
    }
    const safe = trimmed.replace(/%/g, "\\%");
    const wildcard = `%${safe}%`;
    const sql = `
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
        AND ( ? IS NULL OR pr.department_id = ? )
      ORDER BY employee_name ASC
      LIMIT ?
    `;
    const params = [
      wildcard,
      wildcard,
      wildcard,
      departmentId,
      departmentId,
      lim,
    ];
    let rows;
    try {
      rows = await fetchRows(sql, params);
    } catch (dbErr) {
      console.warn(
        "[reports] Main employee search query failed, trying without departments:",
        dbErr.message
      );
      const altSql = `
        SELECT
          e.employee_id,
          CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name,
          e.email,
          pr.department_id,
          '' AS department_name
        FROM employees e
        LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
        WHERE (CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
          AND ( ? IS NULL OR pr.department_id = ? )
        ORDER BY employee_name ASC
        LIMIT ?
      `;
      const altParams = [
        wildcard,
        wildcard,
        wildcard,
        departmentId,
        departmentId,
        lim,
      ];
      try {
        rows = await fetchRows(altSql, altParams);
      } catch (altErr) {
        console.error(
          "[reports] searchEmployees fallback errors:",
          dbErr.message,
          altErr.message
        );
        throw altErr || dbErr;
      }
    }
    let total = Array.isArray(rows) ? rows.length : 0;
    try {
      let countSql = `
        SELECT COUNT(*) AS cnt
        FROM employees e
        LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
        WHERE (CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
      `;
      const countParams = [wildcard, wildcard, wildcard];
      if (departmentId) {
        countSql += " AND pr.department_id = ?";
        countParams.push(departmentId);
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
      console.warn(
        "[reports] searchEmployees count query failed:",
        countErr.message
      );
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
      err && err.stack ? err.stack : err
    );
    throw err;
  }
}

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
  searchEmployees,
};
