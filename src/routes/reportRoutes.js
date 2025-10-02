// src/routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const reportHandler = require("../handlers/reportHandler");

// health check
router.get("/_ping", (req, res) =>
  res.json({ ok: true, time: new Date().toISOString() })
);

// existing routes
router.get("/leaves", reportHandler.downloadLeavesReport);
router.get("/reimbursements", reportHandler.downloadReimbursementsReport);

// new report routes
router.get("/employees", reportHandler.downloadEmployeesReport);
router.get("/vendors", reportHandler.downloadVendorsReport);
router.get("/assets", reportHandler.downloadAssetsReport);
router.get("/attendance", reportHandler.downloadAttendanceReport);

module.exports = router;
