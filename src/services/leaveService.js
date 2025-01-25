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
    return rows;
  } catch (err) {
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
const submitLeaveRequest = async ({ employeeId, startDate, endDate, reason, leavetype }) => {
  try {
    const query = queries.INSERT_LEAVE_REQUEST;
    const params = [employeeId, startDate, endDate, reason, leavetype];

    const [result] = await db.execute(query, params);

    return {
      id: result.insertId,
      employeeId,
      startDate,
      endDate,
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
 * Retrieve leave requests for a specific employee by their ID.
 * 
 * @param {string} employeeId - Employee ID.
 * @returns {Promise<Object[]>} List of leave requests for the employee.
 */
const getLeaveRequests = async (employeeId) => {
  try {
    const query = queries.SELECT_LEAVE_REQUESTS;
    const params = [employeeId];
    const [rows] = await db.execute(query, params);
    return rows;
  } catch (err) {
    console.error("Error retrieving leave requests:", err.message);
    throw new Error("Failed to retrieve leave requests.");
  }
};

module.exports = {
  getLeaveQueries,
  updateLeaveRequest,
  submitLeaveRequest,
  getLeaveRequests,
};