module.exports = {
  // Fetch leave request by ID and employee ID to verify ownership
  GET_LEAVE_BY_ID: `
    SELECT
      lq.*,
      CONCAT(e.first_name, ' ', e.last_name) AS name
    FROM leavequeries lq
    JOIN employees e
      ON lq.employee_id = e.employee_id
    WHERE lq.id = ? AND lq.employee_id = ?;
  `,

  // Update leave request if still pending
  UPDATE_LEAVE_REQUEST: `
    UPDATE leavequeries
    SET start_date = ?,
        end_date   = ?,
        H_F_day    = ?,
        reason     = ?,
        leave_type = ?
    WHERE id = ? AND employee_id = ?;
  `,

  // Delete leave request (cancel) if still pending
  DELETE_LEAVE_REQUEST: `
    DELETE FROM leavequeries
    WHERE id = ? AND employee_id = ?;
  `,

  // Insert new leave request
  INSERT_LEAVE_REQUEST: `
    INSERT INTO leavequeries (
      employee_id, start_date, end_date,
      H_F_day, reason, leave_type
    ) VALUES (?, ?, ?, ?, ?, ?);
  `,

  // Select all leave requests for a given employee
  SELECT_LEAVE_REQUESTS: `
    SELECT
      lq.*,
      CONCAT(e.first_name, ' ', e.last_name) AS name
    FROM leavequeries lq
    JOIN employees e
      ON lq.employee_id = e.employee_id
    WHERE lq.employee_id = ?;
  `,

  // Admin view: fetch all leave queries with department
  GET_LEAVE_QUERIES: `
    SELECT
      lq.id AS leave_id,
      lq.employee_id,
      lq.leave_type,
      lq.H_F_day,
      lq.reason,
      lq.status,
      lq.start_date,
      lq.end_date,
      lq.comments,
      lq.created_at,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      d.name AS department_name
    FROM leavequeries lq
    JOIN employees e
      ON lq.employee_id = e.employee_id
    LEFT JOIN employee_professional pr
      ON e.employee_id = pr.employee_id
    LEFT JOIN departments d
      ON pr.department_id = d.id
    WHERE 1=1
  `,

  // Search leave queries by filters
  SEARCH_LEAVE_QUERIES: `
    SELECT
      lq.id AS leave_id,
      lq.employee_id,
      lq.reason,
      lq.status,
      lq.start_date,
      lq.end_date,
      lq.created_at,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      d.name AS department_name
    FROM leavequeries lq
    JOIN employees e
      ON lq.employee_id = e.employee_id
    LEFT JOIN employee_professional pr
      ON e.employee_id = pr.employee_id
    LEFT JOIN departments d
      ON pr.department_id = d.id
    WHERE (
      lq.status = ? AND lq.leave_type = ?
    ) OR (
      lq.employee_id LIKE ? OR
      lq.reason LIKE ? OR
      CONCAT(e.first_name, ' ', e.last_name) LIKE ?
    );
  `,

  // Query to update the status of a leave request
  UPDATE_LEAVE_STATUS: `
    UPDATE leavequeries
    SET status   = ?,
        comments = ?
    WHERE id = ?;
  `,

  // Team lead helper: fetch employee details
  GET_EMPLOYEE_BY_ID: `
    SELECT * FROM employees WHERE employee_id = ?;
  `,

  // Team lead helper: fetch employee list for department
  GET_EMPLOYEES_BY_DEPARTMENT: `
    SELECT e.employee_id
    FROM employees e
    JOIN employee_professional pr
      ON e.employee_id = pr.employee_id
    WHERE pr.department_id = ?;
  `,

  // Team lead view: leave queries for team
  GET_LEAVE_QUERIES_FOR_TEAM: `
    SELECT
      lq.id AS leave_id,
      lq.employee_id,
      lq.leave_type,
      lq.H_F_day,
      lq.reason,
      lq.status,
      lq.start_date,
      lq.end_date,
      lq.comments,
      lq.created_at,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      d.name AS department_name
    FROM leavequeries lq
    JOIN employees e
      ON lq.employee_id = e.employee_id
    LEFT JOIN employee_professional pr
      ON e.employee_id = pr.employee_id
    LEFT JOIN departments d
      ON pr.department_id = d.id
    WHERE 1=1;  -- add dynamic filters (e.g. department)
  `,
};
