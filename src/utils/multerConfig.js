// utils/multerConfig.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure a directory exists, creating it (and parents) if needed
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// base upload directory
const BASE_UPLOADS = path.join(__dirname, "../../../EmployeeDetails");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Expect req.body.email to be set
    const email = req.body.email;
    if (!email) {
      return cb(new Error("Missing employee email in form data"), false);
    }

    // sanitize email for folder name
    const safeEmail = email.replace(/[^a-zA-Z0-9.@_-]/g, "_");
    const uploadDir = path.join(BASE_UPLOADS, safeEmail);

    // make sure it exists
    ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    // use the fieldname (photo, aadhaar_doc, pan_doc, etc.) plus original extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ]);
  if (allowed.has(file.mimetype)) cb(null, true);
  else
    cb(
      new Error(
        "Invalid file type. Only images, PDF, or Excel files are allowed."
      ),
      false
    );
};

module.exports = multer({ storage, fileFilter });
