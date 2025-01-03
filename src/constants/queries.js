/**
 * SQL Queries for database operations.
 * 
 * @module queries
 */

module.exports = {
  // Query to fetch user details by email
  GET_USER_BY_EMAIL: `
    SELECT role, employee_id, CONCAT(first_name,' ', last_name) AS name, email, password, position, department 
    FROM employees 
    WHERE email = ?;
  `,

  // Query to fetch admin details by employee_id
  GET_ADMIN_DETAILS: `
    SELECT role, employee_id, CONCAT(first_name,' ', last_name) AS name, email, password, position, department 
    FROM employees 
    WHERE employee_id = ?;
  `,

  // Query to fetch admin dashboard statistics
  GET_ADMIN_DASHBOARD: `
  SELECT 
    COUNT(DISTINCT a.employee_id) AS total_employees,
    SUM(CASE WHEN DATE(a.date) = CURDATE() AND a.login_time IS NOT NULL THEN 1 ELSE 0 END) AS present,
    (
      SELECT COUNT(*) 
      FROM leavequeries lq
      WHERE lq.leave_type = 'Sick' 
        AND lq.status = 'Approved' 
        AND DATE(lq.created_at) = CURDATE()
    ) AS sick_leave,
    (
      SELECT COUNT(*) 
      FROM leavequeries lq
      WHERE lq.leave_type = 'Other' 
        AND lq.status = 'Approved' 
        AND DATE(lq.created_at) = CURDATE()
    ) AS other_absence
  FROM attendance a
  WHERE DATE(a.date) = CURDATE();
`,

  // Query to fetch salary distribution data
  GET_SALARY_DISTRIBUTION: `
    SELECT 
      AVG(salary) AS average_salary, 
      MIN(salary) AS min_salary, 
      MAX(salary) AS max_salary 
    FROM employees;
  `,

  // Query to fetch department-wise employee distribution
  GET_DEPARTMENT_DISTRIBUTION: `
    SELECT 
      department, 
      COUNT(*) AS count 
    FROM employees 
    GROUP BY department;
  `,

  // Query to fetch financial statistics for the previous month
  GET_FINANCIAL_STATS: `
    SELECT 
      SUM(total_expenses) AS previous_month_expenses, 
      SUM(total_salary) AS previous_month_salary, 
      SUM(total_credit) AS previous_month_credit
    FROM financials
    WHERE MONTH(month) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)
      AND YEAR(month) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH);
  `,

  // Query to fetch current projects
  GET_CURRENT_PROJECTS: `
    SELECT 
      project_name, 
      job_type, 
      department, 
      start_date, 
      end_date, 
      comments 
    FROM projects 
    WHERE CURRENT_DATE BETWEEN start_date AND end_date;
  `,

  // Query to fetch upcoming projects
  GET_UPCOMING_PROJECTS: `
    SELECT 
      project_name, 
      job_type, 
      department, 
      start_date, 
      end_date, 
      comments 
    FROM projects 
    WHERE start_date > CURRENT_DATE;
  `,

  // Query to fetch previous projects
  GET_PREVIOUS_PROJECTS: `
    SELECT 
      project_name, 
      job_type, 
      department, 
      start_date, 
      end_date, 
      comments 
    FROM projects 
    WHERE end_date < CURRENT_DATE;
  `,

  // Query to fetch login data grouped by hourly ranges
  GET_HOURLY_LOGIN_DATA: `
      SELECT 
        CASE 
          WHEN login_time < '09:30:00' THEN '<9:30'
          WHEN login_time BETWEEN '09:30:00' AND '10:00:00' THEN '9:30-10:00'
          WHEN login_time BETWEEN '10:00:00' AND '11:00:00' THEN '10:00-11:00'
          ELSE '>11:00'
        END AS timing, 
        COUNT(*) AS count
      FROM attendance
      WHERE DATE(date) = CURDATE()
      GROUP BY timing;
  `,
  //Query to fetch employee dashboard statistics
  GET_EMPLOYEE_DASHBOARD: `
  SELECT 
    CONCAT(e.first_name, ' ', e.last_name) AS full_name,
    e.salary AS salary,
    (SELECT COUNT(*) 
     FROM attendance a 
     WHERE a.employee_id = ? AND DATE(a.date) = CURDATE() AND a.login_time IS NOT NULL) AS attendance_count,
    (SELECT COUNT(*) 
     FROM leavequeries lq 
     WHERE lq.employee_id = ? AND lq.status = 'Approved' AND DATE(lq.created_at) = CURDATE()) AS leave_queries_count,
    (SELECT COUNT(*) 
     FROM leavequeries lq
     WHERE lq.employee_id = ? AND lq.leave_type = 'Sick' AND lq.status = 'Approved' AND DATE(lq.created_at) = CURDATE()) AS sick_leave,
    (SELECT COUNT(*) 
     FROM leavequeries lq
     WHERE lq.employee_id = ? AND lq.leave_type = 'Other' AND lq.status = 'Approved' AND DATE(lq.created_at) = CURDATE()) AS other_absence
  FROM employees e
  WHERE e.employee_id = ?;
`
};
