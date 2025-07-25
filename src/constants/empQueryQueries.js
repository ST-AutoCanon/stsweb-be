module.exports = {
  /* Create a new conversation thread */
  CREATE_THREAD: `
    INSERT INTO threads (sender_id, recipient_id, subject, department_id)
    VALUES (?, ?, ?, ?);
  `,

  /* Add a message to a thread */
  ADD_MESSAGE: `
    INSERT INTO employee_queries (thread_id, sender_id, sender_role, message, attachment_url)
    VALUES (?, ?, ?, ?, ?);
  `,

  /* Retrieve all messages in a thread */
  GET_THREAD_MESSAGES: `
    SELECT 
    eq.id, 
    eq.sender_id, 
    CONCAT(e.first_name, ' ', e.last_name) AS sender_name, 
    eq.sender_role, 
    eq.message, 
    eq.created_at, 
    eq.attachment_url 
  FROM 
    employee_queries eq
  JOIN 
    employees e ON e.employee_id = eq.sender_id
  WHERE 
    eq.thread_id = ?
  ORDER BY 
    eq.created_at ASC;
  
  `,

  /* Close a thread with optional feedback and note */
  CLOSE_THREAD: `
    UPDATE threads
    SET status = 'closed', feedback = ?, note = ?, updated_at = NOW()
    WHERE id = ?;
  `,

  /* List all threads (admin view), including unread counts */
  GET_ALL_THREADS: `
    SELECT
      t.id,
      t.sender_id,
      CONCAT(e.first_name, ' ', e.last_name) AS sender_name,
      p.photo_url,
      pr.role,
      p.gender,
      COUNT(CASE WHEN mrs.is_read = 0 THEN 1 END) AS unread_message_count,
      t.recipient_id,
      t.department_id,
      t.status,
      t.subject,
      t.latest_message,
      t.feedback,
      t.note,
      DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
      DATE_FORMAT(t.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
    FROM threads t
    JOIN employees e
      ON e.employee_id = t.sender_id
    LEFT JOIN employee_personal p
      ON p.employee_id = e.employee_id
    LEFT JOIN employee_professional pr
      ON pr.employee_id = e.employee_id
    LEFT JOIN employee_queries q
      ON t.id = q.thread_id
    LEFT JOIN message_read_status mrs
      ON q.id = mrs.message_id
    GROUP BY t.id
    ORDER BY t.updated_at DESC;
  `,

  /* Get employee IDs by role */
  GET_EMPLOYEE_BY_ROLE: `
    SELECT employee_id
    FROM employee_professional
    WHERE role = ?;
  `,

  /* Get manager IDs for a specific department */
  GET_MANAGER_BY_DEPARTMENT: `
    SELECT employee_id
    FROM employee_professional
    WHERE role = 'Manager' AND department_id = ?;
  `,

  FETCH_THREADS: `
  SELECT
    t.id AS id,
    ANY_VALUE(t.subject) AS subject,
    ANY_VALUE(
      CASE
        WHEN t.sender_id = ? THEN t.recipient_id
        ELSE t.sender_id
      END
    )                                   AS recipient_id,
    ANY_VALUE(CONCAT(e.first_name, ' ', e.last_name)) AS recipient_name,
    ANY_VALUE(p.photo_url)              AS photo_url,
    ANY_VALUE(pr.role)                  AS role,
    ANY_VALUE(p.gender)                 AS gender,
    ANY_VALUE(t.department_id)          AS department_id,
    ANY_VALUE(DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s')) AS created_at,
    ANY_VALUE(DATE_FORMAT(t.updated_at, '%Y-%m-%d %H:%i:%s')) AS updated_at,
    ANY_VALUE(t.status)                 AS status,
    ANY_VALUE(t.latest_message)         AS latest_message,
    /* real aggregation for unread count */
    COUNT(CASE WHEN mrs.is_read = 0 THEN 1 END) AS unread_message_count

  FROM threads t

  JOIN employees e
    ON e.employee_id = (
      CASE
        WHEN t.sender_id = ? THEN t.recipient_id
        ELSE t.sender_id
      END
    )
  LEFT JOIN employee_personal p
    ON p.employee_id = e.employee_id
  LEFT JOIN employee_professional pr
    ON pr.employee_id = e.employee_id

  LEFT JOIN employee_queries q
    ON q.thread_id = t.id
  LEFT JOIN message_read_status mrs
    ON mrs.message_id = q.id
    AND mrs.recipient_id = ?

  WHERE t.sender_id   = ?
     OR t.recipient_id = ?

  GROUP BY t.id
  ORDER BY ANY_VALUE(t.created_at) DESC;
`,

  MARK_MESSAGES_AS_READ: `
  UPDATE message_read_status
  SET is_read = TRUE, read_at = NOW()
  WHERE message_id IN (
      SELECT id FROM employee_queries WHERE thread_id = ?
  ) AND recipient_id = ?
  AND is_read = FALSE;
`,

  MARK_MESSAGES_AS_READ_ADMIN: `
  UPDATE message_read_status
  SET is_read = TRUE, read_at = NOW()
  WHERE message_id IN (
      SELECT id FROM employee_queries WHERE thread_id = ?
  ) AND is_read = FALSE;
`,

  UNREAD_STATUS: `
  INSERT INTO message_read_status (message_id, recipient_id, is_read) VALUES ?
  `,

  GET_ADMIN: `SELECT employee_id FROM employees WHERE role = 'Admin'`,
  GET_HR: `SELECT employee_id FROM employees WHERE role = 'HR'`,

  UPDATE_LATEST_MESSAGE: `
    UPDATE threads
    SET latest_message = ?, updated_at = NOW()
    WHERE id = ?
  `,
};
