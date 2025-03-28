module.exports = {
  GET_ALL_REIMBURSEMENTS: `
  SELECT r.*,
         CONCAT(r.from_date, ' - ', r.to_date) AS tdate,
         IF(r.from_date IS NOT NULL AND r.to_date IS NOT NULL, 
            CONCAT(r.from_date, ' - ', r.to_date), 
            r.date) AS date_range,
         r.payment_status,
         r.paid_date  -- Ensure this is selected
  FROM reimbursement r
  WHERE 
      (? IS NULL OR r.date BETWEEN ? AND ?)
      OR (? IS NULL OR r.from_date BETWEEN ? AND ?)
      OR (? IS NULL OR r.to_date BETWEEN ? AND ?)
      OR (? IS NULL OR (r.from_date <= ? AND r.to_date >= ?))
  ORDER BY r.date DESC;
`,

  GET_TEAM_REIMBURSEMENTS: `
    SELECT r.*,
       CONCAT(r.from_date, ' - ', r.to_date) AS tdate,
       IF(r.from_date IS NOT NULL AND r.to_date IS NOT NULL, 
          CONCAT(r.from_date, ' - ', r.to_date), 
          r.date) AS date_range,
       r.paid_date
    FROM reimbursement r
    WHERE r.employee_id IN (
        SELECT employee_id FROM employees WHERE department_id = ?
    )
    AND (
        (? IS NULL OR r.date BETWEEN ? AND ?)
        OR 
        (? IS NULL OR (r.from_date <= ? AND r.to_date >= ?))
    )
    ORDER BY r.date DESC
`,

  GET_EMPLOYEE_DETAILS: `
    SELECT department_id FROM employees WHERE employee_id = ?;
`,

  CREATE_REIMBURSEMENT: `
      INSERT INTO reimbursement (
          employee_id, department_id, claim_type, transport_type,  from_date, to_date, date, 
          travel_from, travel_to, purpose, purchasing_item, accommodation_fees, no_of_days, transport_amount, da,  total_amount, 
          meal_type, stationary, service_provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0), ?, ?, ?, ?, ?, ?)
  `,
  CHECK_EXISTING_REIMBURSEMENT_SINGLE_DATE: `
    SELECT * FROM reimbursement 
    WHERE employee_id = ? 
    AND claim_type = ? 
    AND date = ?
`,

  CHECK_EXISTING_REIMBURSEMENT_DATE_RANGE: `
    SELECT * FROM reimbursement 
    WHERE employee_id = ? 
    AND claim_type = ? 
    AND (
        (from_date BETWEEN ? AND ?) 
        OR 
        (to_date BETWEEN ? AND ?)
    )
`,

  SAVE_ATTACHMENTS: `INSERT INTO reimbursement_attachments (reimbursement_id, file_name, file_path) VALUES ?`,

  UPDATE_REIMBURSEMENT: `
      UPDATE reimbursement 
      SET department_id=?, claim_type=?, transport_type=?, from_date=?, to_date=?, date=?, 
          travel_from=?, travel_to=?, purpose=?, purchasing_item=?, accommodation_fees=?, no_of_days=?, transport_amount=?, da=?, total_amount=?, 
          meal_type=?, stationary=?, service_provider=?
      WHERE id=?
  `,

  GET_APPROVER_DETAILS: `
  SELECT CONCAT(first_name, ' ', last_name) AS name, role
  FROM employees
  WHERE employee_id = ?
`,

  UPDATE_REIMBURSEMENT_STATUS: `
  UPDATE reimbursement
  SET status = ?, approver_comments = ?, approver_id = ?, approver_name = ?, approver_designation = ?, project = ?, approved_date = ?
  WHERE id = ?
`,

  GET_REIMBURSEMENTS_BY_EMPLOYEE: `
    SELECT r.*, 
           CONCAT(r.from_date, ' - ', r.to_date) AS date_range
    FROM reimbursement r
    WHERE r.employee_id = ?
`,

  DELETE_REIMBURSEMENT: `DELETE FROM reimbursement WHERE id=?`,

  GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS: `
    SELECT * FROM reimbursement_attachments 
    WHERE reimbursement_id IN (?)
  `,

  GET_ATTACHMENTS: `SELECT file_name, file_path FROM reimbursement_attachments WHERE reimbursement_id = ?`,

  GET_CLAIM_DETAILS: `SELECT * FROM reimbursement WHERE id = ?`,

  GET_EMPLOYEE_DETAILS: `
    SELECT CONCAT(e.first_name, " ", e.last_name) AS name, e.position, d.name AS department_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.employee_id = ?
  `,

  GET_ATTACHMENTS: `SELECT file_name, file_path FROM reimbursement_attachments WHERE reimbursement_id = ?`,

  UPDATE_PAYMENT_STATUS: `
    UPDATE reimbursement
    SET payment_status = ?, paid_date = ?
    WHERE id = ?
  `,

  GET_ALL_PROJECTS: `SELECT project_name FROM add_project;`,
};
