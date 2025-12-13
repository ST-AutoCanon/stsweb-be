const express = require("express");
const router = express.Router();
const {
  getSalaryStatementHandler,
  updatePayslipHandler,
} = require("./../handlers/salaryStatementHandler");

// GET /api/salary-statement/:month/:year - Fetch salary data for the month/year
router.get("/:month/:year", getSalaryStatementHandler);

router.post("/update-payslip/:month/:year/:employeeId", updatePayslipHandler);

module.exports = router;