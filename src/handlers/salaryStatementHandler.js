const salaryStatementService = require("./../services/salaryStatementService");

const getSalaryStatementHandler = async (req, res) => {
  try {
    const { month, year } = req.params;
    const result = await salaryStatementService.fetchSalaryData(month, year);
    res.json(result);
  } catch (error) {
    console.error("❌ Error in salary statement handler (GET):", error);
    res.status(500).json({ error: error.message });
  }
};

const updatePayslipHandler = async (req, res) => {
  try {
    const { month, year, employeeId } = req.params;
    const { payslip_generated } = req.body;
    const result = await salaryStatementService.updatePayslip(month, year, employeeId, payslip_generated);
    if (!result.success) {
      return res.status(result.status || 404).json({ error: result.message });
    }
    res.json(result);
  } catch (error) {
    console.error("❌ Error in payslip update handler (POST):", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSalaryStatementHandler,
  updatePayslipHandler,
};