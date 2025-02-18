/**
 * Service layer to handle login and dashboard data retrieval.
 * 
 * @module loginService
 */

const db = require("../config");
const queries = require("../constants/loginQueries");
const moment = require("moment");

class LoginService {
  /**
   * Fetch user details by email.
   * 
   * @param {string} email - User email.
   * @returns {Promise<Object>} User details from the database.
   */
  static async fetchUserByEmail(email) {
    const [rows] = await db.execute(queries.GET_USER_BY_EMAIL, [email]);
    return rows[0];
  }

  /**
   * Fetch admin dashboard data.
   * 
   * @param {number} employee_id - ID of the admin.
   * @returns {Promise<Object>} Dashboard statistics for admin users.
   */
  static async fetchAdminDashboard(employee_id) {
    // Fetch admin personal details
    const [adminDetails] = await db.execute(queries.GET_ADMIN_DETAILS, [employee_id]);

    if (!adminDetails.length) {
      throw new Error("Admin details not found.");
    }

    const admin = adminDetails[0];

    // Fetch admin dashboard stats
    const [dashboardStats] = await db.execute(queries.GET_ADMIN_DASHBOARD);

    // Fetch salary distribution
    const [salaryDistribution] = await db.execute(queries.GET_SALARY_DISTRIBUTION);

    // Fetch department distribution
    const [departmentDistribution] = await db.execute(queries.GET_DEPARTMENT_DISTRIBUTION);

    // Fetch login timer graph for daily logins
    const today = moment().startOf("day");
    const periods = {
      daily: { start: today, end: moment(today).endOf("day") },
      weekly: { start: moment(today).subtract(6, "days"), end: moment() },
      monthly: { start: moment(today).subtract(29, "days"), end: moment() },
    };

    const { start, end } = periods["daily"];

    // Fetch login data directly from the database for the defined time range
    const [loginData] = await db.execute(queries.GET_HOURLY_LOGIN_DATA, [start.toISOString(), end.toISOString()]);

    // Fetch project data
    const [currentProjects] = await db.execute(queries.GET_CURRENT_PROJECTS);
    const [upcomingProjects] = await db.execute(queries.GET_UPCOMING_PROJECTS);
    const [previousProjects] = await db.execute(queries.GET_PREVIOUS_PROJECTS);

    // Fetch financial statistics
    const [financialStats] = await db.execute(queries.GET_FINANCIAL_STATS);

    // In your fetchAdminDashboard method (LoginService)
return {
  name: admin.name,
  employee_id: admin.employee_id,
  email: admin.email,
  gender: admin.gender,
  total_employees: dashboardStats[0]?.total_employees || 0,  // Default to 0 if not available
  attendance: {
    present: dashboardStats[0]?.present || 0,  // Default to 0 if null
    sick_leave: dashboardStats[0]?.sick_leave || 0,  // Default to 0 if null
    other_absence: dashboardStats[0]?.other_absence || 0,  // Default to 0 if null
  },
  salary_distribution: salaryDistribution[0] || { average_salary: 0, min_salary: 0, max_salary: 0 }, // Default salary if null
  department_distribution: departmentDistribution || [],  // Empty array if no department distribution
  login_timer_graph: loginData || [],  // Empty array if no login data
  financial_stats: {
    previous_month_expenses: financialStats[0]?.previous_month_expenses || 0,
    previous_month_salary: financialStats[0]?.previous_month_salary || 0,
    previous_month_credit: financialStats[0]?.previous_month_credit || 0,
  },
  projects: {
    current: currentProjects.map(project => ({
      project_name: project.project_name,
      job_type: project.job_type,
      department: project.department,
      start_date: project.start_date,
      end_date: project.end_date,
      comments: project.comments,
    })) || [],  // Empty array if no projects
    upcoming: upcomingProjects || [],
    previous: previousProjects || [],
  },
};

  }

