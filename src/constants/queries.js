/**
 * SQL Queries for database operations.
 * 
 * @module queries
 */

module.exports = {
  // Query to fetch user details by email
  GET_USER_BY_EMAIL: `
    SELECT role, employee_id, CONCAT(first_name,' ', last_name) AS name, email, password, position, department 
    FROM employees 
    WHERE email = ?;
  `,

  // Query to fetch admin details by employee_id
  GET_ADMIN_DETAILS: `
    SELECT role, employee_id, CONCAT(first_name,' ', last_name) AS name, email, password, position, department 
    FROM employees 
    WHERE employee_id = ?;
  `,

  // Query to fetch admin dashboard statistics
  GET_ADMIN_DASHBOARD: `
  SELECT 
    COUNT(DISTINCT e.employee_id) AS total_employees,
    SUM(CASE WHEN DATE(a.date) = CURDATE() AND a.login_time IS NOT NULL THEN 1 ELSE 0 END) AS present,
    (
      SELECT COUNT(*) 
      FROM leavequeries lq
      WHERE lq.leave_type = 'Sick' 
        AND lq.status = 'Approved' 
        AND DATE(lq.created_at) = CURDATE()
    ) AS sick_leave,
    (
      SELECT COUNT(*) 
      FROM leavequeries lq
      WHERE lq.leave_type = 'Other' 
        AND lq.status = 'Approved' 
        AND DATE(lq.created_at) = CURDATE()
    ) AS other_absence
  FROM employees e
  LEFT JOIN attendance a ON e.employee_id = a.employee_id
  WHERE DATE(a.date) = CURDATE();
`,

  // Query to fetch salary distribution data
  GET_SALARY_DISTRIBUTION: `
    SELECT 
      AVG(salary) AS average_salary, 
      MIN(salary) AS min_salary, 
      MAX(salary) AS max_salary 
    FROM employees;
  `,

  // Query to fetch department-wise employee distribution
  GET_DEPARTMENT_DISTRIBUTION: `
    SELECT 
      department, 
      COUNT(*) AS count 
    FROM employees 
    GROUP BY department;
  `,

  // Query to fetch financial statistics for the previous month
  GET_FINANCIAL_STATS: `
    SELECT 
      SUM(total_expenses) AS previous_month_expenses, 
      SUM(total_salary) AS previous_month_salary, 
      SUM(total_credit) AS previous_month_credit
    FROM financials
    WHERE MONTH(month) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)
      AND YEAR(month) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH);
  `,

  // Query to fetch current projects
  GET_CURRENT_PROJECTS: `
    SELECT 
      project_name, 
      job_type, 
      department, 
      start_date, 
      end_date, 
      comments 
    FROM projects 
    WHERE CURRENT_DATE BETWEEN start_date AND end_date;
  `,

  // Query to fetch upcoming projects
  GET_UPCOMING_PROJECTS: `
    SELECT 
      project_name, 
      job_type, 
      department, 
      start_date, 
      end_date, 
      comments 
    FROM projects 
    WHERE start_date > CURRENT_DATE;
  `,

  // Query to fetch previous projects
  GET_PREVIOUS_PROJECTS: `
    SELECT 
      project_name, 
      job_type, 
      department, 
      start_date, 
      end_date, 
      comments 
    FROM projects 
    WHERE end_date < CURRENT_DATE;
  `,

  // Query to fetch login data grouped by hourly ranges
  GET_HOURLY_LOGIN_DATA: `
      SELECT 
        CASE 
          WHEN login_time < '09:30:00' THEN '<9:30'
          WHEN login_time BETWEEN '09:30:00' AND '10:00:00' THEN '9:30-10:00'
          WHEN login_time BETWEEN '10:00:00' AND '11:00:00' THEN '10:00-11:00'
          ELSE '>11:00'
        END AS timing, 
        COUNT(*) AS count
      FROM attendance
      WHERE DATE(date) = CURDATE()
      GROUP BY timing;
  `,
  //Query to fetch employee dashboard statistics
  GET_EMPLOYEE_DASHBOARD: `
  SELECT 
    CONCAT(e.first_name, ' ', e.last_name) AS name,
    position,
    e.salary AS salary,
    (SELECT COUNT(*) 
     FROM attendance a 
     WHERE a.employee_id = ? AND DATE(a.date) = CURDATE() AND a.login_time IS NOT NULL) AS attendance_count,
    (SELECT COUNT(*) 
     FROM leavequeries lq 
     WHERE lq.employee_id = ? AND lq.status = 'Approved' AND DATE(lq.created_at) = CURDATE()) AS leave_queries_count,
    (SELECT COUNT(*) 
     FROM leavequeries lq
     WHERE lq.employee_id = ? AND lq.leave_type = 'Sick' AND lq.status = 'Approved' AND DATE(lq.created_at) = CURDATE()) AS sick_leave,
    (SELECT COUNT(*) 
     FROM leavequeries lq
     WHERE lq.employee_id = ? AND lq.leave_type = 'Other' AND lq.status = 'Approved' AND DATE(lq.created_at) = CURDATE()) AS other_absence
  FROM employees e
  WHERE e.employee_id = ?;
`,
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
  GET_DEPARTMENT_ID_BY_NAME: `
    SELECT id FROM departments WHERE name = ?
  `,
  ADD_EMPLOYEE: `
    INSERT INTO employees (
      first_name, last_name, dob, email, aadhaar_number, pan_number, 
      address, phone_number, father_name, mother_name, department, department_id, position, photo_url, salary, role, password
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  SAVE_RESET_TOKEN: `
  INSERT INTO password_resets (email, token, expiry_time) 
  VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
  ON DUPLICATE KEY UPDATE 
    token = VALUES(token), 
    expiry_time = VALUES(expiry_time)
`,
  GET_ALL_EMPLOYEES: `
    SELECT employee_id, CONCAT(first_name,' ', last_name) AS name, DATE_FORMAT(created_at, '%Y-%m-%d') AS joining_date, department, position, email, phone_number, aadhaar_number, pan_number, salary
    FROM employees
  `,
  SEARCH_EMPLOYEES: `
    SELECT employee_id, CONCAT(first_name,' ', last_name) AS name, DATE_FORMAT(created_at, '%Y-%m-%d') AS joining_date, department, position, email, aadhaar_number, pan_number, salary
    FROM employees
    WHERE first_name LIKE ? 
       OR last_name LIKE ? 
       OR email LIKE ? 
       OR employee_id LIKE ? 
       OR department LIKE ?
  `,
  GET_EMPLOYEE_BY_ID: `SELECT * FROM employees WHERE employee_id = ?`,
  DELETE_EMPLOYEE: `DELETE FROM employees WHERE employee_id = ?
  `,
  VERIFY_RESET_TOKEN: `
    SELECT email 
    FROM password_resets 
    WHERE token = ? AND expiry_time > NOW();
  `,
  UPDATE_EMPLOYEE_PASSWORD: `
    UPDATE employees 
    SET password = ? 
    WHERE email = ?;
  `,
  GET_EMPLOYEE:`
  SELECT
      employee_id,
      first_name,
      last_name,
      department,
      position,
      email,
      phone_number,
      dob,
      address,
      aadhaar_number,
      pan_number,
      photo_url,
      salary,
      role,
      father_name,
      mother_name
    FROM employees
    WHERE employee_id = ?;
  `,
  GET_EMPLOYEE_BY_EMAIL: `SELECT * FROM employees WHERE email = ?
  `,
  ADD_QUERY: `INSERT INTO employee_queries (sender_id, department, question) VALUES (?, ?, ?)`,
  GET_QUERIES_BY_EMPLOYEE: `SELECT id, department, question, reply, created_at FROM employee_queries WHERE sender_id = ? ORDER BY created_at DESC`,
  GET_ALL_QUERIES: `SELECT id, sender_id, department, question, reply, created_at FROM employee_queries ORDER BY created_at DESC`,
  ADD_ADMIN_REPLY: `UPDATE employee_queries SET reply = ? WHERE id = ?;`,

};
