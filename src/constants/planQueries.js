
module.exports = {
  INSERT_WEEKLY_PLAN: `
    INSERT INTO weekly_plans
      (emp_id, week, start_date, end_date, project_id, task_name, task_desc, task_days, messages)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  GET_WEEKLY_PLANS_BY_EMPLOYEE: `
    SELECT * FROM weekly_plans WHERE emp_id = ?
  `,
  UPDATE_MESSAGE: `
    UPDATE weekly_plans
    SET messages = ?
    WHERE plan_id = ?
  `,
  
  GET_PLAN_BY_ID: `
    SELECT * FROM weekly_plans WHERE plan_id = ?
  `,
};
