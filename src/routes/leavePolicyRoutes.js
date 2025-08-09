const express = require("express");
const LeavePolicyHandler = require("../handlers/leavePolicyHandler");
const router = express.Router();

router.get("/", LeavePolicyHandler.getAllPolicies);
router.post("/", LeavePolicyHandler.createPolicy);
router.put("/:id", LeavePolicyHandler.updatePolicy);
router.delete("/:id", LeavePolicyHandler.deletePolicy);
router.get(
  "/employee/:employeeId/leave-balance",
  LeavePolicyHandler.getLeaveBalanceHandler
);
router.get(
  "/employee/:employeeId/monthly-lop",
  LeavePolicyHandler.getMonthlyLOPHandler
);

module.exports = router;
