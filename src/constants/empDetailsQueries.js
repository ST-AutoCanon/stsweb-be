module.exports = {
  GET_DEPARTMENT_ID_BY_NAME: `
    SELECT id FROM departments WHERE name = ?
  `,


  ADD_EMPLOYEE_CORE: `
  INSERT INTO employees (
    first_name, last_name, email, password, phone_number, dob, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, 'Active', NOW(), NOW())
`,
  UPDATE_EMPLOYEE_CORE: `
    UPDATE employees
    SET first_name = ?,
    last_name = ?,
    email = ?,
    phone_number = ?,
    dob = ?
    WHERE employee_id    = ?
`,

  ADD_EMPLOYEE_PERSONAL: `
    INSERT INTO employee_personal (
      employee_id, address, father_name, mother_name,
      gender, marital_status, spouse_name, marriage_date,
      aadhaar_number, aadhaar_doc_url, pan_number, pan_doc_url,
      passport_number, voter_id, photo_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  UPDATE_EMPLOYEE_PERSONAL: `
    UPDATE employee_personal
       SET address         = ?,
           father_name     = ?,
           mother_name     = ?,
           gender          = ?,
           marital_status  = ?,
           spouse_name     = ?,
           marriage_date   = ?,
           aadhaar_number  = ?,
           aadhaar_doc_url = ?,
           pan_number      = ?,
           pan_doc_url     = ?,
           passport_number = ?,
           voter_id        = ?,
           photo_url       = ?
     WHERE employee_id    = ?
  `,

  ADD_EMPLOYEE_EDU: `
    INSERT INTO employee_education (
      employee_id,
      tenth_institution, tenth_year, tenth_board, tenth_score, tenth_cert_url,
      twelfth_institution, twelfth_year, twelfth_board, twelfth_score, twelfth_cert_url,
      ug_institution, ug_year, ug_board, ug_score, ug_cert_url,
      pg_institution, pg_year, pg_board, pg_score, pg_cert_url,
      additional_cert_name, additional_cert_url
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `,
  UPDATE_EMPLOYEE_EDU: `
    UPDATE employee_education
    SET tenth_institution  = ?,
      tenth_year  = ?,
      tenth_board = ?, 
      tenth_score = ?, 
      tenth_cert_url = ?,
      twelfth_institution = ?, 
      twelfth_year = ?, 
      twelfth_board = ?, 
      twelfth_score = ?, 
      twelfth_cert_url = ?,
      ug_institution = ?, 
      ug_year = ?, 
      ug_board = ?, 
      ug_score = ?, 
      ug_cert_url = ?,
      pg_institution = ?, 
      pg_year = ?, 
      pg_board = ?, 
      pg_score = ?, 
      pg_cert_url = ?,
      additional_cert_name = ?, 
      additional_cert_url   = ?
     WHERE employee_id  = ?
  `,

  ADD_EMPLOYEE_PRO: `
    INSERT INTO employee_professional (
      employee_id, domain, employee_type, role, department_id,
      position, supervisor_id, salary, resume_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  UPDATE_EMPLOYEE_PRO: `
    UPDATE employee_professional
       SET domain        = ?,
           employee_type = ?,
           role          = ?,
           department_id = ?,
           position      = ?,
           supervisor_id = ?,
           salary        = ?,
           resume_url = ?
     WHERE employee_id = ?
  `,

  ADD_EMPLOYEE_EXP: `
  INSERT INTO employee_experience (
    employee_id, company, designation, start_date, end_date, doc_url
  ) VALUES (?, ?, ?, ?, ?, ?)
`,

  UPDATE_EMPLOYEE_EXP: `
  DELETE FROM employee_experience WHERE employee_id = ?;
`,

  ADD_EMPLOYEE_OTHER_DOC: `
  INSERT INTO employee_documents (employee_id, other_doc_url)
  VALUES (?, ?)
`,

  DELETE_EMPLOYEE_OTHER_DOCS: `
  DELETE FROM employee_documents
   WHERE employee_id = ?
`,

  ADD_EMPLOYEE_BANK: `
    INSERT INTO employee_bank_details (
      employee_id, employee_name, bank_name, account_number, ifsc_code, branch_name
    ) VALUES (?, ?, ?, ?, ?, ?)
  `,
  UPDATE_EMPLOYEE_BANK: `
    UPDATE employee_bank_details
       SET employee_name  = ?,
           bank_name      = ?,
           account_number = ?,
           ifsc_code      = ?,
           branch_name    = ?
     WHERE employee_id   = ?
  `,

  GET_FULL_EMPLOYEE: `
SELECT
  e.employee_id,
  e.first_name,
  e.last_name,
  e.email,
  DATE_FORMAT(e.dob,'%Y-%m-%d')       AS dob,
  e.phone_number,

  p.address, p.father_name, p.mother_name, p.gender,
  p.marital_status, p.spouse_name,
  DATE_FORMAT(p.marriage_date,'%Y-%m-%d') AS marriage_date,
  p.aadhaar_number, p.aadhaar_doc_url,
  p.pan_number, p.pan_doc_url,
  p.passport_number, p.voter_id, p.photo_url,

  ed.*,

  pr.domain, pr.employee_type, pr.role, pr.department_id,
  pr.position, pr.supervisor_id, pr.salary, pr.resume_url,

  bd.bank_name, bd.account_number, bd.ifsc_code, bd.branch_name,

  -- experience as a separate JSON array
  (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'company', exp.company,
        'role',    exp.designation,
        'start_date', DATE_FORMAT(exp.start_date,'%Y-%m-%d'),
        'end_date',   DATE_FORMAT(exp.end_date,'%Y-%m-%d'),
        'doc_url', exp.doc_url
      )
    )
    FROM employee_experience exp
    WHERE exp.employee_id = e.employee_id
  ) AS experience,

  -- other_docs as a separate JSON array
  (
    SELECT JSON_ARRAYAGG(doc.other_doc_url)
    FROM employee_documents doc
    WHERE doc.employee_id = e.employee_id
  ) AS other_docs_urls

FROM employees e
LEFT JOIN employee_personal      p  ON e.employee_id = p.employee_id
LEFT JOIN employee_education     ed ON e.employee_id = ed.employee_id
LEFT JOIN employee_professional  pr ON e.employee_id = pr.employee_id
LEFT JOIN employee_bank_details  bd ON e.employee_id = bd.employee_id

WHERE e.employee_id = ?
`,

  GET_SUPERVISORS: `
  SELECT 
    e.employee_id, 
    CONCAT(e.first_name, ' ', e.last_name) AS name
  FROM employees e
  INNER JOIN employee_professional p
    ON e.employee_id = p.employee_id
  WHERE p.role IN ('Manager', 'Supervisor')
    AND e.status = 'Active'
`,

  CHECK_EMAIL: `
SELECT employee_id 
  FROM employees 
 WHERE email = ?
 LIMIT 1
`,
  CHECK_PERSONAL_DUP: `
SELECT employee_id 
  FROM employee_personal 
 WHERE aadhaar_number = ? OR pan_number = ?
 LIMIT 1
`,

  CHECK_EMAIL_UPDATE: `
SELECT employee_id
  FROM employees
 WHERE email = ?
   AND employee_id != ?
 LIMIT 1
`,
  CHECK_PERSONAL_DUP_UPDATE: `
SELECT employee_id
  FROM employee_personal
 WHERE (aadhaar_number = ? OR pan_number = ?)
   AND employee_id != ?
 LIMIT 1
`,

=======
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

SELECT
  e.employee_id,
  CONCAT(e.first_name, ' ', e.last_name) AS name,
  DATE_FORMAT(e.created_at, '%Y-%m-%d') AS joining_date,
  e.status,
  d.name AS department,
  ep.position,
  e.email,
  e.phone_number,
  ep.salary,
  b.bank_name,
  b.account_number,
  -- fetch the supervisor's name from the self‑join
  CONCAT(s.first_name, ' ', s.last_name) AS supervisor

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
  DATE_FORMAT(e.dob, '%Y-%m-%d') AS dob, 
  e.address, 
  e.aadhaar_number, 
  e.pan_number, 
  e.photo_url, 
  e.salary, 
  e.role,
  e.gender,
  e.marital_status,
  e.spouse_name,
  DATE_FORMAT(e.marriage_date, '%Y-%m-%d') AS marriage_date,
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
  LEFT JOIN departments d
    ON e.department_id = d.id
  LEFT JOIN employee_professional ep
    ON e.employee_id = ep.employee_id
  LEFT JOIN employee_bank_details b
    ON e.employee_id = b.employee_id
  LEFT JOIN employees s
    ON ep.supervisor_id = s.employee_id
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
  DATE_FORMAT(e.dob, '%Y-%m-%d') AS dob, 
  e.address, 
  e.aadhaar_number, 
  e.pan_number, 
  e.photo_url, 
  e.salary, 
  e.role,
  e.gender,
  e.marital_status,
  e.spouse_name,
  DATE_FORMAT(e.marriage_date, '%Y-%m-%d') AS marriage_date,
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
  DATE_FORMAT(e.dob, '%Y-%m-%d') AS dob, 
  e.address, 
  e.aadhaar_number, 
  e.pan_number, 
  e.photo_url, 
  e.salary, 
  e.role,
  e.gender,
  e.marital_status,
  e.spouse_name,
  DATE_FORMAT(e.marriage_date, '%Y-%m-%d') AS marriage_date,
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
