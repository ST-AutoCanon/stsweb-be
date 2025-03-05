const express = require("express");
const router = express.Router();
const leaveQueriesHandler = require("../handlers/leaveQueriesHandler");

// Route to get recent leave queries for an employee
router.get("/leave-queries/:employeeId", leaveQueriesHandler.getLeaveQueriesHandler);

module.exports = router;
