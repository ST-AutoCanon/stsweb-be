const {
  ensurePayslipColumn,
  getSalaryStatements,
  getEmployeeRecord,
  updatePayslipStatus,
  getUpdatedPayslipStatus,
} = require("./../constants/salaryStatementQuery");

const fetchSalaryData = async (month, year) => {
  const tableName = `salary_sts_${month}_${year}`;
  try {
    await ensurePayslipColumn(tableName);
    const rows = await getSalaryStatements(tableName);
    if (rows.length === 0) {
      return { salary_statement: [] };
    }
    return { salary_statement: rows };
  } catch (error) {
    console.error("❌ Error in salary service (fetch):", error);
    throw error;
  }
};

const updatePayslip = async (month, year, employeeId, payslipGenerated) => {
  const tableName = `salary_sts_${month}_${year}`;
  try {
    await ensurePayslipColumn(tableName);
    const existingRows = await getEmployeeRecord(tableName, employeeId);
    if (existingRows.length === 0) {
      return {
        success: false,
        status: 404,
        message: "Employee record not found for this month/year",
      };
    }
    const currentValue = existingRows[0].payslip_generated ?? 0;
    const result = await updatePayslipStatus(tableName, employeeId, payslipGenerated);
    if (result.affectedRows === 0) {
      return {
        success: false,
        status: 404,
        message: "No rows updated - record may not exist or value unchanged",
      };
    }
    const updatedRow = await getUpdatedPayslipStatus(tableName, employeeId);
    return {
      success: true,
      message: `Payslip status updated to ${payslipGenerated}`,
      currentValue,
      newValue: updatedRow[0]?.payslip_generated,
    };
  } catch (error) {
    console.error("❌ Error in salary service (update):", error);
    throw error;
  }
};

module.exports = {
  fetchSalaryData,
  updatePayslip,
};