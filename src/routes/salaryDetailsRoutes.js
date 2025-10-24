const express = require("express");
const { saveSalaryDetailsHandler } = require("../handlers/salaryDetailsHandler");

const router = express.Router();

/**
 * @route POST /api/salary-details/save
 * @desc Save salary details to dynamic monthly table
 * @access Private (requires x-api-key and x-employee-id headers)
 * @body { salaryData: Array of objects with salary fields }
 */
router.post("/save", saveSalaryDetailsHandler);

module.exports = router;