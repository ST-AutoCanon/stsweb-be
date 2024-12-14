const pool = require('../config/dbConfig');
const { insertLeaveRequest, selectLeaveRequests } = require('../constants/leaveQueries');

/**
 * Submits a leave request to the database.
 * @param {string} employeeId - Employee ID.
 * @param {string} startDate - Start date of the leave in YYYY-MM-DD format.
 * @param {string} endDate - End date of the leave in YYYY-MM-DD format.
 * @param {string} reason - Reason for the leave.
 * @param {string} leavetype - Type of leave.
 * @returns {Promise<object>} - Details of the created leave request.
 * @throws {Error} - Throws an error if the database query fails.
 */
async function submitLeaveRequest(employeeId, startDate, endDate, reason, leavetype) {
  try {
    const [result] = await pool.execute(insertLeaveRequest, [employeeId, startDate, endDate, reason, leavetype]);
    return {
      id: result.insertId,
      employeeId,
      startDate,
      endDate,
      reason,
      leavetype,
      status: 'Pending',
      rejectionReason: null,
    };
  } catch (error) {
    console.error('Error submitting leave request:', error);
    throw new Error('Failed to submit leave request.');
  }
}

/**
 * Retrieves leave requests for a specific employee by their ID.
 * @param {string} employeeId - Employee ID.
 * @returns {Promise<Array>} - List of leave requests for the employee.
 * @throws {Error} - Throws an error if the database query fails.
 */
async function getLeaveRequests(employeeId) {
  try {
    const [rows] = await pool.execute(selectLeaveRequests, [employeeId]);
    return rows;
  } catch (error) {
    console.error('Error retrieving leave requests:', error);
    throw new Error('Failed to retrieve leave requests.');
  }
}

module.exports = {
  submitLeaveRequest,
  getLeaveRequests,
};
