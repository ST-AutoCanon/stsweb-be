
const db = require("../config");
const queries = require("../constants/planQueries");

const saveWeeklyPlan = async (planData) => {
  try {
    const sql = queries.INSERT_WEEKLY_PLAN;
    const params = [
      planData.emp_id,
      planData.week,
      planData.start_date,
      planData.end_date,
      planData.project_id,
      planData.task_name,
      planData.task_desc,
      planData.task_days,
      planData.messages,
    ];

    console.log("SQL query:", sql);
    console.log("SQL params:", params);

    const [result] = await db.query(sql, params);
    return result.insertId;
  } catch (err) {
    console.error("Error inserting weekly plan:", err);
    throw err;
  }
};

const getWeeklyPlans = async (empId) => {
  try {
    const sql = queries.GET_WEEKLY_PLANS_BY_EMPLOYEE;
    const [results] = await db.query(sql, [empId]);
    return results;
  } catch (err) {
    console.error("Error fetching weekly plans:", err);
    throw err;
  }
};

const updatePlanMessages = async (planId, newMessage) => {
  try {
    const [rows] = await db.query(queries.GET_PLAN_BY_ID, [planId]);
    if (rows.length === 0) {
      throw new Error("Plan not found");
    }

    const [result] = await db.query(queries.UPDATE_MESSAGE, [newMessage, planId]);
    if (result.affectedRows === 0) {
      throw new Error("Plan not found");
    }

    const [updatedPlan] = await db.query(queries.GET_PLAN_BY_ID, [planId]);
    return updatedPlan[0];
  } catch (err) {
    console.error("Error updating plan messages:", err);
    throw err;
  }
};

module.exports = { saveWeeklyPlan, getWeeklyPlans, updatePlanMessages };
