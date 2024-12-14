const express = require("express");
const LeaveHandler = require("../handlers/leaveHandler");
const router = express.Router();

/**
 * @route GET /api/leave-queries
 * @desc Fetch leave queries with optional filters
 */
router.get("/admin/leave", LeaveHandler.getLeaveQueries);
router.put("/admin/leave/:leaveId/status", LeaveHandler.updateLeaveRequest);

module.exports = router;
