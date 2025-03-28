const express = require("express");
const {
  submitLeaveRequestHandler,
  getLeaveRequestsHandler,
  getLeaveQueries,
  updateLeaveRequest,
  editLeaveRequestHandler,
  cancelLeaveRequestHandler,
  getLeaveRequestsForTeamLeadHandler,
} = require("../handlers/leaveHandler");

const router = express.Router();

// Debug logs: Remove once verified
console.log("submitLeaveRequestHandler:", submitLeaveRequestHandler);
console.log("getLeaveRequestsHandler:", getLeaveRequestsHandler);
console.log("getLeaveQueries:", getLeaveQueries);
console.log("updateLeaveRequest:", updateLeaveRequest);
console.log("editLeaveRequestHandler:", editLeaveRequestHandler);
console.log("cancelLeaveRequestHandler:", cancelLeaveRequestHandler);
console.log(
  "getLeaveRequestsForTeamLeadHandler:",
  getLeaveRequestsForTeamLeadHandler
);

// Define routes using the destructured handlers
router.post("/employee/leave", submitLeaveRequestHandler);
router.get("/employee/leave/:employeeId", getLeaveRequestsHandler);
router.get("/admin/leave", getLeaveQueries);
router.put("/admin/leave/:leaveId", updateLeaveRequest);
router.put("/edit/:leaveId", editLeaveRequestHandler);
router.delete("/cancel/:leaveId/:employeeId", cancelLeaveRequestHandler);
router.get("/team-lead/:teamLeadId", getLeaveRequestsForTeamLeadHandler);

module.exports = router;
