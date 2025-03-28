const db = require("../config");
const queries = require("../constants/leaveQueries");

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

const getLeaveQueries = async (filters = {}) => {
  const { status, search, from_date, to_date } = filters;
  try {
    let query = queries.GET_LEAVE_QUERIES;
    const params = [];
    const whereConditions = [];

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
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(" AND ")}`;
    }
    const [rows] = await db.execute(query, params);
    console.log(query, params);
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

const updateLeaveRequest = async ({ leaveId, status, comments = null }) => {
  try {
    const query = queries.UPDATE_LEAVE_STATUS;
    const params = [status, comments, leaveId];
    const [result] = await db.execute(query, params);
    if (result.affectedRows === 0) {
      throw new Error("Leave request not found.");
    }
  } catch (err) {
    console.error("Error updating leave request:", err.message);
    throw new Error("Failed to update leave request.");
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
};
