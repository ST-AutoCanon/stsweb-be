module.exports = {
  // Fetch leave request by ID and employee ID to verify ownership
  GET_LEAVE_BY_ID: `
  SELECT 
    leavequeries.*, 
    CONCAT(e.first_name, ' ', e.last_name) AS name
  FROM leavequeries
  INNER JOIN employees e ON leavequeries.employee_id = e.employee_id
  WHERE leavequeries.id = ? AND leavequeries.employee_id = ?
`,

  // Update leave request if still pending
  UPDATE_LEAVE_REQUEST: `
    UPDATE leavequeries 
    SET start_date = ?, end_date = ?, H_F_day = ?, reason = ?, leave_type = ? 
    WHERE id = ? AND employee_id = ?
  `,

  // Delete leave request (cancel) if still pending
  DELETE_LEAVE_REQUEST: `
    DELETE FROM leavequeries 
    WHERE id = ? AND employee_id = ?
  `,

  INSERT_LEAVE_REQUEST: `
        INSERT INTO leavequeries (employee_id, start_date, end_date, H_F_day, reason, leave_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
  SELECT_LEAVE_REQUESTS: `
      SELECT 
        leavequeries.*, 
        CONCAT(e.first_name, ' ', e.last_name) AS name
      FROM leavequeries
      INNER JOIN employees e ON leavequeries.employee_id = e.employee_id
      WHERE leavequeries.employee_id = ?
    `,

  GET_LEAVE_QUERIES: `
      SELECT 
        leavequeries.id AS leave_id, 
        leavequeries.employee_id,
        leavequeries.leave_type,
        leavequeries.H_F_day,
        leavequeries.reason, 
        leavequeries.status, 
        leavequeries.start_date, 
        leavequeries.end_date,
        leavequeries.comments, 
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
          comments = ? 
      WHERE id = ?
    `,

  // Fetch leave queries for a team lead's department
  GET_EMPLOYEE_BY_ID: `
    SELECT * FROM employees WHERE employee_id = ?
  `,
  GET_EMPLOYEES_BY_DEPARTMENT: `
    SELECT employee_id FROM employees WHERE department_id = ?
  `,
  GET_LEAVE_QUERIES_FOR_TEAM: `
    SELECT 
      leavequeries.id AS leave_id, 
      leavequeries.employee_id,
      leavequeries.leave_type,
      leavequeries.H_F_day,
      leavequeries.reason, 
      leavequeries.status, 
      leavequeries.start_date, 
      leavequeries.end_date,
      leavequeries.comments, 
      leavequeries.created_at, 
      CONCAT(employees.first_name, ' ', employees.last_name) AS name,
      departments.name AS department_name
    FROM leavequeries
    INNER JOIN employees ON leavequeries.employee_id = employees.employee_id
    INNER JOIN departments ON employees.department_id = departments.id
    WHERE 1=1  -- Placeholder for dynamic WHERE conditions
  `,
};
