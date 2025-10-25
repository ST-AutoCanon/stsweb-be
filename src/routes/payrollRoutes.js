const express = require("express");
const router = express.Router();
const { getSalarySlipHandler } = require("../handlers/payrollHandler");
const { handleGetEmployeeBankDetails, fetchEmployeeDetails } = require("../handlers/payrollHandler");

// Route to fetch salary slip
router.get("/salary-slip", getSalarySlipHandler);
router.get("/bank-details/:employee_id", handleGetEmployeeBankDetails);
// Route to fetch employee details
router.get("/employee-details/:employee_id", fetchEmployeeDetails);

module.exports = router;