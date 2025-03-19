const adminSalaryStatementService = require("../services/adminSalaryStatementService");

const adminSalaryStatementHandler = {
  // Fetch salary statement
  fetchSalaryStatement: async (req, res) => {
    try {
      const { month, year } = req.params;
      const salaryData = await adminSalaryStatementService.getSalaryStatement(month, year);
      res.json({ salary_statement: salaryData });
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch salary statement",
        details: error.message,
      });
    }
  },

  // Fetch employee bank details
  fetchEmployeeBankDetails: async (req, res) => {
    try {
      const { employeeId } = req.params;
      const bankDetails = await adminSalaryStatementService.getEmployeeBankDetails(employeeId);
      res.json({ bank_details: bankDetails });
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch employee bank details",
        details: error.message,
      });
    }
  },
};

module.exports = adminSalaryStatementHandler;
