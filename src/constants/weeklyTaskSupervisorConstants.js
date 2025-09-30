

const GET_TASKS_BY_SUPERVISOR = `
SELECT 
  t.task_id,
  t.week_id,
  t.task_date,
  t.project_id,
  t.project_name,
  t.task_name,
  t.replacement_task, 
  t.employee_id,
  CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
  t.emp_status,
  t.emp_comment,
  t.sup_status,
  t.sup_comment,
  t.sup_review_status,
  t.star_rating,
  t.created_at,
  t.updated_at
FROM sukalpadata.weekly_tasks t
JOIN sukalpadata.employee_professional p ON t.employee_id = p.employee_id
JOIN sukalpadata.employees e ON t.employee_id = e.employee_id
WHERE p.supervisor_id = ?
ORDER BY t.task_date DESC, t.task_id ASC;
`;

const UPDATE_TASK_BY_ID = `
  UPDATE weekly_tasks
  SET sup_status = ?,
      sup_comment = ?,
      sup_review_status = ?,
      replacement_task = ?,
      star_rating = ?
  WHERE task_id = ?;
`;

const INSERT_NEW_TASK = `
  INSERT INTO weekly_tasks (
    week_id,
    task_date,
    project_id,
    project_name,
    task_name,
    employee_id,
    emp_status,
    sup_status,
    emp_comment,
    sup_comment,
    sup_review_status,
    star_rating
  ) VALUES (WEEK(?, 3), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

module.exports = {
  GET_TASKS_BY_SUPERVISOR,
  UPDATE_TASK_BY_ID,
  INSERT_NEW_TASK,
};