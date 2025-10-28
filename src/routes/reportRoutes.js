// src/routes/reportRoutes.js
const express = require("express");
const router = express.Router();

// Central handlers index (adjust the filename if you named it differently)
const reports = require("../handlers/reportsHandlerIndex");

/**
 * Ensure a route callback is a function. If not, return a safe fallback
 * that responds with 501 and logs the missing handler name.
 */
function ensureHandler(fn, name) {
  if (typeof fn === "function") return fn;
  return (req, res) => {
    console.error(
      `[reportRoutes] Handler "${name}" is not available. Returning 501.`
    );
    return res
      .status(501)
      .json({ message: `Handler "${name}" not implemented on server` });
  };
}

// Map routes to handlers (using ensureHandler to avoid Express crash)
router.get(
  "/attendance",
  ensureHandler(reports.downloadAttendanceReport, "downloadAttendanceReport")
);
router.get(
  "/leaves",
  ensureHandler(reports.downloadLeavesReport, "downloadLeavesReport")
);
router.get(
  "/reimbursements",
  ensureHandler(
    reports.downloadReimbursementsReport,
    "downloadReimbursementsReport"
  )
);

// Note: some handlers were split — ensure you export downloadEmployeesReport from your handlers index
router.get(
  "/employees",
  ensureHandler(reports.downloadEmployeesReport, "downloadEmployeesReport")
);

router.get(
  "/vendors",
  ensureHandler(reports.downloadVendorsReport, "downloadVendorsReport")
);
router.get(
  "/assets",
  ensureHandler(reports.downloadAssetsReport, "downloadAssetsReport")
);
router.get(
  "/tasks/supervisor",
  ensureHandler(
    reports.downloadTasksSupervisorReport,
    "downloadTasksSupervisorReport"
  )
);
router.get(
  "/tasks/employee",
  ensureHandler(
    reports.downloadTasksEmployeeReport,
    "downloadTasksEmployeeReport"
  )
);

// Departments + search
router.get(
  "/departments",
  ensureHandler(reports.getDepartments, "getDepartments")
);
router.get(
  "/search-employees",
  ensureHandler(reports.searchEmployees, "searchEmployees")
);

// Health / quick check
router.get("/ping", (req, res) => res.json({ ok: true }));

module.exports = router;
