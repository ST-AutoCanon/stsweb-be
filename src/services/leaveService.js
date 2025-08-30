const db = require("../config");
const queries = require("../constants/leaveQueries");
const LeavePolicyService = require("./leavePolicyService");

/**
 * Helper: Format a Date object to "YYYY-MM-DD" using local time.
 */
const toLocalDateString = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// helper to parse date-only in local timezone robustly
const parseDateOnly = (isoDate) => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (!isNaN(d.getTime())) {
    // create local-midnight date to avoid timezone shifts
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  // fallback if isoDate is already 'YYYY-MM-DD' or similar
  const parts = String(isoDate).split("-");
  if (parts.length >= 3) {
    const [y, m, day] = parts;
    return new Date(Number(y), Number(m) - 1, Number(day));
  }
  return null;
};

// compute inclusive calendar days between two dates (local). Supports half-day
const computeInclusiveDays = (startDateStr, endDateStr, h_f_day = "") => {
  if (!startDateStr || !endDateStr) return 0;
  const start = parseDateOnly(startDateStr);
  const end = parseDateOnly(endDateStr);
  if (!start || !end || end < start) return 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = end - start;
  const dayCount = Math.round(diff / msPerDay) + 1; // inclusive integer days

  // If this is a half-day request (single day, marked Half Day), return 0.5
  // Adjust this logic to suit your stored H_F_day semantics.
  if (
    String(h_f_day).toLowerCase().includes("half") &&
    start.getTime() === end.getTime()
  ) {
    return 0.5;
  }

  return dayCount;
};

