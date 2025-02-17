module.exports = {
  // Fetch leave request by ID and employee ID to verify ownership
  GET_LEAVE_BY_ID: "SELECT * FROM leavequeries WHERE id = ? AND employee_id = ?",
  
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
        SELECT * FROM leavequeries WHERE employee_id = ?
      `,
      GET_LEAVE_QUERIES: `
      SELECT 
        leavequeries.id AS leave_id, 
        leavequeries.employee_id,
        leavequeries.leave_type,
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
          comments = ? 
      WHERE id = ?
    `,
  };  