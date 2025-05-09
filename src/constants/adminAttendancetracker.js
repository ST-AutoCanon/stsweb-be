module.exports = {
  GET_MISSING_PUNCH_IN_EMPLOYEES: `
      SELECT 
  e.employee_id,
  e.first_name,
  e.last_name,
  d.attendance_date
FROM 
  (
    SELECT 
      DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL seq DAY) AS attendance_date
    FROM 
      (
        SELECT 0 AS seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
        UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
        UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
        UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
        UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
        UNION ALL SELECT 30 UNION ALL SELECT 31
      ) AS days
    WHERE seq <= DAY(LAST_DAY(CURDATE()))
  ) d
CROSS JOIN 
  employees e
LEFT JOIN 
  emp_attendence ea ON e.employee_id = ea.employee_id 
  AND DATE(ea.punchin_time) = d.attendance_date
LEFT JOIN 
  leavequeries lq ON e.employee_id = lq.employee_id
  AND lq.status = 'Approved'
  AND d.attendance_date BETWEEN lq.start_date AND lq.end_date
LEFT JOIN 
  holidays h ON d.attendance_date = h.date
WHERE 
  ea.punchin_time IS NULL
  AND lq.employee_id IS NULL
  AND h.date IS NULL                          -- Exclude holidays
  AND DAYOFWEEK(d.attendance_date) != 1       -- Exclude Sundays (1 = Sunday in MySQL DAYOFWEEK)
ORDER BY 
  e.employee_id, d.attendance_date;

  `,
  GET_EMPLOYEES_WITH_PUNCH_IN_NOT_PUNCHED_OUT: `
  SELECT 
  employee_id,
  punchin_time,
  punchout_time,
  TIMESTAMPDIFF(HOUR, punchin_time, punchout_time) AS hours_worked,
  punchmode
FROM 
  emp_attendence
WHERE 
  punchin_time BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') 
 AND LAST_DAY(CURDATE())
  AND punchout_time IS NOT NULL
  AND TIMESTAMPDIFF(HOUR, punchin_time, punchout_time) >= 10;

  
  
  `,
  
  GET_EMPLOYEES_WORKED_LESS_THAN_8_HOURS: `
    SELECT 
  e.employee_id,
  e.first_name,
  e.last_name,
  DATE(ea.punchin_time) AS attendance_date,
  ROUND(SUM(TIMESTAMPDIFF(SECOND, ea.punchin_time, ea.punchout_time)) / 3600, 2) AS hours_worked
FROM 
 emp_attendence ea
JOIN 
  employees e ON ea.employee_id = e.employee_id
WHERE 
  ea.punchin_time IS NOT NULL
  AND ea.punchout_time IS NOT NULL
  AND ea.punchin_time >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
  AND ea.punchin_time < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
GROUP BY 
  e.employee_id, DATE(ea.punchin_time)
HAVING 
  hours_worked < 8
ORDER BY 
  e.employee_id, attendance_date;

  `,

  GET_EMPLOYEES_WORKED_8_TO_10_HOURS: `
    SELECT 
      e.employee_id,
      e.first_name,
      e.last_name,
      DATE(ea.punchin_time) AS attendance_date,
      ROUND(TIMESTAMPDIFF(SECOND, ea.punchin_time, ea.punchout_time) / 3600, 2) AS hours_worked
    FROM 
      emp_attendence ea
    JOIN 
      employees e ON ea.employee_id = e.employee_id
    WHERE 
      ea.punchin_time IS NOT NULL
      AND ea.punchout_time IS NOT NULL
      AND ea.punchin_time >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      AND ea.punchin_time < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      AND ROUND(TIMESTAMPDIFF(SECOND, ea.punchin_time, ea.punchout_time) / 3600, 2) BETWEEN 8 AND 10
    ORDER BY 
      e.employee_id, attendance_date;
  `
,
GET_APPROVED_LEAVES_CURRENT_MONTH: `

SELECT 
    l.*, 
    CONCAT(e.first_name, ' ', e.last_name) AS employee_name
FROM 
    leavequeries l
JOIN 
    employees e ON l.employee_id = e.employee_id
WHERE 
    l.status = 'Approved'
    AND (
        l.start_date <= LAST_DAY(CURDATE()) 
        AND l.end_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    );


`

};
