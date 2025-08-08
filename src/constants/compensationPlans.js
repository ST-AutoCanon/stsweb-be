const INSERT_COMPENSATION_PLAN = `
  INSERT INTO compensation_plans (compensation_plan_name, plan_data)
  VALUES (?, ?);
`;

const GET_ALL_COMPENSATION_PLANS = `
  SELECT * FROM compensation_plans;
`;

const GET_COMPENSATION_PLAN_BY_ID = `
  SELECT * FROM compensation_plans WHERE id = ?;
`;

const UPDATE_COMPENSATION_PLAN = `
  UPDATE compensation_plans
  SET compensation_plan_name = ?,
      plan_data = ?
  WHERE id = ?;
`;

const DELETE_COMPENSATION_PLAN = `
  DELETE FROM compensation_plans WHERE id = ?;
`;

const GET_ALL_EMPLOYEE_FULL_NAMES = `
  SELECT employee_id, CONCAT(first_name, ' ', last_name) AS full_name
  FROM employees
  ORDER BY first_name ASC;
`;
const GET_ALL_DEPARTMENT_NAMES = `
  SELECT id, name
  FROM departments
  ORDER BY name ASC;
`;
const GET_EMPLOYEES_BY_DEPARTMENT_ID = `
  SELECT e.employee_id, CONCAT(e.first_name, ' ', e.last_name) AS full_name
FROM employees e
JOIN employee_professional ep ON e.employee_id = ep.employee_id
WHERE ep.department_id = ?
ORDER BY e.first_name ASC;

`;

module.exports = {
  GET_ALL_EMPLOYEE_FULL_NAMES,
  INSERT_COMPENSATION_PLAN,
  GET_ALL_COMPENSATION_PLANS,
  GET_COMPENSATION_PLAN_BY_ID,
  UPDATE_COMPENSATION_PLAN,
  DELETE_COMPENSATION_PLAN,
  GET_ALL_DEPARTMENT_NAMES,
  GET_EMPLOYEES_BY_DEPARTMENT_ID,
  
};