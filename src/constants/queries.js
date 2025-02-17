module.exports = {
  /* forgot-password queries*/
  GET_EMPLOYEE_BY_EMAIL: `SELECT * FROM employees WHERE email = ?
  `,
  SAVE_RESET_TOKEN: `
  INSERT INTO password_resets (email, token, expiry_time) 
  VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
  ON DUPLICATE KEY UPDATE 
    token = VALUES(token), 
    expiry_time = VALUES(expiry_time)
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

  /* add-department queries*/
  ADD_DEPARTMENT: 'INSERT INTO departments (name, icon) VALUES (?, ?)',
      GET_DEPARTMENTS: 'SELECT * FROM departments',


      GET_HOLIDAYS: "SELECT date, occasion, type FROM holidays WHERE YEAR(date) = YEAR(CURDATE())"
      

  /* employee-queries */
  CREATE_THREAD: `
    INSERT INTO threads (sender_id, recipient_id, subject, department_id) 
    VALUES (?, ?, ?, ?)
  `,
  ADD_MESSAGE: `
    INSERT INTO employee_queries (thread_id, sender_id, sender_role, message) 
    VALUES (?, ?, ?, ?)
  `,
  GET_THREAD_MESSAGES: `
    SELECT 
      eq.id, 
      eq.sender_id, 
      eq.sender_role, 
      eq.message, 
      eq.created_at 
    FROM 
      employee_queries eq
    WHERE 
      eq.thread_id = ?
    ORDER BY 
      eq.created_at ASC
  `,
  CLOSE_THREAD: `
    UPDATE threads 
    SET status = 'closed', feedback = ? 
    WHERE id = ?
  `,
  GET_ALL_THREADS: `
    SELECT 
      t.id, 
      t.sender_id, 
      t.recipient_id, 
      t.department_id, 
      t.status, 
      t.feedback, 
      t.created_at, 
      t.updated_at 
    FROM 
      threads t
    ORDER BY 
      t.updated_at DESC
  `,
  GET_EMPLOYEE_BY_ROLE: `
    SELECT 
      employee_id 
    FROM 
      employees 
    WHERE 
      role = ?
  `,
  GET_MANAGER_BY_DEPARTMENT: `
    SELECT 
      employee_id 
    FROM 
      employees 
    WHERE 
      role = 'Manager' AND department_id = ?
  `,
  
  FETCH_THREADS:`SELECT t.id, t.subject, t.department_id, t.created_at, t.status, 
  COUNT(q.id) AS message_count
FROM threads t
LEFT JOIN employee_queries q ON t.id = q.thread_id
WHERE t.sender_id = ?
GROUP BY t.id, t.subject, t.department_id, t.created_at
ORDER BY t.created_at DESC;
`

};
