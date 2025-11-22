// services/overtimeDetailsService.js
const pool = require("../config"); // ← VERY IMPORTANT: DB connection
const {
  UPSERT_OVERTIME_DETAILS,
  GET_OVERTIME_STATUS_SUMMARY,
} = require("../constants/overtimeQueries");

// Save or update overtime records (used by Approve/Reject)
const upsertOvertimeRecords = async (records, approvedById) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const results = [];

    for (const rec of records) {
      const {
        punch_id,
        work_date,        // "2025-11-20"
        employee_id,
        extra_hours,      // "2.50"
        rate,             // "150.00"
        project = null,
        supervisor = null,
        comments = null,
        status,           // "Approved" or "Rejected"
      } = rec;

      const [result] = await connection.query(UPSERT_OVERTIME_DETAILS, [
        punch_id,
        work_date,
        employee_id,
        parseFloat(extra_hours),
        rate ? parseFloat(rate) : null,
        project,
        supervisor,
        comments || null,
        status,
      ]);

      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    console.error("Error in upsertOvertimeRecords:", error);
    throw error;
  } finally {
    connection.release();
  }
};

// Optional: Get approved/rejected records for status summary
const getOvertimeStatusSummary = async (startDate, endDate) => {
  const [rows] = await pool.query(GET_OVERTIME_STATUS_SUMMARY, [startDate, endDate]);
  return rows;
};

module.exports = {
  upsertOvertimeRecords,
  getOvertimeStatusSummary,
};