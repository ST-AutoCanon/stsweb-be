const express = require("express");
const router = express.Router();
const projectHandler = require("../handlers/projectHandler");
const projectService = require("../services/projectService");
const multer = require("multer");
const path = require("path");
const archiver = require("archiver");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../projects"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post(
  "/projects",
  upload.array("attachment_url"),
  projectHandler.createProject
);
router.get("/projects", projectHandler.getProjects);
router.get("/projects/employeeProjects", projectHandler.getEmployeeProjects);
router.get("/projects/:id", projectHandler.getProjectById);
router.put(
  "/projects/:id",
  upload.array("attachment_url"),
  projectHandler.updateProject
);
router.get("/employees", projectHandler.searchEmployees);

router.get("/pjattachments/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "../../projects", filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(500).send("Error downloading file.");
    }
  });
});

router.get("/projects/:id/attachments/download", async (req, res) => {
  try {
    const projectId = req.params.id;
    // Use projectService.getProjectById directly
    const project = await projectService.getProjectById(projectId);
    if (!project) {
      return res.status(404).send("Project not found");
    }
    // Ensure attachments is an array. It might be stored as a JSON string.
    let attachments = [];
    if (typeof project.attachment_url === "string") {
      try {
        attachments = JSON.parse(project.attachment_url);
      } catch (err) {
        attachments = [project.attachment_url];
      }
    } else if (Array.isArray(project.attachment_url)) {
      attachments = project.attachment_url;
    }

    if (!attachments.length) {
      return res.status(404).send("No attachments found for this project.");
    }

    // Set headers for ZIP download
    res.attachment(`project-${projectId}-attachments.zip`);

    // Create a zip archive and pipe it to the response
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(res);

    // Add each attachment file to the archive.
    attachments.forEach((fileName) => {
      const filePath = path.join(__dirname, "../../projects", fileName);
      archive.file(filePath, { name: fileName });
    });

    await archive.finalize();
  } catch (error) {
    console.error("Error creating attachments ZIP:", error);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
