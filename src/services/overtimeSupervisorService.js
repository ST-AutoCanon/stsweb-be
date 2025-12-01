const pool = require("../config");
const {
  UPSERT_OVERTIME_SUPERVISOR,
} = require("../constants/overtimeSupervisorQueries");

const upsertOvertimeSupervisor = async (records, approvedById) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const results = [];

    for (const rec of records) {
      const {
        punch_id,
        work_date,
        employee_id,
        extra_hours,
        rate,
        project = null,
        supervisor = null,
        comments = null,
        status,
      } = rec;

      const [result] = await connection.query(UPSERT_OVERTIME_SUPERVISOR, [
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
    console.error("Error in upsertOvertimeSupervisor:", error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  upsertOvertimeSupervisor,
};