const getLeaveQueries = async (filters = {}) => {
  const { status, search, from_date, to_date } = filters;
  try {
    // Base query includes WHERE 1=1
    let query = queries.GET_LEAVE_QUERIES;
    const params = [];
    const whereConditions = [];

    if (status) {
      whereConditions.push("lq.status = ?");
      params.push(status);
    }
    if (search) {
      whereConditions.push(
        `(lq.employee_id LIKE ? OR lq.reason LIKE ? OR CONCAT(e.first_name, ' ', e.last_name) LIKE ?)`
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (from_date) {
      whereConditions.push("lq.start_date >= ?");
      params.push(from_date);
    }
    if (to_date) {
      whereConditions.push("lq.end_date <= ?");
      params.push(to_date);
    }
    if (whereConditions.length > 0) {
      // Append filters using AND, not a second WHERE
      query += ` AND ${whereConditions.join(" AND ")}`;
    }

    console.log("Executing SQL:", query, params);
    const [rows] = await db.execute(query, params);

    // Format dates for client
    rows.forEach((row) => {
      row.start_date = toLocalDateString(row.start_date);
      row.end_date = toLocalDateString(row.end_date);
    });

    return rows;
  } catch (err) {
    console.error("Error fetching leave queries:", err.message);
    throw new Error("Failed to fetch leave queries.");
  }
};

// ---- updateLeaveRequest (unchanged from your previous robust implementation) ----
const updateLeaveRequest = async (payload) => {
  const {
    leaveId,
    status,
    comments = null,
    compensated_days = 0,
    deducted_days = 0,
    loss_of_pay_days = 0,
    preserved_leave_days = null,
    actorId = null,
    total_days = null, // optional
  } = payload;

  // helper: make sure bind params never contain undefined
  const bind = (v) => (v === undefined ? null : v);

  let conn;
  try {
    console.log("[updateLeaveRequest] called with payload:", payload);

    // fetch leave
    console.log("[updateLeaveRequest] executing GET_LEAVE_BY_LEAVEID", [
      leaveId,
    ]);
    const [leaveRows] = await db.execute(queries.GET_LEAVE_BY_LEAVEID, [
      leaveId,
    ]);
    if (!leaveRows || leaveRows.length === 0) {
      const error = new Error("Leave request not found.");
      error.isBadRequest = true;
      throw error;
    }
    const leave = leaveRows[0];
    console.log("[updateLeaveRequest] loaded leave:", leave);

    const currentStatus = (leave.status || "").toLowerCase();
    if (currentStatus && currentStatus !== "pending") {
      const error = new Error(
        "Leave request cannot be modified after it has been processed."
      );
      error.isBadRequest = true;
      throw error;
    }

    const computedTotalDays = computeInclusiveDays(
      leave.start_date,
      leave.end_date,
      leave.H_F_day
    );
    console.log("[updateLeaveRequest] computedTotalDays:", computedTotalDays);

    // Decide authoritative totalDays (client may pass total_days)
    const EPS = 1e-6;
    let totalDays;
    if (
      total_days !== null &&
      total_days !== undefined &&
      !isNaN(Number(total_days))
    ) {
      totalDays = Number(total_days);
      if (Math.abs(totalDays - computedTotalDays) > EPS) {
        const err = new Error(
          `Client total_days (${totalDays}) does not match server computed days (${computedTotalDays}). Please re-check dates or send correct total_days.`
        );
        err.isBadRequest = true;
        throw err;
      }
    } else {
      totalDays = computedTotalDays;
    }

    // load remaining
    let remaining = 0;
    try {
      console.log(
        "[updateLeaveRequest] executing SELECT remaining FROM employee_leave_balances",
        [leave.employee_id, leave.leave_type]
      );
      const [balRows] = await db.execute(
        `SELECT remaining FROM employee_leave_balances WHERE employee_id = ? AND leave_type = ? LIMIT 1`,
        [leave.employee_id, leave.leave_type]
      );
      remaining = (balRows && balRows[0] && Number(balRows[0].remaining)) || 0;
    } catch (err) {
      if (err && err.code === "ER_NO_SUCH_TABLE") {
        console.warn(
          "employee_leave_balances missing — treating remaining=0. Run migrations to add table."
        );
        remaining = 0;
      } else {
        throw err;
      }
    }
    console.log("[updateLeaveRequest] remaining balance:", remaining);

    if (status === "Approved") {
      // coerce incoming values
      const c = Number(compensated_days) || 0;
      const d = Number(deducted_days) || 0;
      const l = Number(loss_of_pay_days) || 0;

      console.log("[updateLeaveRequest] incoming splits", {
        compensated: c,
        deducted: d,
        lop: l,
      });

      if (d - remaining > EPS) {
        console.warn(
          `[updateLeaveRequest] WARNING: deducted (${d}) exceeds remaining (${remaining}) for employee ${leave.employee_id}. Persisting values as provided (deducted=${d}, lop=${l}).`
        );
      }

      if (Math.abs(c + d + l - totalDays) > EPS) {
        const error = new Error(
          `Split values must add up to total requested days (${totalDays}). Received: compensated=${c}, deducted=${d}, loss_of_pay=${l}.`
        );
        error.isBadRequest = true;
        throw error;
      }

      // Begin transaction
      conn = await db.getConnection();
      await conn.beginTransaction();

      // Prepare values for write (round to 2 decimals)
      const c_write = Number(c.toFixed(2));
      const d_write = Number(d.toFixed(2));
      const l_write = Number(l.toFixed(2));
      const preserved_write =
        preserved_leave_days === null
          ? null
          : Number(Number(preserved_leave_days).toFixed(2));

      console.log(
        "[updateLeaveRequest] Persisting splits to DB (before write):",
        {
          leaveId,
          status,
          comments,
          compensated_days: c_write,
          deducted_days: d_write,
          loss_of_pay_days: l_write,
          preserved_leave_days: preserved_write,
        }
      );

      // EXECUTE: UPDATE_LEAVE_STATUS_EXTENDED (normalize undefined -> null)
      const paramsUpdateLeave = [
        bind(status),
        bind(comments),
        bind(c_write),
        bind(d_write),
        bind(l_write),
        bind(preserved_write),
        bind(leaveId),
      ];
      console.log(
        "[updateLeaveRequest] executing UPDATE_LEAVE_STATUS_EXTENDED with params:",
        paramsUpdateLeave
      );
      await conn.execute(
        queries.UPDATE_LEAVE_STATUS_EXTENDED,
        paramsUpdateLeave
      );

      // Adjust leave balance by the actual deducted_days (d_write)
      if (d_write > EPS) {
        try {
          console.log(
            "[updateLeaveRequest] Adjusting leave balance by:",
            d_write,
            "for employee",
            leave.employee_id
          );

          const paramsAdjust = [
            bind(d_write),
            bind(leave.employee_id),
            bind(leave.leave_type),
          ];
          console.log(
            "[updateLeaveRequest] executing ADJUST_LEAVE_BALANCE with params:",
            paramsAdjust
          );
          await conn.execute(queries.ADJUST_LEAVE_BALANCE, paramsAdjust);
        } catch (err) {
          if (err && err.code === "ER_NO_SUCH_TABLE") {
            console.warn(
              "employee_leave_balances missing — skipping adjust. Run migration."
            );
          } else {
            throw err;
          }
        }
      }

      // Insert LoP record (use l_write exactly) — use employee_id string (your table doesn't have numeric id)
      if (l_write > EPS) {
        try {
          const employeeIdForInsert = leave.employee_id; // keep the employee code string
          const paramsInsertLop = [
            bind(employeeIdForInsert),
            bind(leaveId),
            bind(l_write),
            bind(`LoP for leave ${leaveId}`),
          ];
          console.log(
            "[updateLeaveRequest] executing INSERT_LOP_RECORD with params:",
            paramsInsertLop
          );
          await conn.execute(queries.INSERT_LOP_RECORD, paramsInsertLop);
        } catch (err) {
          console.error(
            "[updateLeaveRequest] Failed to insert LOP record:",
            err && err.message ? err.message : err
          );
          throw err;
        }
      }

      // Audit: Insert leave_audit — store actorId (employee code) as actor_id
      try {
        const auditPayload = {
          compensated_days: c_write,
          deducted_days: d_write,
          loss_of_pay_days: l_write,
          preserved_leave_days: preserved_write,
        };
        const auditDetails = JSON.stringify(auditPayload);

        // Use actor identifier as-is (your employees table uses employee_id)
        const actorToStore = actorId === undefined ? null : actorId; // normalize
        const paramsInsertAudit = [
          bind(leaveId),
          bind(actorToStore),
          bind(`update:${status}`),
          bind(auditDetails),
        ];
        console.log(
          "[updateLeaveRequest] executing INSERT_LEAVE_AUDIT with params:",
          paramsInsertAudit
        );
        await conn.execute(queries.INSERT_LEAVE_AUDIT, paramsInsertAudit);
        console.log(
          "[updateLeaveRequest] inserted leave_audit (actor stored as provided):",
          actorToStore
        );
      } catch (err) {
        if (err && err.code === "ER_NO_SUCH_TABLE") {
          console.warn("leave_audit missing — skipping audit insert.");
        } else {
          throw err;
        }
      }

      // Commit
      await conn.commit();

      // release connection now that DB writes are committed
      conn.release();
      conn = null;

      // --- recompute & upsert employee_monthly_lop for affected months ---
      try {
        const leaveStart = parseDateOnly(leave.start_date);
        const leaveEnd = parseDateOnly(leave.end_date);

        if (leaveStart && leaveEnd) {
          const cursor = new Date(
            leaveStart.getFullYear(),
            leaveStart.getMonth(),
            1
          );
          const endCursor = new Date(
            leaveEnd.getFullYear(),
            leaveEnd.getMonth(),
            1
          );

          while (cursor <= endCursor) {
            const month = cursor.getMonth() + 1;
            const year = cursor.getFullYear();

            try {
              console.log(
                `[updateLeaveRequest] recomputing monthly LOP for ${leave.employee_id} for ${month}-${year}`
              );
              await LeavePolicyService.computeAndStoreMonthlyLOP(
                leave.employee_id,
                month,
                year
              );
            } catch (recomputeErr) {
              console.warn(
                `[updateLeaveRequest] Warning: failed to recompute monthly LOP for ${leave.employee_id} ${month}-${year}:`,
                recomputeErr && recomputeErr.message
                  ? recomputeErr.message
                  : recomputeErr
              );
            }

            cursor.setMonth(cursor.getMonth() + 1);
          }
        } else {
          console.warn(
            "[updateLeaveRequest] Could not parse leave start/end for LOP recompute."
          );
        }
      } catch (err) {
        console.warn(
          "[updateLeaveRequest] Unexpected error when recomputing monthly LOP:",
          err && err.message ? err.message : err
        );
      }

      console.log(
        "[updateLeaveRequest] commit successful and monthly LOP recomputed"
      );
      return;
    } else {
      // rejection path
      const paramsReject = [
        bind(status),
        bind(comments),
        bind(0),
        bind(0),
        bind(0),
        bind(preserved_leave_days),
        bind(leaveId),
      ];
      console.log(
        "[updateLeaveRequest] executing UPDATE_LEAVE_STATUS_EXTENDED (rejection) with params:",
        paramsReject
      );
      await db.execute(queries.UPDATE_LEAVE_STATUS_EXTENDED, paramsReject);
      return;
    }
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
        conn.release();
      } catch (e) {
        console.error("Failed to rollback:", e);
      }
    }
    console.error(
      "Error in LeaveService.updateLeaveRequest:",
      err.code || err.message || err
    );
    throw err;
  }
};

