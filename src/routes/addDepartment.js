const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  addDepartmentHandler,
  getDepartmentsHandler,
  getEmployeesByDepartmentHandler,
  getHierarchyHandler,
  reassignDept,
  changeSupervisor,
} = require("../handlers/addDepartment");

const router = express.Router();

const uploadDir = path.join(__dirname, "../../../departments/");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    let name = req.body.name || "department";
    name = name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-+/g, "-");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${name}${ext}`);
  },
});

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

const upload = multer({ storage, fileFilter });

router.post("/departments/add", upload.single("icon"), addDepartmentHandler);
router.get("/departments", getDepartmentsHandler);

router.get("/departments/:filename", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(403).json({ message: "API key is required" });
  }

  const filePath = path.join(
    __dirname,
    "../../../departments",
    req.params.filename
  );

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.log(err);
      return res.status(404).json({ message: "Image not found" });
    }
    res.sendFile(filePath);
  });
});

module.exports = router;
