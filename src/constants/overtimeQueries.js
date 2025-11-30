const UPSERT_OVERTIME_DETAILS = `
  INSERT INTO overtime_details 
    (punch_id, work_date, employee_id, extra_hours, rate, project, supervisor, comments, status)
  VALUES 
    (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    extra_hours = VALUES(extra_hours),
    rate = VALUES(rate),
    project = VALUES(project),
    supervisor = VALUES(supervisor),
    comments = VALUES(comments),
    status = VALUES(status),
    updated_at = CURRENT_TIMESTAMP
`;

const GET_OVERTIME_STATUS_SUMMARY = `
  SELECT 
    employee_id,
    work_date,
    status,
    rate,
    project,
    supervisor,
    comments
  FROM overtime_details
  WHERE work_date >= ? AND work_date <= ?
`;

module.exports = {
  UPSERT_OVERTIME_DETAILS,
  GET_OVERTIME_STATUS_SUMMARY,
};
