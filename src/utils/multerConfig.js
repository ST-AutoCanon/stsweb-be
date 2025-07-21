
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
=======
const multer = require("multer");
const path = require("path");

// Configure storage dynamically based on file type
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, "photos"); // Save images to 'photos' folder
    } else if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, "excel"); // Save Excel files to 'uploads/excel' folder
    } else {
      return cb(
        new Error("Invalid file type. Only images or Excel files are allowed."),
        false
      );
    }
  },
  filename: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      const email = req.body.email;
      if (email) {
        const sanitizedEmail = email.replace(/[^a-zA-Z0-9.-]/g, "_");
        cb(null, `${sanitizedEmail}${path.extname(file.originalname)}`);
      } else {
        cb(new Error("Email is required to save the photo."));
      }
    } else {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  },
});

// File filter to allow images and Excel files
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only images or Excel files are allowed."),
      false
    );
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;

