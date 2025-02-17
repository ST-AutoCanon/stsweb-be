const express = require("express");
const router = express.Router();
const LoginHandler = require("../handlers/loginHandler");
router.post("/login", LoginHandler.login);
// Route to fetch salary ranges
router.get('/salary-ranges', LoginHandler.getSalaryRanges);
// Route for getting attendance status count
router.get("/attendance-status", LoginHandler.getAttendanceStatusCount);
// Route for getting login data count (Daily, Weekly, Monthly)
router.get("/login-data-count", LoginHandler.getEmployeeLoginDataCount);
// Route for getting employee count by department
router.get("/employee-count", LoginHandler.getEmployeeCountByDepartment);
router.get('/employee-count-by-department', LoginHandler.getEmployeeCountByDepartment);
// Route for fetching total payroll data
router.get("/total-payroll-data", LoginHandler.getEmployeePayrollData);

module.exports = router;
