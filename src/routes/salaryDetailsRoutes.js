
const express = require("express");
const { saveSalaryDetailsHandler, getApprovedIdsHandler } = require("../handlers/salaryDetailsHandler");

const router = express.Router();

router.post("/save", saveSalaryDetailsHandler);
router.get("/approved-ids", getApprovedIdsHandler);

module.exports = router;