  /**
   * Fetch employee dashboard data.
   * 
   * @param {string} employeeId - Employee ID to fetch data for.
   * @returns {Promise<Object>} Employee dashboard data.
   */
  static async fetchEmployeeDashboard(employeeId) {
    try {
      const [rows] = await db.execute(queries.GET_EMPLOYEE_DASHBOARD, [employeeId, employeeId, employeeId, employeeId, employeeId]);

      if (rows.length === 0) {
        throw new Error("Employee not found");
      }

      const employee = rows[0];

      return {
        name: employee.name,
        employeeId: employee.employee_id,
        position: employee.position,
        gender: employee.gender,
        department_id: employee.department_id,
        salary: employee.salary,
        photoUrl: employee.photo_url,
        attendance_count: employee.attendance_count,
        leave_queries_count: employee.leave_queries_count,
        attendance_breakdown: {
          present: employee.attendance_count,
          sick_leave: employee.sick_leave,
          other_absence: employee.other_absence
        }
      };
    } catch (err) {
      throw new Error("Error fetching employee dashboard data");
    }
  }

/**
   * Fetch sidebar menu items based on role.
   * 
   * @param {string} role - User role.
   * @returns {Promise<Array>} List of sidebar menu items.
   */
static async fetchSidebarMenu(role) {
  const [menuItems] = await db.execute(queries.GET_SIDEBAR_MENU, [role]);
  return menuItems;
}

static async getAttendanceStatusCount() {
    try {
      console.log("Executing SQL Query: ", queries.GET_ATTENDANCE_STATUS_COUNT);
      const [rows] = await db.execute(queries.GET_ATTENDANCE_STATUS_COUNT);
      
      console.log("Query Result:", rows);
      
      if (!rows || rows.length === 0) {
        return { totalEmployees: 0, categories: [] };
      }
      
      const { totalEmployees, present, sick_leave, absent } = rows[0];
      
      return {
        totalEmployees: totalEmployees || 0,
        categories: [
          { label: "Present", count: present || 0, color: "#004DC6" },
          { label: "Sick Leave", count: sick_leave || 0, color: "#438CFF" },
          { label: "Absent", count: absent || 0, color: "#C7DDFF" }
        ]
      };
    } catch (error) {
      console.error("Error fetching attendance status count:", error);
      throw new Error("Failed to fetch attendance status count: " + error.message);
    }
  }


  static async fetchEmployeeLoginDataCount() {
    try {
      const [rows] = await db.execute(queries.GET_EMPLOYEE_LOGIN_DATA_COUNT);
      return rows;
    } catch (error) {
      console.error("Error fetching login data count:", error);
      throw new Error("Failed to fetch login data count");
    }
  }

  static async fetchSalaryRanges() {
    try {
      const [rows] = await db.execute(queries.GET_EMPLOYEE_SALARY_RANGE);
      
      return {
        labels: rows.map(row => row.salary_range),
        datasets: [
          {
            label: "Salaries",
            data: rows.map(row => row.count),
            backgroundColor: ["#82DAFE", "#00A1DA", "#0078CF", "#012FBA", "#011F7B"],
          },
        ],
      };
    } catch (error) {
      console.error("Error fetching salary ranges:", error);
      throw new Error("Failed to fetch salary ranges");
    }
  }

  static async getEmployeeCountByDepartment() {
    try {
      const [rows] = await db.execute(queries.GET_EMPLOYEE_BY_DEPARTMENT);
      return rows;
    } catch (error) {
      console.error("Error fetching employee count by department:", error);
      throw new Error("Failed to fetch employee count by department");
    }
  }

  static async getEmployeePayrollData() {
    try {
      const [rows] = await db.execute(queries.GET_EMPLOYEE_PAYROLL);
      return {
        total_previous_month_credit: rows[0]?.total_previous_month_credit || 0,
        total_previous_month_expenses: rows[0]?.total_previous_month_expenses || 0,
        total_previous_month_salary: rows[0]?.total_previous_month_salary || 0,
      };
    } catch (error) {
      console.error("Error fetching employee payroll data:", error);
      throw new Error("Failed to fetch payroll data");
    }
  }
}

module.exports = LoginService;
