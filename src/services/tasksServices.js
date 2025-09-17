// const db = require("../config"); // Your DB connection file
// const taskQueries = require("../constants/taskConstants");

// const taskService = {
//   createTask: async (taskData) => {
//     const { employee_id, task_title, description, start_date, due_date, status, percentage } = taskData;
//     const [result] = await db.query(taskQueries.insertTask, [
//       employee_id, task_title, description, start_date, due_date, status, percentage
//     ]);
//     return result.insertId;
//   },

//   getAllTasks: async () => {
//     const [rows] = await db.query(taskQueries.getAllTasks);
//     return rows;
//   },

//   getTaskById: async (taskId) => {
//     const [rows] = await db.query(taskQueries.getTaskById, [taskId]);
//     return rows[0];
//   },

//   updateTask: async (taskId, taskData) => {
//     const { employee_id, task_title, description, start_date, due_date, status, percentage } = taskData;
//     const [result] = await db.query(taskQueries.updateTask, [
//       employee_id, task_title, description, start_date, due_date, status, percentage, taskId
//     ]);
//     return result.affectedRows;
//   },

//   deleteTask: async (taskId) => {
//     const [result] = await db.query(taskQueries.deleteTask, [taskId]);
//     return result.affectedRows;
//   }
// };

// module.exports = taskService;

const db = require("../config");
const taskQueries = require("../constants/taskConstants");

const taskService = {
  createTask: async (taskData) => {
    const { employee_id, task_title, description, start_date, due_date, status, percentage } = taskData;
    const [result] = await db.query(taskQueries.insertTask, [
      employee_id, task_title, description, start_date, due_date, status, percentage
    ]);
    return result.insertId;
  },

  getAllTasks: async () => {
    const [rows] = await db.query(taskQueries.getAllTasks);
    return rows;
  },

  getTaskById: async (taskId) => {
    const [rows] = await db.query(taskQueries.getTaskById, [taskId]);
    return rows[0];
  },

  // updateTask: async (taskId, taskData) => {
  //   // Fetch current task data to preserve employee_id
  //   const currentTask = await taskService.getTaskById(taskId);
  //   if (!currentTask) {
  //     throw new Error("Task not found");
  //   }

  //   // Use existing employee_id and only update provided fields
  //   const updateData = {
  //     // employee_id: currentTask.employee_id, // Retain existing employee_id
  //     // task_title: taskData.task_title !== undefined ? taskData.task_title : currentTask.task_title,
  //     // description: taskData.description !== undefined ? taskData.description : currentTask.description,
  //     // start_date: taskData.start_date !== undefined ? taskData.start_date : currentTask.start_date,
  //     // due_date: taskData.due_date !== undefined ? taskData.due_date : currentTask.due_date,
  //     status: taskData.status !== undefined ? taskData.status : currentTask.status,
  //     // percentage: taskData.percentage !== undefined ? taskData.percentage : currentTask.percentage,
  //     // progress_percentage: taskData.progress_percentage !== undefined ? taskData.progress_percentage : currentTask.progress_percentage,
   
  //  percentage: taskData.percentage !== undefined ? taskData.percentage : taskData.progress_percentage !== undefined ? taskData.progress_percentage : currentTask.percentage,
  //   };

  //   // Build dynamic UPDATE query based on provided fields
  //   const updates = [];
  //   const values = [];
  //   for (const [key, value] of Object.entries(updateData)) {
  //     updates.push(`${key} = ?`);
  //     values.push(value);
  //   }
  //   values.push(taskId); // Add taskId to WHERE clause

  //   const query = `
  //     UPDATE tasks 
  //     SET ${updates.join(", ")}
  //     WHERE task_id = ?
  //   `;

  //   console.log("Executing query:", query, "with values:", values); // Debug log
  //   const [result] = await db.query(query, values);
  //   return result.affectedRows;
  // },

  deleteTask: async (taskId) => {
    const [result] = await db.query(taskQueries.deleteTask, [taskId]);
    return result.affectedRows;
  }
};

module.exports = taskService;