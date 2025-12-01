const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  addAssetHandler,
  getAssetsHandler,
  getAssetAssignmentHandler,
  updateReturnDateHandler,
  assignAsset,
  getAssetCountsHandler,
  searchEmployeesHandler,
  getAssignedAssetsByEmployee,
} = require("../handlers/assetsHandler");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/add", upload.single("document"), addAssetHandler);
router.get("/list", getAssetsHandler);
router.post("/assign", assignAsset);
router.get("/assigned/:assetId", getAssetAssignmentHandler);
router.put("/assets/return-date", updateReturnDateHandler);
router.get("/assets/counts", getAssetCountsHandler);
router.get("/counts", getAssetCountsHandler);
router.get("/search-employees", searchEmployeesHandler);
router.get("/assigned-assets/:employeeId", getAssignedAssetsByEmployee);

router.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

module.exports = router;
