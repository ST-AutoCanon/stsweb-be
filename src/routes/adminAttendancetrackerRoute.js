const express = require('express');
const router = express.Router();
const {
  getMissingPunchInEmployeesHandler,
  getEmployeesWithPunchInNotPunchedOutHandler,
  getEmployeesWorkedLessThan8HoursHandler,
  getEmployeesWorked8To10HoursHandler,
  getApprovedLeavesCurrentMonthHandler
} = require('../handlers/adminAttendancetrackerHandler');

// Endpoint to get employees missing punch-in for the month
router.get('/missing-punch-in', getMissingPunchInEmployeesHandler);

// Endpoint to get employees who punched in but not punched out
router.get('/punch-in-not-punched-out', getEmployeesWithPunchInNotPunchedOutHandler);

// Endpoint to get employees who worked less than 8 hours
router.get('/worked-less-than-8-hours', getEmployeesWorkedLessThan8HoursHandler);

// Endpoint to get employees who worked between 8 and 10 hours
router.get('/worked-8-to-10-hours', getEmployeesWorked8To10HoursHandler);

// 🚀 NEW: Endpoint to get approved leaves for the current month

router.get('/approved-leaves-current-month', getApprovedLeavesCurrentMonthHandler);


module.exports = router;
