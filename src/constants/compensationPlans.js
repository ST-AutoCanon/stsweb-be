const INSERT_COMPENSATION_PLAN = `
  INSERT INTO compensation_plans (compensation_plan_name, plan_data)
  VALUES (?, ?);
`;

const INSERT_COMPENSATION_WORKING_DAYS = `
  INSERT INTO compensation_working_days (compensation_plan_id, sunday, monday, tuesday, wednesday, thursday, friday, saturday)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?);
`;

const GET_ALL_COMPENSATION_PLANS = `
  SELECT * FROM compensation_plans;
`;

const GET_COMPENSATION_PLAN_BY_ID = `
  SELECT * FROM compensation_plans WHERE id = ?;
`;

const GET_COMPENSATION_WORKING_DAYS_BY_PLAN_ID = `
  SELECT * FROM compensation_working_days WHERE compensation_plan_id = ?;
`;

const UPDATE_COMPENSATION_PLAN = `
  UPDATE compensation_plans
  SET compensation_plan_name = ?,
      plan_data = ?
  WHERE id = ?;
`;

const UPDATE_COMPENSATION_WORKING_DAYS = `
  UPDATE compensation_working_days
  SET sunday = ?,
      monday = ?,
      tuesday = ?,
      wednesday = ?,
      thursday = ?,
      friday = ?,
      saturday = ?
  WHERE compensation_plan_id = ?;
`;

const DELETE_COMPENSATION_PLAN = `
  DELETE FROM compensation_plans WHERE id = ?;
`;

const DELETE_COMPENSATION_WORKING_DAYS = `
  DELETE FROM compensation_working_days WHERE compensation_plan_id = ?;
`;

// const GET_ALL_EMPLOYEE_FULL_NAMES = `
//   SELECT employee_id, CONCAT(first_name, ' ', last_name) AS full_name
//   FROM employees
//   ORDER BY first_name ASC;
// `;
const GET_ALL_EMPLOYEE_FULL_NAMES = `
  SELECT employee_id, CONCAT_WS(' ', first_name, last_name) AS full_name
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

/* ------------------- TDS Slab Queries ------------------- */

// Insert new TDS slab
const INSERT_TDS_SLAB = `
  INSERT INTO emp_tds_slabs (slab_from, slab_to, percentage, month, year)
  VALUES (?, ?, ?, ?, ?);
`;

// Get all TDS slabs for a given month/year
const GET_TDS_SLABS_BY_MONTH_YEAR = `
  SELECT * FROM emp_tds_slabs
  WHERE month = ? AND year = ?
  ORDER BY slab_from ASC;
`;

// Get previous TDS slabs before a given month/year
const GET_PREVIOUS_TDS_SLABS = `
  SELECT * FROM emp_tds_slabs
  WHERE (year < ?)
     OR (year = ? AND month < ?)
  ORDER BY year DESC, month DESC, slab_from ASC;
`;

module.exports = {
  GET_ALL_EMPLOYEE_FULL_NAMES,
  INSERT_COMPENSATION_PLAN,
  INSERT_COMPENSATION_WORKING_DAYS,
  GET_ALL_COMPENSATION_PLANS,
  GET_COMPENSATION_PLAN_BY_ID,
  GET_COMPENSATION_WORKING_DAYS_BY_PLAN_ID,
  UPDATE_COMPENSATION_PLAN,
  UPDATE_COMPENSATION_WORKING_DAYS,
  DELETE_COMPENSATION_PLAN,
  DELETE_COMPENSATION_WORKING_DAYS,
  GET_ALL_DEPARTMENT_NAMES,
  GET_EMPLOYEES_BY_DEPARTMENT_ID,

  // TDS Slabs
  INSERT_TDS_SLAB,
  GET_TDS_SLABS_BY_MONTH_YEAR,
  GET_PREVIOUS_TDS_SLABS,
};
