const pool = require('../config/dbConfig');
const { ATTENDANCE_QUERIES } = require('../constants/attendanceQueries'); // Adjust the path as needed

async function recordAttendance(employeeId, type, location) {
  try {
    // Check if there's already an attendance record for the employee today
    const [existingRecord] = await pool.execute(ATTENDANCE_QUERIES.checkAttendance, [employeeId]);

    if (type === 'login') {
      if (existingRecord.length > 0) {
        throw new Error('Login already recorded for today.');
      }

      // Insert login record
      await pool.execute(ATTENDANCE_QUERIES.insertLogin, [employeeId, location]);
      return { message: 'Login recorded successfully' };
    }

    if (type === 'logout') {
      if (existingRecord.length === 0) {
        throw new Error('No login record found for today.');
      }

      // Update logout record
      await pool.execute(ATTENDANCE_QUERIES.updateLogout, [employeeId]);
      return { message: 'Logout recorded successfully' };
    }

    throw new Error('Invalid attendance type.');
  } catch (error) {
    console.error('Error in recordAttendance:', error.message);
    throw error;
  }
}

module.exports = { recordAttendance };
