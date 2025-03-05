

const express = require("express");
const router = express.Router();
const AttendanceHandler = require("../handlers/workDaysHandler");

router.get("/attendance/:employeeId", AttendanceHandler.getAttendanceStatsHandler);

module.exports = router;