const submitLeaveRequest = async ({
  employeeId,
  startDate,
  endDate,
  h_f_day,
  reason,
  leavetype,
}) => {
  try {
    // Overlap check for new submissions only (if needed)
    const existingLeaves = await getLeaveRequests(employeeId);
    const newStartStr = startDate;
    const newEndStr = endDate;
    const isSingleOrHalf = newStartStr === newEndStr || h_f_day === "Half Day";

    const hasOverlap = existingLeaves.some((leave) => {
      const existingStartStr = toLocalDateString(leave.start_date);
      const existingEndStr = toLocalDateString(leave.end_date);
      if (isSingleOrHalf) {
        return (
          existingStartStr === newStartStr || existingEndStr === newStartStr
        );
      } else {
        return (
          (newStartStr >= existingStartStr && newStartStr <= existingEndStr) ||
          (newEndStr >= existingStartStr && newEndStr <= existingEndStr) ||
          (existingStartStr >= newStartStr && existingEndStr <= newEndStr)
        );
      }
    });

    if (hasOverlap) {
      throw new Error(
        "You already have a leave request on the selected date(s)."
      );
    }

    const query = queries.INSERT_LEAVE_REQUEST;
    const params = [employeeId, startDate, endDate, h_f_day, reason, leavetype];
    const [result] = await db.execute(query, params);
    return {
      id: result.insertId,
      employeeId,
      startDate,
      endDate,
      h_f_day,
      reason,
      leavetype,
      status: "Pending",
      comments: null,
    };
  } catch (err) {
    console.error("Error submitting leave request:", err.message);
    throw new Error("Failed to submit leave request.");
  }
};

