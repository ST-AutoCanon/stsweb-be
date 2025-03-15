const express = require("express");
const router = express.Router();
const projectHandler = require("../handlers/projectHandler");

router.post("/projects", projectHandler.createProject);
router.get("/projects", projectHandler.getProjects);
router.get('/projects/employeeProjects', projectHandler.getEmployeeProjects);
router.get("/projects/:id", projectHandler.getProjectById); // Get single project
router.put("/projects/:id", projectHandler.updateProject);  // Update project
router.get("/employees", projectHandler.getEmployees);

module.exports = router;
