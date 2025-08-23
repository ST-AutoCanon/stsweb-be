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
// Replace the existing updateLeaveRequest implementation with this.

// Replace your existing updateLeaveRequest with this implementation

// Fully replace updateLeaveRequest with this implementation

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
    let query = queries.SELECT_LEAVE_REQUESTS; // Query already includes WHERE employee_id = ?
    const params = [employeeId];
    if (from_date) {
      query += " AND start_date >= ?";
      params.push(from_date);
    }
    if (to_date) {
      query += " AND end_date <= ?";
      params.push(to_date);
    }
    const [rows] = await db.execute(query, params);
    rows.forEach((row) => {
      row.start_date = toLocalDateString(row.start_date);
      row.end_date = toLocalDateString(row.end_date);
    });
    return rows;
  } catch (err) {
    console.error("Error retrieving leave requests:", err.message);
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

const constructWhereClause = (filters, employeeIds) => {
  const { status, search, from_date, to_date } = filters;
  const whereConditions = [];
  const params = [];
  if (status) {
    whereConditions.push("leavequeries.status = ?");
    params.push(status);
  }
  if (search) {
    whereConditions.push(`
      (leavequeries.employee_id LIKE ? OR 
       leavequeries.reason LIKE ? OR 
       CONCAT(employees.first_name, ' ', employees.last_name) LIKE ?)
    `);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (from_date) {
    whereConditions.push("leavequeries.start_date >= ?");
    params.push(from_date);
  }
  if (to_date) {
    whereConditions.push("leavequeries.end_date <= ?");
    params.push(to_date);
  }
  if (employeeIds.length > 0) {
    whereConditions.push(
      `leavequeries.employee_id IN (${employeeIds.map(() => "?").join(", ")})`
    );
    params.push(...employeeIds);
  }
  return { whereConditions, params };
};

const getLeaveQueriesForTeamLead = async (filters = {}, teamLeadId) => {
  try {
    const [teamLead] = await db.execute(queries.GET_EMPLOYEE_BY_ID, [
      teamLeadId,
    ]);
    if (teamLead.length === 0) {
      throw new Error("Team lead not found.");
    }
    const departmentId = teamLead[0].department_id;
    const [teamMembers] = await db.execute(
      queries.GET_EMPLOYEES_BY_DEPARTMENT,
      [departmentId]
    );
    if (teamMembers.length === 0) {
      throw new Error("No team members found in the same department.");
    }
    const employeeIds = teamMembers
      .map((member) => member.employee_id)
      .filter((id) => id !== teamLead[0].employee_id);
    const { whereConditions, params } = constructWhereClause(
      filters,
      employeeIds
    );
    const query =
      queries.GET_LEAVE_QUERIES_FOR_TEAM +
      (whereConditions.length ? " AND " + whereConditions.join(" AND ") : "");
    const [rows] = await db.execute(query, params);
    rows.forEach((row) => {
      row.start_date = toLocalDateString(row.start_date);
      row.end_date = toLocalDateString(row.end_date);
    });
    return rows;
  } catch (err) {
    console.error("Error fetching leave queries for team lead:", err.message);
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
