const express = require("express");
const router = express.Router();
const reimbursementHandlerOld = require("../handlers/reimbursementHandlerOld");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createReimbursement } = require("../services/reimbursementServiceOld");

/* ────────────────────────────────────────────────────────────
   FILE UPLOAD CONFIG
──────────────────────────────────────────────────────────── */

const forbiddenExts = new Set([
  ".xlsx",
  ".xls",
  ".xlsm",
  ".csv",
  ".zip",
  ".docx",
  ".xlsb",
  ".xltx",
  ".xltm",
]);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (forbiddenExts.has(ext)) {
    return cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `Files of type "${ext}" are not allowed.`
      ),
      false
    );
  }
  cb(null, true);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { employeeId } = req.body;
    if (!employeeId) {
      return cb(new Error("Employee ID is required"), null);
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const basePath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "reimbursement",
      String(year),
      String(month),
      String(employeeId)
    );

    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    cb(null, basePath);
  },

  filename: (req, file, cb) => {
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const { employeeId } = req.body;

    const uploadDir = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "reimbursement",
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(employeeId)
    );

    let counter = 1;
    let filename = `${date}_01${path.extname(file.originalname)}`;

    while (fs.existsSync(path.join(uploadDir, filename))) {
      counter++;
      filename = `${date}_${String(counter).padStart(2, "0")}${path.extname(
        file.originalname
      )}`;
    }

    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/* ────────────────────────────────────────────────────────────
   OLD REIMBURSEMENT ROUTES
──────────────────────────────────────────────────────────── */

// get all old reimbursements (admin)
router.get("/reimbursements", reimbursementHandlerOld.getAllReimbursements);

// get reimbursements by employee
router.get(
  "/reimbursement/:employeeId",
  reimbursementHandlerOld.getReimbursementsByEmployee
);

// update approval status
router.put(
  "/reimbursement/status/:id",
  reimbursementHandlerOld.updateReimbursementStatus
);

// update payment status
router.put(
  "/reimbursement/payment-status/:id",
  reimbursementHandlerOld.updatePaymentStatus
);

// create reimbursement
router.post(
  "/reimbursement",
  upload.array("attachments", 5),
  reimbursementHandlerOld.createReimbursement
);

// update reimbursement
router.put(
  "/reimbursement/:id",
  upload.array("attachments", 5),
  reimbursementHandlerOld.updateReimbursement
);

// delete reimbursement
router.delete(
  "/reimbursement/:id",
  reimbursementHandlerOld.deleteReimbursement
);

// team lead reimbursements
router.get(
  "/team/:teamLeadId/reimbursements",
  reimbursementHandlerOld.getTeamReimbursements
);

// project dropdown
router.get("/projectdrop", reimbursementHandlerOld.getAllProjects);

// attachments list
router.get(
  "/reimbursement/:reimbursementId/attachments",
  reimbursementHandlerOld.getAttachmentsByReimbursementId
);

// export reimbursements
router.get(
  "/reimbursements/export",
  reimbursementHandlerOld.exportReimbursements
);

// raw upload test route (optional)
router.post(
  "/reimbursement/upload",
  upload.array("attachments", 5),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    res.json({
      message: "Files uploaded successfully",
      files: req.files.map((f) => f.filename),
    });
  }
);

/* ────────────────────────────────────────────────────────────
   SECURE FILE VIEW (INLINE — NO HANDLER DEPENDENCY)
──────────────────────────────────────────────────────────── */

router.get("/reimbursement/:year/:month/:employeeId/:filename", (req, res) => {
  const { year, month, employeeId, filename } = req.params;

  if ([year, month, employeeId, filename].some((v) => v.includes(".."))) {
    return res.status(400).json({ message: "Invalid path" });
  }

  const filePath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "reimbursement",
    year,
    month,
    employeeId,
    filename
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".pdf": "application/pdf",
  };

  res.setHeader(
    "Content-Type",
    mimeTypes[path.extname(filename).toLowerCase()] ||
      "application/octet-stream"
  );
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

  fs.createReadStream(filePath).pipe(res);
});

// download reimbursement pdf
router.get(
  "/download/:claimId",
  reimbursementHandlerOld.generateReimbursementPDF
);

module.exports = router;
