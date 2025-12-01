const UPSERT_OVERTIME_SUPERVISOR = `
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

module.exports = {
  UPSERT_OVERTIME_SUPERVISOR,
};
