const express = require('express');
const { markAttendanceHandler } = require('../handlers/attendanceHandler');

const router = express.Router();

// Route to handle attendance
// http://localhost:5000/employee/attendance
/*
{
  "employeeId": "STS001",
  "type": "login",
  "location": "Office"
}

*/
router.post('/attendance', markAttendanceHandler);

module.exports = router;
