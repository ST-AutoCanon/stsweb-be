module.exports = {

    INSERT_LEAVE_REQUEST: `
      INSERT INTO leavequeries (employee_id, start_date, end_date, reason, leave_type)
      VALUES (?, ?, ?, ?, ?)
    `,
    SELECT_LEAVE_REQUESTS: `
      SELECT * FROM leavequeries WHERE employee_id = ?
    `,
    GET_LEAVE_QUERIES: `
    SELECT 
      leavequeries.id AS leave_id, 
      leavequeries.employee_id, 
      leavequeries.reason, 
      leavequeries.status, 
      leavequeries.start_date, 
      leavequeries.end_date, 
      leavequeries.created_at, 
      CONCAT(employees.first_name, ' ', employees.last_name) AS name,
      departments.name AS department_name
    FROM leavequeries
    INNER JOIN employees ON leavequeries.employee_id = employees.employee_id
    INNER JOIN departments ON employees.department_id = departments.id
  `,
  SEARCH_LEAVE_QUERIES: `
    SELECT 
    leavequeries.id AS leave_id, 
    leavequeries.employee_id, 
    leavequeries.reason, 
    leavequeries.status, 
    leavequeries.start_date, 
    leavequeries.end_date, 
    leavequeries.created_at,
    CONCAT(employees.first_name, ' ', employees.last_name) AS name,
    departments.name AS department_name
FROM leavequeries
INNER JOIN employees ON leavequeries.employee_id = employees.employee_id
INNER JOIN departments ON employees.department_id = departments.id
WHERE 
    (leavequeries.status = ? AND leavequeries.leave_type = ?)
    OR (leavequeries.employee_id LIKE ? 
    OR leavequeries.reason LIKE ? 
    OR CONCAT(employees.first_name, ' ', employees.last_name) LIKE ?)
`,
    
  // Query to update the status of a leave request
  UPDATE_LEAVE_STATUS: `
    UPDATE leavequeries 
    SET status = ?, 
        rejection_reason = ? 
    WHERE id = ?
  `,
};