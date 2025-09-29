
module.exports = {
  ADD_COMPENSATION_ASSIGNMENT: `
    INSERT INTO assigned_compensations (
      compensation_plan_name,
      assigned_data,
      assigned_by,
      assigned_date
    )
    SELECT 
      cp.compensation_plan_name,
      JSON_OBJECT(
        'employee_ids', JSON_ARRAY(?),
        'department_ids', JSON_ARRAY(?)
      ) AS assigned_data,
      ? AS assigned_by,
      CURRENT_TIMESTAMP AS assigned_date
    FROM compensation_plans cp
    WHERE cp.id = ?
  `,

  UPDATE_COMPENSATION_ASSIGNMENT: `
    UPDATE assigned_compensations
    SET 
      compensation_plan_name = (
        SELECT compensation_plan_name 
        FROM compensation_plans 
        WHERE id = ?
      ),
      assigned_data = JSON_OBJECT(
        'employee_ids', JSON_ARRAY(?),
        'department_ids', JSON_ARRAY(?)
      ),
      assigned_by = ?,
      assigned_date = CURRENT_TIMESTAMP
    WHERE id = ?
  `,

  CHECK_EXISTING_ASSIGNMENT: `
    SELECT id 
    FROM assigned_compensations 
    WHERE JSON_CONTAINS(assigned_data->'$.employee_ids', JSON_ARRAY(?))
      OR JSON_CONTAINS(assigned_data->'$.department_ids', JSON_ARRAY(?))
      AND compensation_plan_name = (
        SELECT compensation_plan_name 
        FROM compensation_plans 
        WHERE id = ?
      )
  `,

 // In ../constants/assign_compensation.js
GET_ASSIGNED_COMPENSATION_DETAILS: `
SELECT 
    ac.id,
    ac.compensation_plan_name,
    ac.assigned_data,
    ac.assigned_by,
    ac.assigned_date,
    CONCAT(e.first_name, ' ', e.last_name) AS full_name,
    e.employee_id,
    ep.salary AS ctc,
    c.plan_data
FROM assigned_compensations ac
JOIN employees e ON JSON_SEARCH(ac.assigned_data, 'one', e.employee_id, NULL, '$[*].employee_id') IS NOT NULL
LEFT JOIN employee_professional ep ON e.employee_id = ep.employee_id
LEFT JOIN compensation_plans c ON ac.compensation_plan_name = c.compensation_plan_name
ORDER BY ac.assigned_date DESC, e.first_name ASC
LIMIT 0, 1000;
`,

  ADD_EMPLOYEE_BONUS: `
    INSERT INTO employee_bonus_details (
      percentage_ctc,
      percentage_monthly_salary,
      fixed_amount,
      applicable_month,
      created_at
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `,

 ADD_EMPLOYEE_BONUS_BULK: `
    INSERT INTO employee_bonus_details (
      percentage_ctc,
      percentage_monthly_salary,
      fixed_amount,
      applicable_month,
      created_at
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `,

  GET_EMPLOYEE_BONUS_DETAILS: `
    SELECT 
      id,
      percentage_ctc,
      percentage_monthly_salary,
      fixed_amount,
      applicable_month,
      created_at
    FROM employee_bonus_details
    ORDER BY applicable_month DESC, id ASC
    LIMIT 0, 1000
  `,
// Advance queries
  ADD_EMPLOYEE_ADVANCE: `
  INSERT INTO employee_advance_details (
    employee_id,
    advance_amount,
    recovery_months,
    applicable_months,
    created_at
  )
  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
`,

 GET_EMPLOYEE_ADVANCE_DETAILS: `
  SELECT 
    ead.id,
    ead.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) AS full_name,
    ead.advance_amount,
    ead.recovery_months,
    ead.applicable_months,
    ead.created_at,
    ead.updated_at
  FROM employee_advance_details ead
  JOIN employees e ON ead.employee_id = e.employee_id
  WHERE e.status = 'Active'
  ORDER BY ead.created_at DESC
  LIMIT 0, 1000
`,

  GET_EMPLOYEE_EXTRA_HOURS: `
    SELECT 
      ea.punch_id,
      ea.employee_id,
      DATE(ea.punchin_time) AS work_date,
      ea.punch_status,
      ea.punchin_time,
      ea.punchin_device,
      ea.punchin_location,
      ea.punchout_time,
      ea.punchout_device,
      ea.punchout_location,
      ea.punchmode,
      ROUND(TIMESTAMPDIFF(MINUTE, ea.punchin_time, ea.punchout_time) / 60.0, 2) AS hours_worked,
      ROUND(TIMESTAMPDIFF(MINUTE, ea.punchin_time, ea.punchout_time) / 60.0 - 10, 2) AS extra_hours,
      od.rate,
      od.project,
      od.supervisor,
      od.comments,
      COALESCE(od.status, 'Pending') AS status
    FROM emp_attendence ea
    LEFT JOIN overtime_details od ON ea.punch_id = od.punch_id
    WHERE 
      ea.punchin_time IS NOT NULL
      AND ea.punchout_time IS NOT NULL
      AND TIMESTAMPDIFF(HOUR, ea.punchin_time, ea.punchout_time) > 10
      AND ea.punchin_time >= ?
      AND ea.punchin_time <= ?
  `,

 
ADD_OVERTIME_DETAILS_BULK: `
  INSERT INTO overtime_details (
    punch_id,
    work_date,
    employee_id,
    extra_hours,
    rate,
    project,
    supervisor,
    comments,
    status,
    created_at,
    updated_at
  )
  VALUES ?
`,

// Insert a single row as "Approved"
ADD_OVERTIME_DETAILS_APPROVED: `
  INSERT INTO overtime_details (
    punch_id,
    work_date,
    employee_id,
    extra_hours,
    rate,
    project,
    supervisor,
    comments,
    status,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`,

// Insert a single row as "Rejected"
ADD_OVERTIME_DETAILS_REJECTED: `
  INSERT INTO overtime_details (
    punch_id,
    work_date,
    employee_id,
    extra_hours,
    rate,
    project,
    supervisor,
    comments,
    status,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Rejected', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
`,
 GET_ALL_OVERTIME_DETAILS :`
  SELECT 
    punch_id,
    work_date,
    employee_id,
    extra_hours,
    rate,
    project,
    supervisor,
    comments,
    status,
    created_at,
    updated_at
  FROM overtime_details
  ORDER BY work_date DESC
`,
GET_EMPLOYEE_LOP_DAYS_FOR_CURRENT_PERIOD :`
  SELECT 
    employee_id,
    lop
  FROM sukalpadata.employee_monthly_lop
  WHERE 
    (
      CASE 
        WHEN DAY(CURDATE()) < 26 
          THEN month = MONTH(CURDATE() - INTERVAL 1 MONTH) 
        ELSE month = MONTH(CURDATE())
      END
    )
    AND 
    (
      CASE 
        WHEN DAY(CURDATE()) < 26 
          THEN year = YEAR(CURDATE() - INTERVAL 1 MONTH) 
        ELSE year = YEAR(CURDATE())
      END
    );
`

  ,
CHECK_EMPLOYEE_ASSIGNMENT: `
    SELECT id, compensation_plan_name
FROM assigned_compensations
WHERE JSON_CONTAINS(assigned_data, ?, '$.employee_id')
  `,
  ADD_ASSIGNED_COMPENSATION: `
    INSERT INTO assigned_compensations (
      compensation_plan_name,
      assigned_data,
      assigned_by,
      assigned_date
    )
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `,


  GET_WORKING_DAYS_CURRENT_MONTH: `
    WITH RECURSIVE month_days AS (
        SELECT DATE(CONCAT(YEAR(NOW()), '-', MONTH(NOW()), '-01')) AS work_date
        UNION ALL
        SELECT DATE_ADD(work_date, INTERVAL 1 DAY)
        FROM month_days
        WHERE work_date < LAST_DAY(NOW())
    ),
    all_saturdays AS (
        SELECT work_date, ROW_NUMBER() OVER (ORDER BY work_date) AS sat_position
        FROM month_days
        WHERE WEEKDAY(work_date) = 5  -- Saturday
    ),
    saturday_list AS (
        SELECT all_saturdays.work_date AS holiday_date
        FROM all_saturdays
        JOIN (
            SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(saturdays, ',', numbers.n), ',', -1) AS selected_sat
            FROM saturday_holidays
            JOIN (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) numbers
            ON CHAR_LENGTH(saturdays) - CHAR_LENGTH(REPLACE(saturdays, ',', '')) >= numbers.n - 1
            WHERE month_year = DATE_FORMAT(NOW(), '%m-%Y')
        ) subquery
        ON all_saturdays.sat_position = subquery.selected_sat
    )
    SELECT COUNT(*) AS total_working_days
    FROM month_days
    WHERE WEEKDAY(work_date) != 6  -- Exclude Sundays
      AND work_date NOT IN (SELECT holiday_date FROM saturday_list)
      AND work_date NOT IN (
          SELECT date FROM holidays
          WHERE MONTH(date) = MONTH(NOW()) 
            AND YEAR(date) = YEAR(NOW())
      );
  `



};

