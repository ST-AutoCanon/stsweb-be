module.exports = {
  GET_DEPARTMENT_ID_BY_NAME: `
    SELECT id FROM departments WHERE name = ?
  `,
  ADD_EMPLOYEE: `
    INSERT INTO employees (
      domain, employee_type, first_name, last_name, dob, email, aadhaar_number, pan_number, gender, marital_status, spouse_name, marriage_date,
      address, phone_number, father_name, mother_name, department_id, position, photo_url, salary, role, password
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  EDIT_EMPLOYEE: `
  UPDATE employees 
  SET domain = ?,
      employee_type = ?,
      first_name = ?,
      last_name = ?,
      dob = ?,
      email = ?,
      aadhaar_number = ?,
      pan_number = ?,
      gender = ?,
      marital_status = ?,
      spouse_name = ?,
      marriage_date = ?,
      address = ?,
      phone_number = ?,
      father_name = ?,
      mother_name = ?,
      department_id = ?,
      position = ?,
      photo_url = ?,
      salary = ?,
      role = ?
  WHERE employee_id = ?;
`,
  CHECK_DUPLICATE_EMPLOYEE: `SELECT * FROM employees WHERE aadhaar_number = ? OR pan_number = ?`,
  SAVE_RESET_TOKEN: `
  INSERT INTO password_resets (email, token, expiry_time) 
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE 
    token = VALUES(token), 
    expiry_time = VALUES(expiry_time)
`,
  GET_ALL_EMPLOYEES: `
SELECT e.employee_id, 
       CONCAT(e.first_name, ' ', e.last_name) AS name, 
       DATE_FORMAT(e.created_at, '%Y-%m-%d') AS joining_date,
       e.status, 
       d.name AS department, 
       e.position, 
       e.email, 
       e.phone_number, 
       e.aadhaar_number, 
       e.pan_number, 
       e.salary
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE 1=1
`,
  SEARCH_EMPLOYEES: `
SELECT e.employee_id, 
       CONCAT(e.first_name, ' ', e.last_name) AS name, 
       DATE_FORMAT(e.created_at, '%Y-%m-%d') AS joining_date, 
       e.status,
       d.name AS department, 
       e.position, 
       e.email, 
       e.phone_number, 
       e.aadhaar_number, 
       e.pan_number, 
       e.salary
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE (e.first_name LIKE ? 
   OR e.last_name LIKE ? 
   OR e.email LIKE ? 
   OR e.employee_id LIKE ? 
   OR d.name LIKE ?)
`,

  UPDATE_EMPLOYEE_STATUS: `UPDATE employees SET status = 'Inactive' WHERE employee_id = ?`,

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

  UPDATE_EMPLOYEE_PHOTO:
    "UPDATE employees SET photo_url = ? WHERE employee_id = ?",

  GET_EMPLOYEE: `
  SELECT 
      e.employee_id, 
      e.domain,
      e.employee_type,
      e.first_name, 
      e.last_name, 
      d.name AS department,
      e.position, 
      e.email, 
      e.phone_number, 
      e.dob, 
      e.address, 
      e.aadhaar_number, 
      e.pan_number, 
      e.photo_url, 
      e.salary, 
      e.role,
      e.gender,
      e.marital_status,
      e.spouse_name,
      e.marriage_date, 
      e.father_name, 
      e.mother_name
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE e.employee_id = ?;
`,

  GET_LEAVE_QUERIES_IN_DASHBOARD: `SELECT 
    leave_type AS 'Leave Type', 
    start_date AS 'Start Date', 
    end_date AS 'End Date', 
    H_F_day AS 'Half/Full Day', 
    reason AS 'Reason', 
    status AS 'Status', 
    comments AS 'Comments'
FROM leavequeries
WHERE employee_id = ? 
ORDER BY created_at DESC 
LIMIT 5;
`,
  GET_REIMBURSEMENT_STATS: `
  SELECT 
      -- Current Month Data
      SUM(CASE WHEN status = 'Approved' 
               AND MONTH(approved_date) = MONTH(CURRENT_DATE) 
               AND YEAR(approved_date) = YEAR(CURRENT_DATE) THEN 1 ELSE 0 END) AS current_approved,
      
      SUM(CASE WHEN status = 'Pending' 
               AND MONTH(created_at) = MONTH(CURRENT_DATE) 
               AND YEAR(created_at) = YEAR(CURRENT_DATE) THEN 1 ELSE 0 END) AS current_pending,
      
      SUM(CASE WHEN status = 'Rejected' 
               AND MONTH(created_at) = MONTH(CURRENT_DATE) 
               AND YEAR(created_at) = YEAR(CURRENT_DATE) THEN 1 ELSE 0 END) AS current_rejected,
      
      COUNT(CASE WHEN MONTH(created_at) = MONTH(CURRENT_DATE) 
                 AND YEAR(created_at) = YEAR(CURRENT_DATE) THEN 1 END) AS current_submitted,

      -- Previous Month Data
      SUM(CASE WHEN status = 'Approved' 
               AND MONTH(approved_date) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) 
               AND YEAR(approved_date) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) THEN 1 ELSE 0 END) AS prev_approved,
      
      SUM(CASE WHEN status = 'Pending' 
               AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) 
               AND YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) THEN 1 ELSE 0 END) AS prev_pending,
      
      SUM(CASE WHEN status = 'Rejected' 
               AND MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) 
               AND YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) THEN 1 ELSE 0 END) AS prev_rejected,

      COUNT(CASE WHEN MONTH(created_at) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH) 
                 AND YEAR(created_at) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) THEN 1 END) AS prev_submitted

  FROM reimbursement
  WHERE employee_id = ?;
`,
};
