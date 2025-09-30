const {
  fetchTasksBySupervisor,
  updateTaskById,
} = require("../services/weekly_task_supervisor_service");

// GET tasks for supervisor
const getTasks = async (req, res) => {
  const { supervisorId } = req.params;

  try {
    const tasks = await fetchTasksBySupervisor(supervisorId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

// PUT update a task (supervisor fields)
const updateTask = async (req, res) => {
  const { taskId } = req.params;
const { sup_status, sup_comment, sup_review_status, replacement_task, star_rating } = req.body;

  try {
await updateTaskById(
  taskId,
  sup_status,
  sup_comment,
  sup_review_status,
  replacement_task,
  star_rating
);    res.json({ success: true, message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

// const { fetchTasksBySupervisor, updateTaskById, replaceTaskById } = require("../services/weekly_task_supervisor_service");


module.exports = { getTasks, updateTask  };
