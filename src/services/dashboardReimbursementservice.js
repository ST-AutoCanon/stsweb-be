
const db = require("../config"); // Import your DB connection
const queries = require("../constants/empDetailsQueries"); // Import queries from constants

const getReimbursementStats = async (employeeId) => {
  try {
    const [rows] = await db.execute(queries.GET_REIMBURSEMENT_STATS, [employeeId]);
    return rows[0]; // Return the first row (since it's an aggregated query)
  } catch (error) {
    console.error("Error fetching reimbursement stats:", error);
    throw new Error("Database query failed");
  }
};

module.exports = {
  getReimbursementStats,
};