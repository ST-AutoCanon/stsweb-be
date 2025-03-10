const express = require("express");
const router = express.Router();
const reimbursementHandler = require("../handlers/dashboardReimbursementhandler");

// Define the route to get reimbursement statistics for a specific employee
router.get("/reimbursement/stats/:employeeId", reimbursementHandler.getReimbursementStats);

module.exports = router;
