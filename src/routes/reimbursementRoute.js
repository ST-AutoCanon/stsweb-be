const express = require("express");
const router = express.Router();
const reimbursementHandler = require("../handlers/reimbursementHandler");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createReimbursement } = require("../services/reimbursementService");

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
      `${year}`,
      `${month}`,
      `${employeeId}`
    );
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
      console.log(`Directory created: ${basePath}`);
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
      `${now.getFullYear()}`,
      `${String(now.getMonth() + 1).padStart(2, "0")}`,
      `${employeeId}`
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

// ── MULTER INSTANCE ───────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

router.get("/reimbursements", reimbursementHandler.getAllReimbursements);
// Routes for reimbursements
router.get(
  "/reimbursement/:employeeId",
  reimbursementHandler.getReimbursementsByEmployee
);

// Route to update reimbursement status (approval/rejection)
router.put(
  "/reimbursement/status/:id",
  reimbursementHandler.updateReimbursementStatus
);

// New route: Update payment status (only for admin, finance manager, team lead)
router.put(
  "/reimbursement/payment-status/:id",
  reimbursementHandler.updatePaymentStatus
);

// Updated route with multiple file uploads
router.post(
  "/reimbursement",
  upload.array("attachments", 5),
  reimbursementHandler.createReimbursement
);
console.log("fileuploads", createReimbursement);

router.put(
  "/reimbursement/:id",
  upload.array("attachments", 5),
  reimbursementHandler.updateReimbursement
);

router.put(
  "/reimbursement/status/:id",
  reimbursementHandler.updateReimbursementStatus
);
router.delete("/reimbursement/:id", reimbursementHandler.deleteReimbursement);
router.get(
  "/team/:teamLeadId/reimbursements",
  reimbursementHandler.getTeamReimbursements
);

router.get("/projectdrop", reimbursementHandler.getAllProjects);

router.get(
  "/reimbursement/:reimbursementId/attachments",
  reimbursementHandler.getAttachmentsByReimbursementId
);

router.get("/reimbursements/export", reimbursementHandler.exportReimbursements);

router.post(
  "/reimbursement/upload",
  upload.array("attachments", 5),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedFiles = req.files.map((file) => file.filename);
    res.json({ message: "Files uploaded successfully", files: uploadedFiles });
  },
  (err, req, res, next) => {
    res.status(500).json({ message: err.message });
  }
);

// Secure file retrieval route
router.get("/reimbursement/:year/:month/:employeeId/:filename", (req, res) => {
  const { year, month, employeeId, filename } = req.params;

  if (
    [year, month, employeeId, filename].some(
      (param) => param.includes("..") || param.includes("/")
    )
  ) {
    return res.status(400).json({ message: "Invalid filename" });
  }

  const filePath = path.join(
    __dirname,
    "..",
    "reimbursement",
    year,
    month,
    employeeId,
    filename
  );

  if (fs.existsSync(filePath)) {
    const mimeType =
      {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".pdf": "application/pdf",
      }[path.extname(filename).toLowerCase()] || "application/octet-stream";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename=${filename}`);

    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

router.get("/download/:claimId", reimbursementHandler.generateReimbursementPDF);

module.exports = router;
