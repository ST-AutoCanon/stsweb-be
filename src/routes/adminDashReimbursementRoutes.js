const express = require("express");
const router = express.Router();
const { handleGetApprovedReimbursementLastMonth } = require("../handlers/adminDashReimbursementHandler"); // Ensure correct path

// Route to get total approved reimbursement for last month
router.get("/approved-reimbursement-last-month", handleGetApprovedReimbursementLastMonth);

module.exports = router;
