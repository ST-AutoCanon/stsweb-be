
const {
  fetchTasksBySupervisor,
  updateTaskById,
} = require("../services/weekly_task_supervisor_service");

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



const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const {
    sup_status,
    sup_comment,
    sup_review_status,
    replacement_task,
    star_rating,
    project_id,
    project_name,
  } = req.body;

  try {
    // Build update payload
    const updateData = {
      sup_status,
      sup_comment,
      sup_review_status,
      replacement_task,
      star_rating,
    };

    // Only add project fields if provided (avoid null issue)
    if (project_id !== undefined && project_id !== null) {
      updateData.project_id = project_id;
    }
    if (project_name !== undefined && project_name !== null) {
      updateData.project_name = project_name;
    }

    // Pass the filtered update data
    await updateTaskById(taskId, updateData);

    res.json({ success: true, message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};


module.exports = { getTasks, updateTask };