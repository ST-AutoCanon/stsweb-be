

const express = require("express");
const router = express.Router();
const { getTasks, updateTask } = require("../handlers/weeklyTaskSupervisorHandler");

// Get all tasks for supervisor
router.get("/:supervisorId", getTasks);

// Update task (all supervisor editable fields)
router.put("/:taskId", updateTask);

module.exports = router;