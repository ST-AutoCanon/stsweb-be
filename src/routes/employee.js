const express = require("express");
const multer = require("multer");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const employeeHandler = require("../handlers/employeeHandler");
const upload = require("../utils/multerConfig");

const TMP = path.join(__dirname, "../tmp");
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP);

const excelUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TMP),
    filename: (_req, file, cb) =>
      cb(null, `bulk_${Date.now()}${path.extname(file.originalname)}`),
  }),
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.match(/\.xlsx?$/)) {
      return cb(new Error("Only .xls/.xlsx files allowed"), false);
    }
    cb(null, true);
  },
});

router.post(
  "/admin/employees/bulk",
  excelUpload.single("excel"),
  employeeHandler.bulkAddEmployees
);

router.post("/full", upload, employeeHandler.createFullEmployee);

router.get("/full/:employeeId", employeeHandler.getFullEmployee);

router.get("/user_roles", employeeHandler.listUserRoles);

router.get("/admin/employees", employeeHandler.searchEmployees);

router.get("/positions", employeeHandler.listPositions);

router.get("/positions/supervisors", employeeHandler.listSupervisorsByPosition);

router.put("/full/:employeeId", upload, employeeHandler.updateFullEmployee);

router.put(
  "/admin/employees/:employeeId/deactivate",
  employeeHandler.deactivateEmployee
);

router.get("/docs/*", employeeHandler.serveEmployeeFile);

router.post("/supervisor/assign", employeeHandler.assignSupervisor);

router.get(
  "/supervisor/history/:employeeId",
  employeeHandler.getSupervisorHistory
);

module.exports = router;
