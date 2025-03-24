const express = require("express");
const router = express.Router();
const employeeQueriesHandler = require("../handlers/employeeQueries");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Middleware for logging requests
router.use((req, res, next) => {
  next();
});

// Route to fetch an attachment as a blob
router.get("/attachments/:filename", (req, res) => {
  const { filename } = req.params;

  // Prevent directory traversal attacks
  if (filename.includes("..") || filename.includes("/")) {
    console.error(`Invalid filename attempt: ${filename}`);
    return res.status(400).json({ message: "Invalid filename" });
  }

  const filePath = path.join(__dirname, "..", "uploads", filename);

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

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    console.error(`File not found: ${filename}`);
    res.status(404).json({ message: "File not found" });
  }
});

// Route to start a new thread
router.post(
  "/threads",
  (req, res, next) => {
    next();
  },
  employeeQueriesHandler.startThread
);

// Route to add a message with file upload
router.post(
  "/threads/:thread_id/messages",
  (req, res, next) => {
    next();
  },
  employeeQueriesHandler.upload.single("attachment"),
  (req, res, next) => {
    if (req.file) {
    }
    next();
  },
  employeeQueriesHandler.addMessage
);

// Other routes with logging
router.get(
  "/threads/:thread_id/messages",
  (req, res, next) => {
    next();
  },
  employeeQueriesHandler.getThreadMessages
);

router.put(
  "/threads/:thread_id/close",
  (req, res, next) => {
    next();
  },
  employeeQueriesHandler.closeThread
);

router.get(
  "/threads",
  (req, res, next) => {
    next();
  },
  employeeQueriesHandler.getAllThreads
);

router.get(
  "/threads/employee/:employeeId",
  (req, res, next) => {
    next();
  },
  employeeQueriesHandler.getThreadsByEmployee
);

router.put(
  "/threads/:thread_id/messages/read",
  (req, res, next) => {
    next();
  },
  employeeQueriesHandler.markMessagesAsRead
);

module.exports = router;
