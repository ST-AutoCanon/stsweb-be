const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const meetingHandler = require("../handlers/meetingHandler");
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files allowed."), false);
    }
    cb(null, true);
  },
});

router.post(
  "/voice-dialog",
  upload.single("audio"),
  meetingHandler.handleVoiceDialog
);

router.post("/voice-final", express.json(), meetingHandler.handleVoiceFinal);

router.post("/scan-final", meetingHandler.handleScanFinal);

router.get("/meetings", meetingHandler.handleGetMeetingsByCreator);

module.exports = router;
