const db = require("../config");
const queries = require("../constants/leaveQueries");

/**
 * Fetch leave queries from the database with optional filters.
 * 
 * @param {Object} filters - Filters to narrow down results.
 * @param {string} [filters.status] - Filter by leave status (e.g., Approved, Rejected).
 * @param {string} [filters.search] - Search by employee ID, reason, or employee name.
 * @param {string} [filters.from_date] - Filter by leave start date (inclusive).
 * @param {string} [filters.to_date] - Filter by leave end date (inclusive).
 * @returns {Promise<Object[]>} Leave query records that match the filters.
 *
 */
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
    return rows;
  } catch (err) {
    console.log("Error fetching leave queries:", err);
    console.error("Error fetching leave queries:", err.message);
    throw new Error("Failed to fetch leave queries.");
  }
};

/**
 * Update the status of a leave request (Approve or Reject).
 * 
 * @param {Object} data - Data for updating the leave request.
 * @param {number} data.leaveId - Leave request ID.
 * @param {string} data.status - Status to set (Approved or Rejected).
 * @param {string} [data.comments] - Reason for rejection, if applicable.
 */
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

/**
 * Submit a new leave request.
 * 
 * @param {Object} data - Data for submitting the leave request.
 * @param {string} data.employeeId - ID of the employee submitting the request.
 * @param {string} data.startDate - Leave start date.
 * @param {string} data.endDate - Leave end date.
 * @param {string} data.reason - Reason for leave.
 * @param {string} data.leavetype - Type of leave (e.g., Sick, Vacation).
 * @returns {Promise<Object>} Details of the submitted leave request.
 */
const submitLeaveRequest = async ({ employeeId, startDate, endDate, h_f_day, reason, leavetype }) => {
  try {
    const query = queries.INSERT_LEAVE_REQUEST;
    console.log(query);
    const params = [employeeId, startDate, endDate, h_f_day, reason, leavetype];
    console.log(params);
    const [result] = await db.execute(query, params);
    console.log(result);

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

/**
 * Retrieve leave requests for a specific employee by their ID with optional date filtering.
 * 
 * @param {string} employeeId - Employee ID.
 * @param {string} [from_date] - Start date filter (inclusive).
 * @param {string} [to_date] - End date filter (inclusive).
 * @returns {Promise<Object[]>} List of leave requests for the employee.
 */
const getLeaveRequests = async (employeeId, from_date = null, to_date = null) => {
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
    return rows;
  } catch (err) {
    console.error("Error retrieving leave requests:", err.message);
    throw new Error("Failed to retrieve leave requests.");
  }
};

/**
 * Edit an existing leave request if it is still pending.
 * 
 * @param {Object} data - Data for updating the leave request.
 * @param {number} data.leaveId - Leave request ID.
 * @param {string} data.employeeId - Employee ID (to verify ownership).
 * @param {string} data.startDate - New leave start date.
 * @param {string} data.endDate - New leave end date.
 * @param {string} data.reason - Updated reason for leave.
 * @param {string} data.leavetype - Updated leave type.
 * @returns {Promise<Object>} Updated leave request details.
 */
const editLeaveRequest = async ({ leaveId, employeeId, startDate, endDate, h_f_day, reason, leavetype }) => {
  try {
    // Check if the leave request is still pending
    const [existingLeave] = await db.execute(queries.GET_LEAVE_BY_ID, [leaveId, employeeId]);

    if (existingLeave.length === 0) {
      throw new Error("Leave request not found or not accessible.");
    }

    if (existingLeave[0].status !== "pending") {
      throw new Error("Leave request cannot be edited after approval or rejection.");
    }

    // Update leave request
    const query = queries.UPDATE_LEAVE_REQUEST;
    const params = [startDate, endDate, h_f_day, reason, leavetype, leaveId, employeeId];

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

/**
 * Cancel a leave request if it is still pending.
 * 
 * @param {number} leaveId - Leave request ID.
 * @param {string} employeeId - Employee ID (to verify ownership).
 * @returns {Promise<string>} Confirmation message.
 */
const cancelLeaveRequest = async (leaveId, employeeId) => {
  try {
    // Check if the leave request exists and is pending
    const [existingLeave] = await db.execute(queries.GET_LEAVE_BY_ID, [leaveId, employeeId]);

    if (existingLeave.length === 0) {
      throw new Error("Leave request not found or not accessible.");
    }

    if (existingLeave[0].status !== "pending") {
      throw new Error("Only pending leave requests can be canceled.");
    }

    // Cancel leave request
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
 * Fetch leave queries for a team lead's department.
 * 
 * @param {Object} filters - Filters to narrow down results.
 * @param {string} filters.status - Filter by leave status (e.g., Approved, Rejected).
 * @param {string} filters.search - Search by employee ID, reason, or employee name.
 * @param {string} filters.from_date - Filter by leave start date (inclusive).
 * @param {string} filters.to_date - Filter by leave end date (inclusive).
 * @param {string} teamLeadId - ID of the team lead.
 * @returns {Promise<Object[]>} Leave query records that match the filters.
 */
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

  // Filter by team members (employeeIds from the team)
  if (employeeIds.length > 0) {
    whereConditions.push(`leavequeries.employee_id IN (${employeeIds.map(() => '?').join(', ')})`);
    params.push(...employeeIds);
  }

  return { whereConditions, params };
};

const getLeaveQueriesForTeamLead = async (filters = {}, teamLeadId) => {
  try {
    // Get the department of the team lead
    const [teamLead] = await db.execute(queries.GET_EMPLOYEE_BY_ID, [teamLeadId]);

    if (teamLead.length === 0) {
      throw new Error("Team lead not found.");
    }

    const departmentId = teamLead[0].department_id;

    // Get all employees in the same department
    const [teamMembers] = await db.execute(queries.GET_EMPLOYEES_BY_DEPARTMENT, [departmentId]);

    if (teamMembers.length === 0) {
      throw new Error("No team members found in the same department.");
    }

    const employeeIds = teamMembers.map(member => member.employee_id);

    // Construct WHERE clause dynamically based on filters
    const { whereConditions, params } = constructWhereClause(filters, employeeIds);

    // If there are conditions, append them to the base query
    const query = queries.GET_LEAVE_QUERIES_FOR_TEAM + (whereConditions.length ? ' AND ' + whereConditions.join(' AND ') : '');

    const [rows] = await db.execute(query, params);
    return rows;
  } catch (err) {
    console.log("Error fetching leave queries for team lead:", err);
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