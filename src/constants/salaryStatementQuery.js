const pool = require("../config");

const formatColumnName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");
};

const ensurePayslipColumn = async (tableName) => {
  try {
    const [columns] = await pool.query(
      `SHOW COLUMNS FROM \`${tableName}\` LIKE 'payslip_generated'`
    );
    if (columns.length === 0) {
      await pool.query(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`payslip_generated\` INT DEFAULT 0 NOT NULL`
      );
    }
    const [nullRows] = await pool.query(
      `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE payslip_generated IS NULL OR payslip_generated = ''`
    );
    if (nullRows[0].count > 0) {
      await pool.query(
        `UPDATE \`${tableName}\` SET payslip_generated = 0 WHERE payslip_generated IS NULL OR payslip_generated = ''`
      );
    }
  } catch (error) {
    console.error("❌ Error ensuring payslip column:", error);
    throw error;
  }
};

const getSalaryStatements = async (tableName) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
    return rows;
  } catch (error) {
    console.error("❌ Error fetching salary statements:", error);
    throw error;
  }
};

const getEmployeeRecord = async (tableName, employeeId) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM \`${tableName}\` WHERE employee_id = ?`,
      [employeeId]
    );
    return rows;
  } catch (error) {
    console.error("❌ Error fetching employee record:", error);
    throw error;
  }
};

const updatePayslipStatus = async (tableName, employeeId, payslipGenerated) => {
  try {
    const [result] = await pool.query(
      `UPDATE \`${tableName}\` SET payslip_generated = ? WHERE employee_id = ?`,
      [payslipGenerated, employeeId]
    );
    return result;
  } catch (error) {
    console.error("❌ Error updating payslip status:", error);
    throw error;
  }
};

const getUpdatedPayslipStatus = async (tableName, employeeId) => {
  try {
    const [rows] = await pool.query(
      `SELECT payslip_generated FROM \`${tableName}\` WHERE employee_id = ?`,
      [employeeId]
    );
    return rows;
  } catch (error) {
    console.error("❌ Error fetching updated payslip status:", error);
    throw error;
  }
};

module.exports = {
  ensurePayslipColumn,
  getSalaryStatements,
  getEmployeeRecord,
  updatePayslipStatus,
  getUpdatedPayslipStatus,
};