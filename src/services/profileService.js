
const pool = require('../config/dbConfig.js');
const EMPLOYEE_QUERIES = require('../constants/profileQueries.js');

async function getEmployeeProfile(employeeId) {
  try {
    const [rows] = await pool.execute(EMPLOYEE_QUERIES.getEmployeeProfile, [employeeId]);

    if (rows.length === 0) {
      throw new Error('Employee not found');
    }

    return rows[0];
  } catch (error) {
    console.error('Error in getEmployeeProfile:', error.message);
    throw error;
  }
}

module.exports = { getEmployeeProfile };
