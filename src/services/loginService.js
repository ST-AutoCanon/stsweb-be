const db = require("../config");
const queries = require("../constants/loginQueries");
const moment = require("moment");

class LoginService {
  static async fetchUserByEmail(email) {
    const [rows] = await db.execute(queries.GET_USER_BY_EMAIL, [email]);
    return rows[0];
  }

  static async fetchAdminDashboard(employee_id) {
    const [adminDetails] = await db.execute(queries.GET_ADMIN_DETAILS, [
      employee_id,
    ]);

    if (!adminDetails.length) {
      throw new Error("Admin details not found.");
    }

    const admin = adminDetails[0];

    const [dashboardStats] = await db.execute(queries.GET_ADMIN_DASHBOARD);

    const [salaryDistribution] = await db.execute(
      queries.GET_SALARY_DISTRIBUTION
    );

    const [departmentDistribution] = await db.execute(
      queries.GET_DEPARTMENT_DISTRIBUTION
    );

    const today = moment().startOf("day");
    const periods = {
      daily: { start: today, end: moment(today).endOf("day") },
      weekly: { start: moment(today).subtract(6, "days"), end: moment() },
      monthly: { start: moment(today).subtract(29, "days"), end: moment() },
    };

    const { start, end } = periods["daily"];

    const [loginData] = await db.execute(queries.GET_HOURLY_LOGIN_DATA, [
      start.toISOString(),
      end.toISOString(),
    ]);

    const [currentProjects] = await db.execute(queries.GET_CURRENT_PROJECTS);
    const [upcomingProjects] = await db.execute(queries.GET_UPCOMING_PROJECTS);
    const [previousProjects] = await db.execute(queries.GET_PREVIOUS_PROJECTS);

    const [financialStats] = await db.execute(queries.GET_FINANCIAL_STATS);

    return {
      name: admin.name,
      employeeId: admin.employee_id,
      email: admin.email,
      gender: admin.gender,
      total_employees: dashboardStats[0]?.total_employees || 0,
      attendance: {
        present: dashboardStats[0]?.present || 0,
        sick_leave: dashboardStats[0]?.sick_leave || 0,
        other_absence: dashboardStats[0]?.other_absence || 0,
      },
      salary_distribution: salaryDistribution[0] || {
        average_salary: 0,
        min_salary: 0,
        max_salary: 0,
      },
      department_distribution: departmentDistribution || [],
      login_timer_graph: loginData || [],
      financial_stats: {
        previous_month_expenses:
          financialStats[0]?.previous_month_expenses || 0,
        previous_month_salary: financialStats[0]?.previous_month_salary || 0,
        previous_month_credit: financialStats[0]?.previous_month_credit || 0,
      },
      projects: {
        current:
          currentProjects.map((project) => ({
            project_name: project.project_name,
            job_type: project.job_type,
            department: project.department,
            start_date: project.start_date,
            end_date: project.end_date,
            comments: project.comments,
          })) || [],
        upcoming: upcomingProjects || [],
        previous: previousProjects || [],
      },
    };
  }

  static async fetchEmployeeDashboard(employeeId) {
    try {
      const [rows] = await db.execute(queries.GET_EMPLOYEE_DASHBOARD, [
        employeeId,
      ]);

      if (rows.length === 0) {
        throw new Error("Employee not found");
      }

      const emp = rows[0];

      return {
        name: emp.name,
        employeeId: emp.employee_id,
        position: emp.position,
        gender: emp.gender,
        department: emp.department,
        department_id: emp.department_id,
        salary: emp.salary,
        photoUrl: emp.photo_url,
        attendance_count: emp.attendance_count || 0,
        leave_queries_count: emp.leave_queries_count || 0,
        attendance_breakdown: {
          present: emp.attendance_count || 0,
          sick_leave: emp.sick_leave || 0,
          other_absence: emp.other_absence || 0,
        },
      };
    } catch (err) {
      console.error("Error in fetchEmployeeDashboard:", err.message);
      throw new Error("Error fetching employee dashboard data");
    }
  }

  static async fetchSidebarMenu(role) {
    const [menuItems] = await db.execute(queries.GET_SIDEBAR_MENU, [role]);
    return menuItems;
  }

  static async getAttendanceStatusCount() {
    try {
      const [rows] = await db.execute(queries.GET_ATTENDANCE_STATUS_COUNT);

      if (!rows || rows.length === 0) {
        return { totalEmployees: 0, categories: [] };
      }

      const { totalEmployees, present, approved_leave, absent } = rows[0];

      return {
        totalEmployees: totalEmployees || 0,
        categories: [
          { label: "Present", count: present || 0, color: "#004DC6" },
          { label: "Leave", count: approved_leave || 0, color: "#438CFF" },
          { label: "Absent", count: absent || 0, color: "#C7DDFF" },
        ],
      };
    } catch (error) {
      console.error("Error fetching attendance status count:", error);
      throw new Error(
        "Failed to fetch attendance status count: " + error.message
      );
    }
  }

  static async fetchEmployeeLoginDataCount() {
    try {
      const [rows] = await db.query(queries.GET_EMPLOYEE_LOGIN_DATA_COUNT);
      return rows;
    } catch (error) {
      console.error("Database Query Error:", error);
      throw new Error("Failed to fetch login data count");
    }
  }

  static async fetchSalaryRanges() {
    try {
      const [rows] = await db.execute(queries.GET_EMPLOYEE_SALARY_RANGE);

      return {
        labels: rows.map((row) => row.salary_range),
        datasets: [
          {
            label: "Salaries",
            data: rows.map((row) => row.count),
            backgroundColor: [
              "#82DAFE",
              "#00A1DA",
              "#0078CF",
              "#012FBA",
              "#011F7B",
            ],
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
        total_previous_month_expenses:
          rows[0]?.total_previous_month_expenses || 0,
        total_previous_month_salary: rows[0]?.total_previous_month_salary || 0,
      };
    } catch (error) {
      console.error("Error fetching employee payroll data:", error);
      throw new Error("Failed to fetch payroll data");
    }
  }
}

module.exports = LoginService;