const getLeaveRequests = async (
  employeeId,
  from_date = null,
  to_date = null
) => {
  try {
    // get base query (defensive: strip trailing semicolon)
    let baseQuery = (
      queries.SELECT_LEAVE_REQUESTS ||
      `
      SELECT
        lq.id,
        lq.employee_id,
        lq.leave_type,
        lq.start_date,
        lq.end_date,
        lq.H_F_day,
        lq.reason,
        lq.status,
        lq.comments,
        lq.created_at
      FROM leavequeries lq
    `
    )
      .trim()
      .replace(/;$/, ""); // <-- remove any trailing semicolon

    // detect if baseQuery already has WHERE and whether it already contains employee_id = ?
    const hasWhere = /\bwhere\b/i.test(baseQuery);
    const baseHasEmployeeCondition = /\b(lq\.)?employee_id\s*=\s*\?/i.test(
      baseQuery
    );

    // initial params must include placeholders already present in baseQuery (e.g. employee_id = ?)
    const initialParams = [];
    if (baseHasEmployeeCondition && employeeId) {
      initialParams.push(employeeId);
    }

    // build additional filter conditions (these will be appended)
    const filterConditions = [];
    const filterParams = [];

    if (!baseHasEmployeeCondition && employeeId) {
      // we need to add employee filter if baseQuery doesn't have it
      filterConditions.push("lq.employee_id = ?");
      filterParams.push(employeeId);
    }

    if (from_date) {
      filterConditions.push("lq.start_date >= ?");
      filterParams.push(from_date);
    }
    if (to_date) {
      filterConditions.push("lq.end_date <= ?");
      filterParams.push(to_date);
    }

    // append WHERE / AND correctly
    let finalQuery = baseQuery;
    if (filterConditions.length) {
      if (hasWhere) {
        finalQuery += " AND " + filterConditions.join(" AND ");
      } else {
        finalQuery += " WHERE " + filterConditions.join(" AND ");
      }
    }

    // ensure ORDER BY present (append if not already)
    if (!/\border\s+by\b/i.test(finalQuery)) {
      finalQuery += " ORDER BY lq.created_at DESC";
    }

    const finalParams = initialParams.concat(filterParams);

    console.log("[getLeaveRequests] SQL:", finalQuery, "params:", finalParams);

    const [rows] = await db.execute(finalQuery, finalParams);

    rows.forEach((row) => {
      row.start_date = toLocalDateString(row.start_date);
      row.end_date = toLocalDateString(row.end_date);
    });

    return rows;
  } catch (err) {
    console.error("Error retrieving leave requests:", err.message || err);
    throw new Error("Failed to retrieve leave requests.");
  }
};

