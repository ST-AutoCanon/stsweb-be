
const express = require("express");
const { saveSalaryDetailsHandler, getApprovedIdsHandler, getMonthlySalaryDataHandler } = require("../handlers/salaryDetailsHandler");

const router = express.Router();

router.post("/save", saveSalaryDetailsHandler);
router.get("/approved-ids", getApprovedIdsHandler);
router.get("/get-monthly", getMonthlySalaryDataHandler);  // New: Enables frontend merge

module.exports = router;