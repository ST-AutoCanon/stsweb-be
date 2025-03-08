const express = require("express");
const router = express.Router();
const { getSalarySlipHandler } = require("../handlers/payrollHandler");
const { handleGetEmployeeBankDetails } = require("../handlers/payrollHandler");

// Route to fetch salary slip
router.get("/salary-slip", getSalarySlipHandler);
router.get("/bank-details/:employee_id", handleGetEmployeeBankDetails);


module.exports = router;
