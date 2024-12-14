/**
 * Service layer to handle login and dashboard data retrieval.
 * 
 * @module loginService
 */

const db = require("../config");
const queries = require("../constants/queries");
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

    return {
      name: admin.name,
      employee_id: admin.employee_id,
      email: admin.email,
      position: admin.position,
      department: admin.department,
      total_employees: dashboardStats[0].total_employees,
      attendance: {
        present: dashboardStats[0].present,
        sick_leave: dashboardStats[0].sick_leave,
        other_absence: dashboardStats[0].other_absence,
      },
      salary_distribution: salaryDistribution[0],
      department_distribution: departmentDistribution,
      login_timer_graph: loginData,
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
        })),
        upcoming: upcomingProjects,
        previous: previousProjects,
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
        first_name: employee.full_name.split(' ')[0],
        last_name: employee.full_name.split(' ')[1],
        salary: employee.salary,
        attendance_count: employee.attendance_count,
        leave_queries_count: employee.leave_queries_count,
        attendance_breakdown: {
          present: employee.attendance_count,
          sick_leave: employee.sick_leave,
          other_absence: employee.other_absence
        }
      };
    } catch (err) {
      console.error("Error fetching employee dashboard data:", err);
      throw new Error("Error fetching employee dashboard data");
    }
  }
}

module.exports = LoginService;
