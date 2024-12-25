const db = require("../config");
const queries = require("../constants/queries");

/**
 * Fetch leave queries from the database with optional filters.
 * 
 * @param {Object} filters - Filters to narrow down results.
 * @param {string} [filters.status] - Filter by leave status (e.g., Approved, Rejected).
 * @param {string} [filters.search] - Search by employee ID or reason for leave.
 * @returns {Promise<Object[]>} Leave query records that match the filters.
 */
const getLeaveQueries = async (filters = {}) => {
  const { status, search } = filters;

  try {
    let query = queries.GET_LEAVE_QUERIES;
    const params = [];
    const whereConditions = [];

    if (status) {
      whereConditions.push(`leavequeries.status = ?`);
      params.push(status);
    }

    if (search) {
      whereConditions.push(`
        (leavequeries.employee_id LIKE ? OR 
        leavequeries.reason LIKE ? OR 
        CONCAT(employees.first_name, ' ', employees.last_name) LIKE ?)
      `);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(" AND ")}`;
    }

    const [rows] = await db.execute(query, params);
    return rows;
  } catch (err) {
    throw new Error("Error fetching leave queries");
  }
};

/**
 * Update the status of a leave request (Approve or Reject).
 * 
 * @param {Object} data - Data for updating the leave request.
 * @param {number} data.leaveId - Leave request ID.
 * @param {string} data.status - Status to set (Approved or Rejected).
 * @param {string} [data.rejectionReason] - Reason for rejection, if applicable.
 */
const updateLeaveRequest = async ({ leaveId, status, rejectionReason = null }) => {
  try {
    const query = queries.UPDATE_LEAVE_STATUS;
    const params = [status, rejectionReason, leaveId];

    // Log the query and parameters for debugging
    console.log('Executing update with params:', query, params);

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      throw new Error("Leave request not found");
    }
  } catch (err) {
    console.log("Error updating leave request:", err); // Log detailed error message
    throw new Error("Error updating leave request");
  }
};

module.exports = {
  getLeaveQueries,
  updateLeaveRequest,
};
