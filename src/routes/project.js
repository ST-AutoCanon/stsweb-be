const express = require("express");
const router = express.Router();
const projectHandler = require("../handlers/projectHandler");
const multer = require("multer");
const path = require("path");

// Configure multer storage to save files in the "projects" folder in the root
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure the folder path is correct relative to this file
    cb(null, path.join(__dirname, "../../projects"));
  },
  filename: function (req, file, cb) {
    // Customize filename if necessary (e.g., adding a timestamp)
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Use the multer middleware to process files with the key "attachment_url"
// If you expect multiple files, use upload.array; for a single file, use upload.single.
router.post(
  "/projects",
  upload.array("attachment_url"),
  projectHandler.createProject
);
router.get("/projects", projectHandler.getProjects);
router.get("/projects/employeeProjects", projectHandler.getEmployeeProjects);
router.get("/projects/:id", projectHandler.getProjectById); // Get single project
router.put("/projects/:id", projectHandler.updateProject); // Update project
router.get("/employees", projectHandler.searchEmployees);

module.exports = router;
