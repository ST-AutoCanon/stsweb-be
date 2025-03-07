
const express = require("express");
const router = express.Router();
const { uploadSalaryData, upload } = require("../handlers/salaryUploadHandler"); // Ensure correct path

router.post("/upload", upload.single("file"), uploadSalaryData); // The correct route is "/salary/upload"


module.exports = router;
