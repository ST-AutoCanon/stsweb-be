const db = require("../config"); // Import database connection
const attendanceQueries = require("../constants/attendanceQueries"); // Import queries

const attendanceService = {
  // Fetch today's Punch records for an employee
  getTodayPunchRecords: async (employeeId) => {
    try {
      const [rows] = await db.execute(attendanceQueries.GET_TODAY_PUNCH_RECORDS, [employeeId]);
      return rows;
    } catch (error) {
      console.error("Error fetching today's punch records:", error);
      throw error;
    }
  }
};

module.exports = attendanceService;