const editLeaveRequest = async ({
  leaveId,
  employeeId,
  startDate,
  endDate,
  h_f_day,
  reason,
  leavetype,
}) => {
  try {
    // Required Field Check for Edit
    if (
      !leaveId ||
      !employeeId ||
      !startDate ||
      !endDate ||
      !h_f_day ||
      !reason ||
      !leavetype
    ) {
      throw new Error("All fields are required.");
    }

    const [existingLeave] = await db.execute(queries.GET_LEAVE_BY_ID, [
      leaveId,
      employeeId,
    ]);
    if (existingLeave.length === 0) {
      throw new Error("Leave request not found or not accessible.");
    }
    if (existingLeave[0].status !== "pending") {
      throw new Error(
        "Leave request cannot be edited after approval or rejection."
      );
    }

    // Skip duplicate (overlap) validation in edit mode.

    const query = queries.UPDATE_LEAVE_REQUEST;
    const params = [
      startDate,
      endDate,
      h_f_day,
      reason,
      leavetype,
      leaveId,
      employeeId,
    ];
    const [result] = await db.execute(query, params);
    if (result.affectedRows === 0) {
      throw new Error("Failed to update leave request.");
    }
    return {
      leaveId,
      employeeId,
      startDate,
      endDate,
      h_f_day,
      reason,
      leavetype,
      status: "Pending",
    };
  } catch (err) {
    console.error("Error updating leave request:", err.message);
    throw new Error("Failed to update leave request.");
  }
};

const cancelLeaveRequest = async (leaveId, employeeId) => {
  try {
    const [existingLeave] = await db.execute(queries.GET_LEAVE_BY_ID, [
      leaveId,
      employeeId,
    ]);
    if (existingLeave.length === 0) {
      throw new Error("Leave request not found or not accessible.");
    }
    if (existingLeave[0].status !== "pending") {
      throw new Error("Only pending leave requests can be canceled.");
    }
    const query = queries.DELETE_LEAVE_REQUEST;
    const params = [leaveId, employeeId];
    const [result] = await db.execute(query, params);
    if (result.affectedRows === 0) {
      throw new Error("Failed to cancel leave request.");
    }
    return "Leave request successfully canceled.";
  } catch (err) {
    console.error("Error canceling leave request:", err.message);
    throw new Error("Failed to cancel leave request.");
  }
};

/**
 * constructWhereClause
 * - filters: { status, search, from_date, to_date }
 * - employeeIds: array of employee ids to limit to (team)
 * - tableAlias: alias to use for leavequeries table (default 'lq')
 *
 * IMPORTANT: use the correct alias for employees joined in the query (we use alias `e`).
 */
