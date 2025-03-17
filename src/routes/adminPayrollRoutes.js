const express = require("express");
const router = express.Router();
const { fetchLastMonthSalary } = require("../handlers/adminPayrollHandler");

// Route for fetching last month's salary
router.get("/salary/last-month-total", fetchLastMonthSalary);

module.exports = router; // ✅ Correct CommonJS export
