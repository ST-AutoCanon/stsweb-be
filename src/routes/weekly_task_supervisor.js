

const express = require("express");
const router = express.Router();
const {
  getEmployees,
  getAllEmployees,
  getTasks,
  getAllTasks,
  updateTask,
  createTask,
  getConfig,
  updateConfigValue,
  getHolidays,
} = require("../handlers/weeklyTaskSupervisorHandler");

// Get employees for a supervisor
router.get("/supervisor/employees", getEmployees);

// Get all employees
router.get("/employees/all", getAllEmployees);
router.get("/config/data", getConfig);

// Get all tasks for a supervisor
router.get("/:supervisorId", getTasks);

// Get all tasks (no supervisor filter)
router.get("/", getAllTasks);

// Update task
router.put("/:taskId", updateTask);

// Create new task
router.post("/", createTask);

// Get config data
// router.get("/config/data", getConfig);

// Update config value
router.put("/config/update", updateConfigValue);

// Fetch holidays
router.get("/holidays/all", getHolidays);

module.exports = router;