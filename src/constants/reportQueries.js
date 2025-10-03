module.exports = {
  /* ---------- Leaves (filter by updated_at if present, otherwise created_at) ---------- */
  GET_LEAVE_REPORT: `
  SELECT
    lq.id AS leave_id,
    lq.employee_id,
    lq.leave_type,
    lq.H_F_day,
    lq.reason,
    lq.status,
    DATE_FORMAT(lq.start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(lq.end_date, '%Y-%m-%d') AS end_date,
    lq.comments,
    lq.is_defaulted,
    DATE_FORMAT(lq.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
    DATE_FORMAT(lq.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at,
    CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
    d.name AS department_name
  FROM leavequeries lq
  JOIN employees e ON lq.employee_id = e.employee_id
  LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
  LEFT JOIN departments d ON pr.department_id = d.id
  WHERE ( ? IS NULL OR (COALESCE(lq.updated_at, lq.created_at) >= ? ) )
    AND ( ? IS NULL OR (COALESCE(lq.updated_at, lq.created_at) < DATE_ADD(?, INTERVAL 1 DAY) ) )
    AND ( ? IS NULL OR LOWER(lq.status) = LOWER(?) )
  ORDER BY COALESCE(lq.updated_at, lq.created_at) DESC
`,
  /* ---------- Reimbursements: unified status for display + robust filtering ---------- */
  GET_REIMBURSEMENT_REPORT: `
SELECT
  r.*,
  CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
  IF(r.from_date IS NOT NULL AND r.to_date IS NOT NULL,
     CONCAT(r.from_date, ' - ', r.to_date),
     r.date) AS date_range,

  -- unified display: prefer payment_status when non-empty, otherwise approval status
  COALESCE(NULLIF(r.payment_status, ''), NULLIF(r.status, '')) AS payment_status,

  -- keep both raw columns too for completeness
  r.payment_status AS raw_payment_status,
  r.status AS approval_status,

  DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
  DATE_FORMAT(r.approved_date, '%Y-%m-%d %H:%i:%s') AS approved_date,
  r.claim_type AS claim_title,
  d.name AS department_name
FROM reimbursement r
JOIN employees e ON r.employee_id = e.employee_id
LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
LEFT JOIN departments d ON pr.department_id = d.id
WHERE ( ? IS NULL OR (COALESCE(r.approved_date, r.created_at) >= ? ) )
  AND ( ? IS NULL OR (COALESCE(r.approved_date, r.created_at) < DATE_ADD(?, INTERVAL 1 DAY) ) )
  AND (
    ? IS NULL
    OR (
      LOWER(?) = 'paid' AND LOWER(r.payment_status) = 'paid'
    )
    OR (
      LOWER(?) = 'unpaid' AND (r.payment_status IS NULL OR r.payment_status = '' OR LOWER(r.payment_status) = 'unpaid')
    )
    OR (
      LOWER(?) IN ('pending','approved','rejected') AND LOWER(COALESCE(r.status, '')) = LOWER(?)
    )
  )
ORDER BY r.created_at DESC
`,

  /* ---------- Employees ---------- (keeps previous behavior; filters on e.created_at + status) */
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
      d.name AS department_name,
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

  /* ---------- Vendors ---------- (no status column; keep as no-op so params shape stays consistent) ---------- */
  GET_VENDOR_REPORT: `
    SELECT
      v.vendor_id,
      COALESCE(v.company_name, '') AS vendor_name,
      COALESCE(v.contact1_name, '') AS contact_person,
      COALESCE(v.contact1_mobile, '') AS phone,
      COALESCE(v.contact1_email, '') AS email,
      COALESCE(v.city, '') AS city,
      COALESCE(v.gst_number, '') AS gst_number,
      COALESCE(v.pan_number, '') AS pan_number,
      '' AS status,
      DATE_FORMAT(COALESCE(v.created_at, NOW()), '%Y-%m-%d %H:%i:%s') AS created_at
    FROM vendors v
    WHERE ( ? IS NULL OR (COALESCE(v.created_at, NOW()) >= ? ) )
      AND ( ? IS NULL OR (COALESCE(v.created_at, NOW()) < DATE_ADD(?, INTERVAL 1 DAY) ) )
      AND ( ? IS NULL OR 1=1 )
      AND ( ? IS NULL OR 1=1 )
    ORDER BY COALESCE(v.created_at, NOW()) DESC
  `,

  /* ---------- Assets ---------- */
  GET_ASSET_REPORT: `
    SELECT
      a.asset_id,
      a.asset_code AS asset_tag,
      a.asset_name,
      a.configuration,
      a.category,
      a.sub_category,
      JSON_UNQUOTE(JSON_EXTRACT(a.assigned_to, CONCAT('$[', GREATEST(JSON_LENGTH(COALESCE(a.assigned_to, '[]')) - 1, 0), '].employeeId'))) AS assigned_to_employee_id,
      JSON_UNQUOTE(JSON_EXTRACT(a.assigned_to, CONCAT('$[', GREATEST(JSON_LENGTH(COALESCE(a.assigned_to, '[]')) - 1, 0), '].name'))) AS assigned_to_name,
      DATE_FORMAT(a.valuation_date, '%Y-%m-%d') AS valuation_date,
      a.document_path,
      a.status,
      DATE_FORMAT(COALESCE(a.created_at, a.valuation_date, NOW()), '%Y-%m-%d %H:%i:%s') AS created_at
    FROM assets a
    WHERE ( ? IS NULL OR (COALESCE(a.created_at, a.valuation_date, NOW()) >= ? ) )
      AND ( ? IS NULL OR (COALESCE(a.created_at, a.valuation_date, NOW()) < DATE_ADD(?, INTERVAL 1 DAY) ) )
      AND ( ? IS NULL OR LOWER(a.status) = LOWER(?) )
    ORDER BY COALESCE(a.created_at, a.valuation_date, NOW()) DESC
  `,

  /* ---------- Attendance ---------- */
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
};
