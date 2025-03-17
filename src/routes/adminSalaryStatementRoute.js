const express = require("express");
const router = express.Router();
const { fetchSalaryStatement, fetchEmployeeBankDetails } = require("../handlers/adminSalaryStatementHandler");

// Route for fetching salary statement for a given month and year
router.get("/salary-statement/:month/:year", fetchSalaryStatement);

// Route for fetching employee bank details by employee ID
router.get("/employee-bank-details/:employeeId", fetchEmployeeBankDetails);

module.exports = router;
