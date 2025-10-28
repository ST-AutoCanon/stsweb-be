module.exports = {
  GET_LEAVE_REPORT: `
  SELECT
    lq.id AS leave_id,
    lq.employee_id,
    CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name,
    COALESCE(d.name, '') AS department_name,
    lq.leave_type,
    lq.H_F_day,
    lq.compensated_days,
    lq.deducted_days,
    lq.loss_of_pay_days,
    lq.preserved_leave_days,
    DATE_FORMAT(lq.start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(lq.end_date, '%Y-%m-%d') AS end_date,
    lq.reason,
    lq.comments,
    lq.is_defaulted,
    DATE_FORMAT(lq.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
    DATE_FORMAT(lq.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
    lq.status
  FROM leavequeries lq
  JOIN employees e ON lq.employee_id = e.employee_id
  LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
  LEFT JOIN departments d ON pr.department_id = d.id
  WHERE ( ? IS NULL OR (COALESCE(lq.updated_at, lq.created_at) >= ? ) )
    AND ( ? IS NULL OR (COALESCE(lq.updated_at, lq.created_at) < DATE_ADD(?, INTERVAL 1 DAY) ) )
    AND ( ? IS NULL OR LOWER(lq.status) = LOWER(?) )
  ORDER BY COALESCE(lq.updated_at, lq.created_at) DESC
`,
  GET_REIMBURSEMENT_REPORT: `
SELECT
  r.id AS reimbursement_id,
  r.id AS id,
  r.employee_id,
  CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name,
  r.department_id,
  COALESCE(d.name, '') AS department_name,

  r.claim_type,
  r.transport_type,
  DATE_FORMAT(r.from_date, '%Y-%m-%d') AS from_date,
  DATE_FORMAT(r.to_date, '%Y-%m-%d') AS to_date,
  DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
  r.travel_from,
  r.travel_to,
  r.purpose,
  r.purchasing_item,
  r.accommodation_fees,
  r.no_of_days,
  r.total_amount,
  r.meal_type,
  r.service_provider,
  r.da,
  r.transport_amount,
  r.stationary,

  r.status AS approval_status,
  COALESCE(NULLIF(r.payment_status, ''), NULLIF(r.status, '')) AS payment_status,
  r.payment_status AS raw_payment_status,

  r.approver_id,
  r.approver_name,
  r.approver_designation,
  r.approver_comments,

  r.project,
  r.meals_objective,

  DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
  DATE_FORMAT(r.approved_date, '%Y-%m-%d') AS approved_date,
  DATE_FORMAT(r.paid_date, '%Y-%m-%d') AS paid_date,
  DATE_FORMAT(r.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
FROM reimbursement r
LEFT JOIN employees e ON r.employee_id = e.employee_id
LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
LEFT JOIN departments d ON pr.department_id = d.id
WHERE ( ? IS NULL OR (COALESCE(r.approved_date, r.created_at) >= ? ) )
  AND ( ? IS NULL OR (COALESCE(r.approved_date, r.created_at) < DATE_ADD(?, INTERVAL 1 DAY) ) )
  -- simple single-parameter status clause (service may remove and replace this for complex tokens)
  AND ( ? IS NULL OR LOWER(COALESCE(r.payment_status, r.status, '')) = LOWER(?) )
ORDER BY r.created_at DESC
`,

  /**
   * Employee report
   * params: [startDate, startDate, endDate, endDate, status, status]
   */
  GET_EMPLOYEE_REPORT: `
    SELECT
      e.employee_id,
      e.first_name,
      e.last_name,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      e.email,
      DATE_FORMAT(e.dob, '%Y-%m-%d') AS dob,
      e.phone_number,
      e.status,
      p.address,
      p.father_name,
      p.mother_name,
      p.gender,
      p.marital_status,
      DATE_FORMAT(p.spouse_dob, '%Y-%m-%d') AS spouse_dob,
      p.aadhaar_number,
      p.pan_number,
      p.photo_url,
      pr.domain,
      pr.employee_type,
      DATE_FORMAT(pr.joining_date, '%Y-%m-%d') AS joining_date,
      pr.role,
      pr.position,
      pr.department_id,
      COALESCE(d.name, '') AS department_name,
      pr.supervisor_id,
      CONCAT(sup.first_name, ' ', sup.last_name) AS supervisor_name,
      pr.salary,
      bd.bank_name,
      bd.account_number,
      bd.ifsc_code,
      bd.branch_name AS bank_branch,
      DATE_FORMAT(e.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM employees e
    LEFT JOIN employee_personal p ON e.employee_id = p.employee_id
    LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
    LEFT JOIN departments d ON pr.department_id = d.id
    LEFT JOIN employee_bank_details bd ON e.employee_id = bd.employee_id
    LEFT JOIN employees sup ON pr.supervisor_id = sup.employee_id
    WHERE ( ? IS NULL OR (e.created_at >= ? ) )
      AND ( ? IS NULL OR (e.created_at < DATE_ADD(?, INTERVAL 1 DAY) ) )
      AND ( ? IS NULL OR LOWER(e.status) = LOWER(?) )
    ORDER BY e.created_at DESC
  `,

  /**
   * Vendor report
   * kept two extra no-op placeholders for compatibility with buildDateStatusParams usage
   */
  GET_VENDOR_REPORT: `
  SELECT
    v.vendor_id,
    v.company_name,
    v.registered_address,
    v.city,
    v.state,
    v.pin_code,
    v.gst_number,
    v.pan_number,
    v.company_type,
    v.contact1_name,
    v.contact1_designation,
    v.contact1_mobile,
    v.contact1_email,
    v.bank_name,
    v.branch,
    v.branch_address,
    v.account_number,
    v.ifsc_code,
    v.nature_of_business,
    v.product_category,
    v.years_of_experience,
    v.cancelled_cheque,
    v.msme_status,
    v.created_at
  FROM vendors v
  WHERE ( ? IS NULL OR (COALESCE(v.created_at, NOW()) >= ? ) )
    AND ( ? IS NULL OR (COALESCE(v.created_at, NOW()) < DATE_ADD(?, INTERVAL 1 DAY) ) )
    /* keep placeholders for compatibility with existing param building (no-op) */
    AND ( ? IS NULL OR 1=1 )
    AND ( ? IS NULL OR 1=1 )
  ORDER BY COALESCE(v.created_at, NOW()) DESC
`,

  /**
   * Asset report
   * This query uses multiple status placeholders to allow flexible matching in the SQL.
   */
  GET_ASSET_REPORT: `
  SELECT
    a.asset_id,
    a.asset_name,
    a.configuration,
    a.valuation_date,
    a.assigned_to,
    a.document_path,
    a.created_at,
    a.category,
    a.sub_category,
    a.status,
    a.count,
    a.asset_code
  FROM assets a
  WHERE ( ? IS NULL OR (COALESCE(a.created_at, a.valuation_date, NOW()) >= ? ) )
    AND ( ? IS NULL OR (COALESCE(a.created_at, a.valuation_date, NOW()) < DATE_ADD(?, INTERVAL 1 DAY) ) )
    AND (
      ? IS NULL -- if status param is null -> no status filter
      OR (
        LOWER(?) = 'all'
        OR (LOWER(?) = 'assigned' AND LOWER(a.status) = 'in use')
        OR (LOWER(?) = 'pending' AND LOWER(a.status) = 'not using')
        OR (LOWER(?) = 'returned' AND LOWER(a.status) = 'returned')
        OR (LOWER(?) IN ('decommissioned') AND LOWER(a.status) = 'decommissioned')
        OR LOWER(a.status) = LOWER(?)
      )
    )
  ORDER BY COALESCE(a.created_at, a.valuation_date, NOW()) DESC
`,

  /**
   * Attendance report
   */
  GET_EMPLOYEE_ATTENDANCE_REPORT: `
    SELECT
      punch_id,
      employee_id,
      punch_status,
      DATE_FORMAT(punchin_time, '%Y-%m-%d %H:%i:%s') AS punchin_time,
      punchin_device,
      punchin_location,
      DATE_FORMAT(punchout_time, '%Y-%m-%d %H:%i:%s') AS punchout_time,
      punchout_device,
      punchout_location,
      punchmode,
      DATE_FORMAT(punchin_time, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM emp_attendence
    WHERE ( ? IS NULL OR (punchin_time >= ? ) )
      AND ( ? IS NULL OR (punchin_time < DATE_ADD(?, INTERVAL 1 DAY) ) )
      AND ( ? IS NULL OR LOWER(punch_status) = LOWER(?) )
    ORDER BY punchin_time DESC
  `,

  /**
   * Supervisor-driven tasks (task report) — maps to `tasks` table (supervisor-driven)
   * This is used by reportService.getTaskRows and handler.downloadTasksSupervisorReport
   */
  GET_SUPERVISOR_TASK_REPORT: `
  SELECT
    t.task_id,
    t.employee_id,
    CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name,
    t.task_title,
    t.description,
    DATE_FORMAT(t.start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
    t.status,
    t.percentage,
    t.progress_percentage,
    DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
    DATE_FORMAT(t.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
  FROM tasks t
  LEFT JOIN employees e ON t.employee_id = e.employee_id
  WHERE ( ? IS NULL OR (t.start_date >= ? ) )
    AND ( ? IS NULL OR (t.due_date < DATE_ADD(?, INTERVAL 1 DAY) ) )
    AND ( ? IS NULL OR LOWER(t.status) = LOWER(?) )
  ORDER BY t.start_date DESC, t.task_id ASC
  `,

  /**
   * Employee-driven weekly tasks — maps to `weekly_tasks` table (employee-driven)
   * This is used by reportService.getWeeklyTaskRows and handler.downloadTasksEmployeeReport
   */
  GET_EMPLOYEE_TASK_REPORT: `
  SELECT
    wt.task_id,
    wt.week_id,
    DATE_FORMAT(wt.task_date, '%Y-%m-%d') AS task_date,
    wt.project_id,
    wt.project_name,
    wt.task_name,
    wt.replacement_task,
    wt.employee_id,
    CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name,
    wt.emp_status,
    wt.emp_comment,
    wt.sup_status,
    wt.sup_comment,
    wt.sup_review_status,
    wt.star_rating,
    wt.parent_task_id,
    DATE_FORMAT(wt.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
    DATE_FORMAT(wt.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
  FROM weekly_tasks wt
  LEFT JOIN employees e ON wt.employee_id = e.employee_id
  WHERE ( ? IS NULL OR (wt.task_date >= ? ) )
    AND ( ? IS NULL OR (wt.task_date < DATE_ADD(?, INTERVAL 1 DAY) ) )
    AND ( ? IS NULL OR (
      LOWER(COALESCE(wt.emp_status, '')) = LOWER(?) OR
      LOWER(COALESCE(wt.sup_status, '')) = LOWER(?) OR
      LOWER(COALESCE(wt.sup_review_status, '')) = LOWER(?)
    ))
  ORDER BY wt.task_date DESC, wt.task_id ASC
`,

  /**
   * Departments
   */
  GET_DEPARTMENTS: `
    SELECT id AS department_id, name AS department_name
    FROM departments
    ORDER BY name ASC
    LIMIT 1000
  `,

  /**
   * Department name by id (used by applyEmployeeAndDepartmentFilters fallback)
   * params: [departmentId]
   */
  GET_DEPARTMENT_NAME_BY_ID: `
    SELECT name FROM departments WHERE id = ? LIMIT 1
  `,

  /**
   * Employee search (used by searchEmployees in service)
   * params: [qLike, qLike, qLike, departmentId, departmentId, limit]
   */
  SEARCH_EMPLOYEES: `
    SELECT
      e.employee_id,
      CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name,
      e.email,
      pr.department_id,
      COALESCE(d.name, '') AS department_name
    FROM employees e
    LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
    LEFT JOIN departments d ON pr.department_id = d.id
    WHERE (CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
      AND ( ? IS NULL OR pr.department_id = ? )
    ORDER BY employee_name ASC
    LIMIT ?
  `,

  /**
   * Backward-compatible weekly alias (kept for any legacy callers)
   * This intentionally duplicates the same weekly_tasks SQL but kept as a separate key
   */
  GET_WEEKLY_TASK_REPORT: `
  SELECT
    wt.task_id,
    wt.week_id,
    DATE_FORMAT(wt.task_date, '%Y-%m-%d') AS task_date,
    wt.project_id,
    wt.project_name,
    wt.task_name,
    wt.replacement_task,
    wt.employee_id,
    CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) AS employee_name,
    wt.emp_status,
    wt.emp_comment,
    wt.sup_status,
    wt.sup_comment,
    wt.sup_review_status,
    wt.star_rating,
    wt.parent_task_id,
    DATE_FORMAT(wt.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
    DATE_FORMAT(wt.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
  FROM weekly_tasks wt
  LEFT JOIN employees e ON wt.employee_id = e.employee_id
  WHERE ( ? IS NULL OR (wt.task_date >= ? ) )
    AND ( ? IS NULL OR (wt.task_date < DATE_ADD(?, INTERVAL 1 DAY) ) )
  ORDER BY wt.task_date DESC, wt.task_id ASC
`,
};

/* aliases to keep backwards compatibility with reportService expectations */
const q = module.exports;
// Explicitly map the canonical API names so reportService.getTaskRows uses the supervisor-driven SQL
q.GET_TASK_REPORT = q.GET_SUPERVISOR_TASK_REPORT;
// Ensure the weekly/employee alias points to the employee-driven weekly_tasks SQL
q.GET_WEEKLY_TASK_REPORT = q.GET_EMPLOYEE_TASK_REPORT;

module.exports = q;
