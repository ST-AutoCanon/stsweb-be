const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const employeeHandler = require("../handlers/employeeHandler");
const upload = require("../utils/multerConfig");

router.post("/full", upload.any(), employeeHandler.createFullEmployee);

router.get("/full/:employeeId", employeeHandler.getFullEmployee);

router.get("/supervisors", employeeHandler.listSupervisors);

router.get("/admin/employees", employeeHandler.searchEmployees);

router.put(
  "/full/:employeeId",
  upload.any(),
  employeeHandler.updateFullEmployee
);

router.put(
  "/admin/employees/:employeeId/deactivate",
  employeeHandler.deactivateEmployee
);
router.post(
  "/admin/employees/bulk",
  upload.single("excel"),
  employeeHandler.bulkAddEmployees
);

// Allow subfolder file access via wildcard
router.get("/docs/*", employeeHandler.serveEmployeeFile);

module.exports = router;
