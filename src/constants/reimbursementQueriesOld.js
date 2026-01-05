// constants/reimbursementQueriesOld.js
module.exports = {
  GET_ALL_REIMBURSEMENTS: `
    SELECT r.*,
           CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
           IF(r.from_date IS NOT NULL AND r.to_date IS NOT NULL,
              CONCAT(r.from_date, ' - ', r.to_date),
              r.date) AS date_range,
           r.payment_status,
           r.paid_date
    FROM reimbursement_old r
    JOIN employees e ON r.employee_id = e.employee_id
    WHERE (? IS NULL OR (r.created_at >= ? AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY)))
    ORDER BY r.created_at DESC
  `,

  GET_TEAM_REIMBURSEMENTS: `
    SELECT r.*,
           CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
           IF(r.from_date IS NOT NULL AND r.to_date IS NOT NULL,
              CONCAT(r.from_date, ' - ', r.to_date),
              r.date) AS date_range,
           r.paid_date
    FROM reimbursement_old r
    JOIN employees e ON r.employee_id = e.employee_id
    WHERE r.employee_id IN (
        SELECT employee_id FROM employees WHERE department_id = ?
    )
    AND (? IS NULL OR (r.created_at >= ? AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY)))
    ORDER BY r.created_at DESC
  `,

  GET_EMPLOYEE_DETAILS: `
    SELECT
      CONCAT(e.first_name, " ", e.last_name) AS name,
      ep.position,
      d.name AS department_name
    FROM employees e
    LEFT JOIN employee_professional ep
      ON e.employee_id = ep.employee_id
    LEFT JOIN departments d
      ON ep.department_id = d.id
    WHERE e.employee_id = ?
  `,

  CREATE_REIMBURSEMENT: `
    INSERT INTO reimbursement_old (
      employee_id,
      department_id,
      claim_type,
      transport_type,
      from_date,
      to_date,
      date,
      travel_from,
      travel_to,
      meals_objective,
      purpose,
      purchasing_item,
      accommodation_fees,
      no_of_days,
      transport_amount,
      da,
      total_amount,
      meal_type,
      stationary,
      service_provider,
      project
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, 0), ?, ?, ?, ?, ?, ?, ?)
  `,

  CHECK_EXISTING_REIMBURSEMENT_SINGLE_DATE: `
    SELECT * FROM reimbursement_old
    WHERE employee_id = ?
      AND claim_type = ?
      AND date = ?
  `,

  CHECK_EXISTING_REIMBURSEMENT_DATE_RANGE: `
    SELECT * FROM reimbursement_old
    WHERE employee_id = ?
      AND claim_type = ?
      AND (
        (from_date BETWEEN ? AND ?)
        OR
        (to_date BETWEEN ? AND ?)
      )
  `,

  SAVE_ATTACHMENTS: `INSERT INTO reimbursement_attachments_old (reimbursement_id, file_name, file_path) VALUES ?`,

  CHECK_EXISTING_CLAIM: `
    SELECT * FROM reimbursement_old
    WHERE employee_id = ?
      AND claim_type = ?
      AND (
        (date IS NOT NULL AND date = ?)
        OR
        (from_date IS NOT NULL AND to_date IS NOT NULL AND NOT (to_date < ? OR from_date > ?))
      )
  `,

  UPDATE_REIMBURSEMENT: `
    UPDATE reimbursement_old
    SET department_id = ?, claim_type = ?, transport_type = ?, from_date = ?, to_date = ?, date = ?,
        travel_from = ?, travel_to = ?, meals_objective = ?, purpose = ?, purchasing_item = ?, accommodation_fees = ?,
        no_of_days = ?, transport_amount = ?, da = ?, total_amount = ?, meal_type = ?, stationary = ?, service_provider = ?, project = ?
    WHERE id = ?
  `,

  GET_APPROVER_DETAILS: `
    SELECT
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      ep.role
    FROM employees e
    JOIN employee_professional ep
      ON e.employee_id = ep.employee_id
    WHERE e.employee_id = ?
  `,

  UPDATE_REIMBURSEMENT_STATUS: `
    UPDATE reimbursement_old
    SET status = ?, approver_comments = ?, approver_id = ?, approver_name = ?, approver_designation = ?, project = ?, approved_date = ?
    WHERE id = ?
  `,

  /**
   * GET reimbursements for a single employee.
   * Accepts optional date filter via created_at (same shape as GET_ALL_REIMBURSEMENTS).
   * Parameters expected: [ employeeId, submittedFrom|null, submittedFrom|null, submittedTo|null ]
   */
  GET_REIMBURSEMENTS_BY_EMPLOYEE: `
    SELECT r.*,
           IF(r.from_date IS NOT NULL AND r.to_date IS NOT NULL,
              CONCAT(r.from_date, ' - ', r.to_date),
              r.date) AS date_range
    FROM reimbursement_old r
    WHERE r.employee_id = ?
      AND (? IS NULL OR (r.created_at >= ? AND r.created_at < DATE_ADD(?, INTERVAL 1 DAY)))
    ORDER BY r.created_at DESC
  `,

  DELETE_REIMBURSEMENT: `DELETE FROM reimbursement_old WHERE id = ?`,

  GET_ATTACHMENTS_BY_REIMBURSEMENT_IDS: `
    SELECT *
    FROM reimbursement_attachments_old
    WHERE reimbursement_id IN (?)
  `,

  // Single reimbursement's attachments (used when serving files)
  GET_ATTACHMENTS: `SELECT reimbursement_id, file_name, file_path FROM reimbursement_attachments_old WHERE reimbursement_id = ?`,

  GET_CLAIM_DETAILS: `SELECT * FROM reimbursement_old WHERE id = ?`,

  UPDATE_PAYMENT_STATUS: `
    UPDATE reimbursement_old
    SET payment_status = ?, paid_date = ?
    WHERE id = ?
  `,

  GET_ALL_PROJECTS: `SELECT project_name FROM add_project`,

  DELETE_ATTACHMENTS_BY_REIMBURSEMENT_ID: `DELETE FROM reimbursement_attachments_old WHERE reimbursement_id = ?`,
};
