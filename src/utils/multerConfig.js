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
