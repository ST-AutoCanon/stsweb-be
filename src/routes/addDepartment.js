const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  addDepartmentHandler,
  getDepartmentsHandler,
} = require("../handlers/addDepartment");

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../departments/");

// Set up storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png|gif/;
  const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = fileTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  } else {
    return cb(new Error("Only images are allowed!"), false);
  }
};

// Multer middleware
const upload = multer({ storage, fileFilter });

router.post("/departments/add", upload.single("icon"), addDepartmentHandler);
router.get("/departments", getDepartmentsHandler);

router.get("/departments/:filename", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(403).json({ message: "API key is required" });
  }

  const filePath = path.join(__dirname, "../departments", req.params.filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(err);
      return res.status(404).json({ message: "Image not found" });
    }
    res.sendFile(filePath);
  });
});

module.exports = router;
