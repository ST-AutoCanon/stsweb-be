

const db = require("../config");
const {
  GET_TASKS_BY_SUPERVISOR,
  UPDATE_TASK_BY_ID,
  INSERT_NEW_TASK,
} = require("../constants/weeklyTaskSupervisorConstants");

const fetchTasksBySupervisor = async (supervisorId) => {
  try {
    const [result] = await db.query(GET_TASKS_BY_SUPERVISOR, [supervisorId]);
    return result;
  } catch (error) {
    throw error;
  }
};



const updateTaskById = async (taskId, updateData) => {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updateData)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  const sql = `
    UPDATE weekly_tasks
    SET ${fields.join(", ")}
    WHERE task_id = ?`;

  values.push(taskId);

  return db.query(sql, values);
};

module.exports = { fetchTasksBySupervisor, updateTaskById };