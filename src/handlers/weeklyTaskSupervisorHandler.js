
const {
  fetchEmployeesBySupervisor,
  fetchAllEmployees,
  fetchTasksBySupervisor,
  fetchAllTasks,
  updateTaskById,
  insertNewTask,
  fetchConfig,
  updateConfig,
  fetchHolidays,
} = require("../services/weekly_task_supervisor_service");

const getEmployees = async (req, res) => {
  try {
    const supervisorId = req.headers["x-employee-id"];
    if (!supervisorId) {
      return res.status(400).json({ error: "Supervisor ID is required in headers" });
    }
    const employees = await fetchEmployeesBySupervisor(supervisorId);
    res.json({ success: true, employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const employees = await fetchAllEmployees();
    res.json({ success: true, employees });
  } catch (error) {
    console.error("Error fetching all employees:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTasks = async (req, res) => {
  try {
    const supervisorId = req.params.supervisorId;
    const tasks = await fetchTasksBySupervisor(supervisorId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllTasks = async (req, res) => {
  try {
    const tasks = await fetchAllTasks();
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const updateData = req.body;
    const result = await updateTaskById(taskId, updateData);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ success: true, message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createTask = async (req, res) => {
  try {
    const taskData = req.body;
    const newTask = await insertNewTask(taskData);
    res.status(201).json({ success: true, message: "Task created successfully", newTask });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getConfig = async (req, res) => {
  try {
    const rows = await fetchConfig(); // SELECT `key`, `value` FROM config

    // Convert row array → key-value object
    const configData = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    res.json({
      success: true,
      config: configData, // ✅ Clean object
      raw: rows          // Optional - keep raw array for debugging
    });

  } catch (error) {
    console.error("Error fetching config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const updateConfigValue = async (req, res) => {
  try {
    const { key, value } = req.body;
    await updateConfig(key, value);
    res.json({ success: true, message: "Config updated successfully" });
  } catch (error) {
    console.error("Error updating config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getHolidays = async (req, res) => {
  try {
    const holidays = await fetchHolidays();
    res.json({ success: true, holidays });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getEmployees,
  getAllEmployees,
  getTasks,
  getAllTasks,
  updateTask,
  createTask,
  getConfig,
  updateConfigValue,
  getHolidays,
};