const constructWhereClause = (
  filters = {},
  employeeIds = [],
  tableAlias = "lq"
) => {
  const { status, search, from_date, to_date } = filters || {};
  const whereConditions = [];
  const params = [];

  if (status) {
    whereConditions.push(`${tableAlias}.status = ?`);
    params.push(status);
  }

  if (search) {
    // NOTE: the employees table in our SELECT is joined as alias `e` in team query strings,
    // so use alias `e` here (not the literal 'employees') to avoid unknown column errors.
    whereConditions.push(
      `(${tableAlias}.employee_id LIKE ? OR ${tableAlias}.reason LIKE ? OR CONCAT(e.first_name, ' ', e.last_name) LIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (from_date) {
    whereConditions.push(`${tableAlias}.start_date >= ?`);
    params.push(from_date);
  }
  if (to_date) {
    whereConditions.push(`${tableAlias}.end_date <= ?`);
    params.push(to_date);
  }

  // employeeIds handling:
  if (Array.isArray(employeeIds)) {
    if (employeeIds.length > 0) {
      whereConditions.push(
        `${tableAlias}.employee_id IN (${employeeIds
          .map(() => "?")
          .join(", ")})`
      );
      params.push(...employeeIds);
    } else if (employeeIds.length === 0) {
      // caller explicitly passed empty array -> return no rows
      // append an always-false condition rather than generating IN ()
      whereConditions.push("1=0");
    }
  }

  return { whereConditions, params };
};

const getLeaveQueriesForTeamLead = async (filters = {}, teamLeadId) => {
  try {
    const [profRows] = await db.execute(queries.GET_EMP_PROF_BY_ID, [
      teamLeadId,
    ]);
    if (!profRows || profRows.length === 0) {
      throw new Error("Team lead professional profile not found.");
    }
    const prof = profRows[0];

    // role normalization + hierarchy sets
    const roleName = (prof.role || "").toString().trim().toLowerCase();
    const supervisorOrAbove = new Set([
      "supervisor",
      "manager",
      "admin",
      "ceo",
      "super admin",
    ]);
    const managerOrAbove = new Set(["manager", "admin", "ceo", "super admin"]);

    const employeeIdSet = new Set();

    // 1) direct reports (supervisor_id)
    if (supervisorOrAbove.has(roleName)) {
      const [directRows] = await db.execute(
        queries.GET_EMPLOYEES_BY_SUPERVISOR,
        [teamLeadId]
      );
      (directRows || []).forEach((r) => {
        if (r && r.employee_id) employeeIdSet.add(r.employee_id);
      });
    }

    // 2) department members (manager and above)
    if (managerOrAbove.has(roleName) && prof.department_id) {
      try {
        const [deptRows] = await db.execute(
          queries.GET_EMPLOYEES_BY_DEPARTMENT,
          [prof.department_id]
        );
        (deptRows || []).forEach((r) => {
          if (r && r.employee_id) employeeIdSet.add(r.employee_id);
        });
      } catch (err) {
        console.warn(
          "Warning: failed to fetch department employees:",
          err && err.message ? err.message : err
        );
      }
    }

    const employeeIds = Array.from(employeeIdSet);

    // Use table alias 'lq' because GET_LEAVE_QUERIES_FOR_TEAM selects FROM leavequeries lq
    const { whereConditions, params } = constructWhereClause(
      filters,
      employeeIds,
      "lq"
    );

    // Compose final query
    const query =
      queries.GET_LEAVE_QUERIES_FOR_TEAM +
      (whereConditions.length ? " AND " + whereConditions.join(" AND ") : "");

    console.log("[getLeaveQueriesForTeamLead] SQL:", query, "params:", params);

    const [rows] = await db.execute(query, params);

    rows.forEach((row) => {
      row.start_date = toLocalDateString(row.start_date);
      row.end_date = toLocalDateString(row.end_date);
    });

    return rows;
  } catch (err) {
    console.error(
      "Error fetching leave queries for team lead:",
      err && err.message ? err.message : err
    );
    throw new Error("Failed to fetch leave queries for team lead.");
  }
};

module.exports = {
  getLeaveQueries,
  updateLeaveRequest,
  submitLeaveRequest,
  getLeaveRequests,
  editLeaveRequest,
  cancelLeaveRequest,
  getLeaveQueriesForTeamLead,
  updateLeaveRequest,
};
