module.exports = {
  INSERT_PROJECT: `
        INSERT INTO add_project 
        (company_name, project_name, project_poc, company_gst, company_pan, company_address, 
        project_category, start_date, end_date, service_mode, service_location, project_status, description, attachment_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

  INSERT_STS_OWNER: `
        INSERT INTO sts_owners (project_id, sts_owner_id, sts_owner, sts_contact, employee_list, key_considerations) 
        VALUES (?, ?, ?, ?, ?, ?)`,

  INSERT_MILESTONE: `
        INSERT INTO milestones (project_id, milestone_details, start_date, end_date, current_status, dependency, assigned_to) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,

  INSERT_FINANCIAL_DETAILS: `
        INSERT INTO financial_details 
(project_id, milestone_id, project_amount, tds_percentage, tds_amount, 
 gst_percentage, gst_amount, total_amount, 
 m_actual_percentage, m_actual_amount, 
 m_tds_percentage, m_tds_amount, 
 m_gst_percentage, m_gst_amount, 
 m_total_amount, status) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

  GET_ALL_PROJECTS: `
  SELECT 
    p.id, 
    p.company_name AS company, 
    p.project_name AS project, 
    p.start_date AS startDate, 
    p.end_date AS endDate, 
    p.project_status AS status, 
    p.project_poc AS clientPOC, 
    s.sts_owner AS stsPOC, 
    (SELECT COUNT(m.id) 
     FROM milestones m 
     WHERE m.project_id = p.id
    ) AS milestone
  FROM add_project p
  LEFT JOIN sts_owners s ON p.id = s.project_id;
`,

  GET_EMPLOYEE_PROJECTS: `
    SELECT 
      p.id, 
      p.company_name AS company, 
      p.project_name AS project, 
      p.start_date AS startDate, 
      p.end_date AS endDate, 
      p.project_status AS status, 
      p.project_poc AS clientPOC, 
      s.sts_owner AS stsPOC, 
      (SELECT COUNT(m.id) 
     FROM milestones m 
     WHERE m.project_id = p.id
    ) AS milestone
    FROM add_project p
    LEFT JOIN sts_owners s ON p.id = s.project_id
    WHERE JSON_CONTAINS(s.employee_list, ?)
`,

  GET_PROJECT_BY_ID: `
  SELECT 
    p.*,
    (SELECT MAX(s.sts_owner_id) FROM sts_owners s WHERE s.project_id = p.id) AS sts_owner_id,
    (SELECT MAX(s.sts_owner) FROM sts_owners s WHERE s.project_id = p.id) AS sts_owner,
    (SELECT MAX(s.sts_contact) FROM sts_owners s WHERE s.project_id = p.id) AS sts_contact,
    (SELECT MAX(s.employee_list) FROM sts_owners s WHERE s.project_id = p.id) AS employee_list,
    (SELECT MAX(s.key_considerations) FROM sts_owners s WHERE s.project_id = p.id) AS key_considerations,
    -- Fetch project-level financial fields from financial_details:
    (SELECT MAX(f.project_amount) FROM financial_details f WHERE f.project_id = p.id) AS project_amount,
    (SELECT MAX(f.tds_percentage) FROM financial_details f WHERE f.project_id = p.id) AS tds_percentage,
    (SELECT MAX(f.tds_amount) FROM financial_details f WHERE f.project_id = p.id) AS tds_amount,
    (SELECT MAX(f.gst_percentage) FROM financial_details f WHERE f.project_id = p.id) AS gst_percentage,
    (SELECT MAX(f.gst_amount) FROM financial_details f WHERE f.project_id = p.id) AS gst_amount,
    (SELECT MAX(f.total_amount) FROM financial_details f WHERE f.project_id = p.id) AS total_amount,
    -- Aggregate milestones into JSON array (including their unique id):
    COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', m.id,
          'details', m.milestone_details,
          'start_date', m.start_date,
          'end_date', m.end_date,
          'status', m.current_status,
          'dependency', m.dependency,
          'assigned_to', m.assigned_to
        )
      )
      FROM milestones m 
      WHERE m.project_id = p.id
    ), '[]') AS milestones,
    -- Aggregate financial details into JSON array (including their unique id and milestone_id):
    COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', f.id,
          'milestone_id', f.milestone_id,
          'milestone_details', (
            SELECT m2.milestone_details 
            FROM milestones m2 
            WHERE m2.id = f.milestone_id
          ),
          'project_amount', f.project_amount,
          'tds_percentage', f.tds_percentage,
          'tds_amount', f.tds_amount,
          'gst_percentage', f.gst_percentage,
          'gst_amount', f.gst_amount,
          'total_amount', f.total_amount,
          'm_actual_percentage', f.m_actual_percentage,
          'm_actual_amount', f.m_actual_amount,
          'm_tds_percentage', f.m_tds_percentage,
          'm_tds_amount', f.m_tds_amount,
          'm_gst_percentage', f.m_gst_percentage,
          'm_gst_amount', f.m_gst_amount,
          'm_total_amount', f.m_total_amount,
          'status', f.status,
          'completed_date', f.completed_date
        )
      )
      FROM financial_details f
      WHERE f.project_id = p.id
    ), '[]') AS financial_details
  FROM add_project p
  WHERE p.id = ?;
`,

  UPDATE_PROJECT: `
    UPDATE add_project 
    SET company_name = ?, project_name = ?, project_poc = ?, company_gst = ?, 
        company_pan = ?, company_address = ?, project_category = ?, start_date = ?, 
        end_date = ?, service_mode = ?, service_location = ?, project_status = ?, 
        description = ?, attachment_url = ?
    WHERE id = ?;
`,

  UPDATE_STS_OWNER: `
    UPDATE sts_owners 
    SET sts_owner_id = ?, sts_owner = ?, sts_contact = ?, employee_list = ?, key_considerations = ? 
    WHERE project_id = ?;
`,

  UPDATE_MILESTONE: `
    UPDATE milestones 
SET milestone_details = ?, start_date = ?, end_date = ?, current_status = ?, 
    dependency = ?, assigned_to = ? 
WHERE id = ?;
`,

  UPDATE_FINANCIAL_DETAILS: `
    UPDATE financial_details 
    SET project_amount = ?,
        tds_percentage = ?,
        tds_amount = ?,
        gst_percentage = ?,
        gst_amount = ?,
        total_amount = ?,
        m_actual_percentage = ?,
        m_actual_amount = ?,
        m_tds_percentage = ?,
        m_tds_amount = ?,
        m_gst_percentage = ?,
        m_gst_amount = ?,
        m_total_amount = ?,
        status = ?,
        completed_date = ?,
        milestone_id = ?
    WHERE id = ?;
  `,

  SEARCH_EMPLOYEES: `
SELECT 
  e.employee_id, 
  CONCAT(e.first_name, ' ', e.last_name) AS name, 
  d.name AS department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.status <> 'Inactive'
  AND ( CONCAT(e.first_name, ' ', e.last_name) LIKE ? 
   OR e.employee_id LIKE ? 
   OR d.name LIKE ?)
`,

  GET_ALL_EMPLOYEES: `
  SELECT 
    e.employee_id,
    e.role,
    e.phone_number, 
    CONCAT(e.first_name, ' ', e.last_name) AS name, 
    e.department_id, 
    d.name AS department_name
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
  WHERE e.status <> 'Inactive'
`,
};
