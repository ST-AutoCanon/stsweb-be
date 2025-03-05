const express = require("express");
const router = express.Router();
const attendanceHandler = require("../handlers/empSessionHandler");

// Route to fetch today's punch records
router.get("/today-punch/:employeeId", attendanceHandler.getTodayPunchRecords);

module.exports = router;
