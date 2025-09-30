

const db = require("../config");
const {
  GET_TASKS_BY_SUPERVISOR,
  UPDATE_TASK_BY_ID,
  INSERT_NEW_TASK,
} = require("../constants/weeklyTaskSupervisorConstants");

// Fetch tasks under a supervisor
const fetchTasksBySupervisor = async (supervisorId) => {
  try {
    console.log(`Fetching tasks for supervisor_id: ${supervisorId}`);
    const [rows] = await db.execute(GET_TASKS_BY_SUPERVISOR, [supervisorId]);
    console.log(`Fetched ${rows.length} tasks for supervisor_id: ${supervisorId}`);
    return rows;
  } catch (error) {
    console.error(`Error fetching tasks for supervisor_id ${supervisorId}:`, error);
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }
};

// Fetch a single task by ID
const fetchTaskById = async (taskId) => {
  try {
    console.log(`Fetching task with task_id: ${taskId}`);
    const query = `
      SELECT *
      FROM sukalpadata.weekly_tasks
      WHERE task_id = ?;
    `;
    const [rows] = await db.execute(query, [taskId]);
    if (!rows[0]) {
      throw new Error(`Task not found: task_id ${taskId}`);
    }
    console.log(`Fetched task: task_id ${taskId}, task_date: ${rows[0].task_date}, week_id: ${rows[0].week_id}`);
    return rows[0];
  } catch (error) {
    console.error(`Error fetching task ${taskId}:`, error);
    throw new Error(`Failed to fetch task: ${error.message}`);
  }
};

// Create a new task for the next day
const createTaskForNextDay = async (taskId) => {
  try {
    const task = await fetchTaskById(taskId);
    if (!task) {
      throw new Error(`Task not found: task_id ${taskId}`);
    }

    if (!task.task_date || isNaN(new Date(task.task_date))) {
      throw new Error(`Invalid task_date in original task: ${task.task_date}`);
    }

    // Calculate the next day's date
    // const currentDate = new Date(task.task_date);
    // console.log(`Original task - task_id: ${taskId}, task_date: ${task.task_date}, week_id: ${task.week_id}`);
    // const nextDay = new Date(currentDate);
    // nextDay.setDate(currentDate.getDate() + 1);
    // const nextDayString = nextDay.toISOString().split('T')[0];
    // console.log(`New task_date calculated: ${nextDayString}`);
    const currentDate = new Date(task.task_date);
console.log(`Original task - task_id: ${taskId}, task_date: ${task.task_date}, week_id: ${task.week_id}`);

const nextDay = new Date(currentDate);
nextDay.setDate(currentDate.getDate() + 1);

// Format as YYYY-MM-DD (avoids timezone issues)
const nextDayString = [
  nextDay.getFullYear(),
  String(nextDay.getMonth() + 1).padStart(2, "0"),
  String(nextDay.getDate()).padStart(2, "0")
].join("-");

console.log(`New task_date calculated: ${nextDayString}`);


    const newTask = {
      task_date: nextDayString,
      project_id: task.project_id,
      project_name: task.project_name,
      task_name: task.task_name,
      employee_id: task.employee_id,
      emp_status: 'not started',
      sup_status: 'still need to work',
      emp_comment: '',
      sup_comment: '',
      sup_review_status: 'pending',
      star_rating: 0,
    };

    console.log(`Inserting new task with task_date: ${newTask.task_date}, project_id: ${newTask.project_id}, employee_id: ${newTask.employee_id}`);

    const [result] = await db.execute(INSERT_NEW_TASK, [
      newTask.task_date, // WEEK(?, 3) calculates week_id
      newTask.task_date,
      newTask.project_id,
      newTask.project_name,
      newTask.task_name,
      newTask.employee_id,
      newTask.emp_status,
      newTask.sup_status,
      newTask.emp_comment,
      newTask.sup_comment,
      newTask.sup_review_status,
      newTask.star_rating,
    ]);

    const insertedTask = await fetchTaskById(result.insertId);
    console.log(`New task created - task_id: ${result.insertId}, task_date: ${insertedTask.task_date}, week_id: ${insertedTask.week_id}, sup_status: ${insertedTask.sup_status}`);

    return insertedTask;
  } catch (error) {
    console.error(`Error creating new task for task_id ${taskId}:`, error);
    throw new Error(`Failed to create new task: ${error.message}`);
  }
};

// Update a task
const updateTaskById = async (taskId, sup_status, sup_comment, sup_review_status, replacement_task, star_rating) => {
  try {
    console.log(`Updating task_id: ${taskId}, sup_status: ${sup_status}`);
    await db.execute(UPDATE_TASK_BY_ID, [
      sup_status,
      sup_comment || '',
      sup_review_status || 'pending',
      replacement_task || null,
      star_rating || 0,
      taskId,
    ]);

    if (sup_status === 're-work') {
      console.log(`Task ${taskId} marked as re-work, creating new task`);
      const newTask = await createTaskForNextDay(taskId);
      return { updated: true, newTask };
    }

    return { updated: true, newTask: null };
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    throw new Error(`Update failed: ${error.message}`);
  }
};

module.exports = {
  fetchTasksBySupervisor,
  updateTaskById,
};