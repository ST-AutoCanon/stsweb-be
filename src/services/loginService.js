// // /**
// //  * Service layer to handle login and dashboard data retrieval.
// //  * 
// //  * @module loginService
// //  */

// // const db = require("../config");
// // const queries = require("../constants/loginQueries");
// // const moment = require("moment");

// // class LoginService {
// //   /**
// //    * Fetch user details by email.
// //    * 
// //    * @param {string} email - User email.
// //    * @returns {Promise<Object>} User details from the database.
// //    */
// //   static async fetchUserByEmail(email) {
// //     const [rows] = await db.execute(queries.GET_USER_BY_EMAIL, [email]);
// //     return rows[0];
// //   }

// //   /**
// //    * Fetch admin dashboard data.
// //    * 
// //    * @param {number} employee_id - ID of the admin.
// //    * @returns {Promise<Object>} Dashboard statistics for admin users.
// //    */
// //   static async fetchAdminDashboard(employee_id) {
// //     // Fetch admin personal details
// //     const [adminDetails] = await db.execute(queries.GET_ADMIN_DETAILS, [employee_id]);

// //     if (!adminDetails.length) {
// //       throw new Error("Admin details not found.");
// //     }

// //     const admin = adminDetails[0];

// //     // Fetch admin dashboard stats
// //     const [dashboardStats] = await db.execute(queries.GET_ADMIN_DASHBOARD);

// //     // Fetch salary distribution
// //     const [salaryDistribution] = await db.execute(queries.GET_SALARY_DISTRIBUTION);

// //     // Fetch department distribution
// //     const [departmentDistribution] = await db.execute(queries.GET_DEPARTMENT_DISTRIBUTION);

// //     // Fetch login timer graph for daily logins
// //     const today = moment().startOf("day");
// //     const periods = {
// //       daily: { start: today, end: moment(today).endOf("day") },
// //       weekly: { start: moment(today).subtract(6, "days"), end: moment() },
// //       monthly: { start: moment(today).subtract(29, "days"), end: moment() },
// //     };

// //     const { start, end } = periods["daily"];

// //     // Fetch login data directly from the database for the defined time range
// //     const [loginData] = await db.execute(queries.GET_HOURLY_LOGIN_DATA, [start.toISOString(), end.toISOString()]);

// //     // Fetch project data
// //     const [currentProjects] = await db.execute(queries.GET_CURRENT_PROJECTS);
// //     const [upcomingProjects] = await db.execute(queries.GET_UPCOMING_PROJECTS);
// //     const [previousProjects] = await db.execute(queries.GET_PREVIOUS_PROJECTS);

// //     // Fetch financial statistics
// //     const [financialStats] = await db.execute(queries.GET_FINANCIAL_STATS);

// //     // In your fetchAdminDashboard method (LoginService)
// // return {
// //   name: admin.name,
// //   employee_id: admin.employee_id,
// //   email: admin.email,
// //   gender: admin.gender,
// //   total_employees: dashboardStats[0]?.total_employees || 0,  // Default to 0 if not available
// //   attendance: {
// //     present: dashboardStats[0]?.present || 0,  // Default to 0 if null
// //     sick_leave: dashboardStats[0]?.sick_leave || 0,  // Default to 0 if null
// //     other_absence: dashboardStats[0]?.other_absence || 0,  // Default to 0 if null
// //   },
// //   salary_distribution: salaryDistribution[0] || { average_salary: 0, min_salary: 0, max_salary: 0 }, // Default salary if null
// //   department_distribution: departmentDistribution || [],  // Empty array if no department distribution
// //   login_timer_graph: loginData || [],  // Empty array if no login data
// //   financial_stats: {
// //     previous_month_expenses: financialStats[0]?.previous_month_expenses || 0,
// //     previous_month_salary: financialStats[0]?.previous_month_salary || 0,
// //     previous_month_credit: financialStats[0]?.previous_month_credit || 0,
// //   },
// //   projects: {
// //     current: currentProjects.map(project => ({
// //       project_name: project.project_name,
// //       job_type: project.job_type,
// //       department: project.department,
// //       start_date: project.start_date,
// //       end_date: project.end_date,
// //       comments: project.comments,
// //     })) || [],  // Empty array if no projects
// //     upcoming: upcomingProjects || [],
// //     previous: previousProjects || [],
// //   },
// // };

// //   }

// //   /**
// //    * Fetch employee dashboard data.
// //    * 
// //    * @param {string} employeeId - Employee ID to fetch data for.
// //    * @returns {Promise<Object>} Employee dashboard data.
// //    */
// //   static async fetchEmployeeDashboard(employeeId) {
// //     try {
// //       const [rows] = await db.execute(queries.GET_EMPLOYEE_DASHBOARD, [employeeId, employeeId, employeeId, employeeId, employeeId]);

// //       if (rows.length === 0) {
// //         throw new Error("Employee not found");
// //       }

// //       const employee = rows[0];

// //       return {
// //         name: employee.name,
// //         employeeId: employee.employee_id,
// //         position: employee.position,
// //         gender: employee.gender,
// //         department_id: employee.department_id,
// //         salary: employee.salary,
// //         attendance_count: employee.attendance_count,
// //         leave_queries_count: employee.leave_queries_count,
// //         attendance_breakdown: {
// //           present: employee.attendance_count,
// //           sick_leave: employee.sick_leave,
// //           other_absence: employee.other_absence
// //         }
// //       };
// //     } catch (err) {
// //       throw new Error("Error fetching employee dashboard data");
// //     }
// //   }

// // /**
// //    * Fetch sidebar menu items based on role.
// //    * 
// //    * @param {string} role - User role.
// //    * @returns {Promise<Array>} List of sidebar menu items.
// //    */
// // static async fetchSidebarMenu(role) {
// //   const [menuItems] = await db.execute(queries.GET_SIDEBAR_MENU, [role]);
// //   return menuItems;
// // }
// // }



// // module.exports = LoginService;


// /**
//  * Service layer to handle login and dashboard data retrieval.
//  * 
//  * @module loginService
//  */

// const db = require("../config");
// const queries = require("../constants/loginQueries");
// const moment = require("moment");

// class LoginService {
//   /**
//    * Fetch user details by email.
//    * 
//    * @param {string} email - User email.
//    * @returns {Promise<Object>} User details from the database.
//    */
//   static async fetchUserByEmail(email) {
//     const [rows] = await db.execute(queries.GET_USER_BY_EMAIL, [email]);
//     return rows[0];
//   }

//   /**
//    * Fetch admin dashboard data.
//    * 
//    * @param {number} employee_id - ID of the admin.
//    * @returns {Promise<Object>} Dashboard statistics for admin users.
//    */
//   static async fetchAdminDashboard(employee_id) {
//     // Fetch admin personal details
//     const [adminDetails] = await db.execute(queries.GET_ADMIN_DETAILS, [employee_id]);

//     if (!adminDetails.length) {
//       throw new Error("Admin details not found.");
//     }

//     const admin = adminDetails[0];

//     // Fetch admin dashboard stats
//     const [dashboardStats] = await db.execute(queries.GET_ADMIN_DASHBOARD);

//     // Fetch salary distribution
//     const [salaryDistribution] = await db.execute(queries.GET_SALARY_DISTRIBUTION);

//     // Fetch department distribution
//     const [departmentDistribution] = await db.execute(queries.GET_DEPARTMENT_DISTRIBUTION);

//     // Fetch login timer graph for daily logins
//     const today = moment().startOf("day");
//     const periods = {
//       daily: { start: today, end: moment(today).endOf("day") },
//       weekly: { start: moment(today).subtract(6, "days"), end: moment() },
//       monthly: { start: moment(today).subtract(29, "days"), end: moment() },
//     };

//     const { start, end } = periods["daily"];

//     // Fetch login data directly from the database for the defined time range
//     const [loginData] = await db.execute(queries.GET_HOURLY_LOGIN_DATA, [start.toISOString(), end.toISOString()]);

//     // Fetch project data
//     const [currentProjects] = await db.execute(queries.GET_CURRENT_PROJECTS);
//     const [upcomingProjects] = await db.execute(queries.GET_UPCOMING_PROJECTS);
//     const [previousProjects] = await db.execute(queries.GET_PREVIOUS_PROJECTS);

//     // Fetch financial statistics
//     const [financialStats] = await db.execute(queries.GET_FINANCIAL_STATS);

//     // Return data to be used in the admin dashboard
//     return {
//       name: admin.name,
//       employee_id: admin.employee_id,
//       email: admin.email,
//       gender: admin.gender,
//       total_employees: dashboardStats[0]?.total_employees || 0,  // Default to 0 if not available
//       attendance: {
//         present: dashboardStats[0]?.present || 0,  // Default to 0 if null
//         sick_leave: dashboardStats[0]?.sick_leave || 0,  // Default to 0 if null
//         other_absence: dashboardStats[0]?.other_absence || 0,  // Default to 0 if null
//       },
//       salary_distribution: salaryDistribution[0] || { average_salary: 0, min_salary: 0, max_salary: 0 }, // Default salary if null
//       department_distribution: departmentDistribution || [],  // Empty array if no department distribution
//       login_timer_graph: loginData || [],  // Empty array if no login data
//       financial_stats: {
//         previous_month_expenses: financialStats[0]?.previous_month_expenses || 0,
//         previous_month_salary: financialStats[0]?.previous_month_salary || 0,
//         previous_month_credit: financialStats[0]?.previous_month_credit || 0,
//       },
//       projects: {
//         current: currentProjects.map(project => ({
//           project_name: project.project_name,
//           job_type: project.job_type,
//           department: project.department,
//           start_date: project.start_date,
//           end_date: project.end_date,
//           comments: project.comments,
//         })) || [],  // Empty array if no projects
//         upcoming: upcomingProjects || [],
//         previous: previousProjects || [],
//       },
//     };
//   }

//   /**
//    * Fetch employee dashboard data.
//    * 
//    * @param {string} employeeId - Employee ID to fetch data for.
//    * @returns {Promise<Object>} Employee dashboard data.
//    */
//   static async fetchEmployeeDashboard(employeeId) {
//     try {
//       const [rows] = await db.execute(queries.GET_EMPLOYEE_DASHBOARD, [employeeId, employeeId, employeeId, employeeId, employeeId]);

//       if (rows.length === 0) {
//         throw new Error("Employee not found");
//       }

//       const employee = rows[0];

//       return {
//         name: employee.name,
//         employeeId: employee.employee_id,
//         position: employee.position,
//         gender: employee.gender,
//         department_id: employee.department_id,
//         salary: employee.salary,
//         attendance_count: employee.attendance_count,
//         leave_queries_count: employee.leave_queries_count,
//         attendance_breakdown: {
//           present: employee.attendance_count,
//           sick_leave: employee.sick_leave,
//           other_absence: employee.other_absence
//         }
//       };
//     } catch (err) {
//       throw new Error("Error fetching employee dashboard data");
//     }
//   }

//   /**
//    * Fetch sidebar menu items based on role.
//    * 
//    * @param {string} role - User role.
//    * @returns {Promise<Array>} List of sidebar menu items.
//    */
//   static async fetchSidebarMenu(role) {
//     const [menuItems] = await db.execute(queries.GET_SIDEBAR_MENU, [role]);
//     return menuItems;
//   }

//   /**
//    * Fetch the attendance status count (Present, Sick Leave, Absent).
//    * 
//    * @returns {Promise<Object>} Attendance status count.
//    */
//   static async getAttendanceStatusCount() {
//     try {
//       const query = queries.GET_ATTENDANCE_STATUS_COUNT;
//       const [rows] = await db.execute(query);

//       // Assuming the query returns counts for Present, Sick Leave, and Absent
//       const attendanceCount = {
//         totalEmployees: rows.length,
//         categories: [
//           {
//             label: "Present",
//             count: rows.filter(item => item.status === 'Present').length,
//             color: "#004DC6"
//           },
//           {
//             label: "Sick Leave",
//             count: rows.filter(item => item.status === 'Sick Leave').length,
//             color: "#438CFF"
//           },
//           {
//             label: "Other Absence",
//             count: rows.filter(item => item.status === 'Absent').length,
//             color: "#C7DDFF"
//           }
//         ]
//       };

//       return attendanceCount;
//     } catch (err) {
//       console.error("Error fetching attendance status count:", err.message);
//       throw new Error("Failed to fetch attendance status count.");
//     }
//   }

//   /**
//    * Fetch employee login data count for daily, weekly, and monthly intervals.
//    * 
//    * @returns {Promise<Object>} Login data statistics.
//    */
//   static async fetchEmployeeLoginDataCount() {
//     try {
//       const [rows] = await db.execute(queries.GET_EMPLOYEE_LOGIN_DATA_COUNT);

//       return rows.map(row => ({
//         label: row.label,
//         daily: row.daily,
//         weekly: row.weekly,
//         monthly: row.monthly
//       }));
//     } catch (err) {
//       console.error("Error fetching login data count:", err.message);
//       throw new Error("Failed to fetch employee login data count.");
//     }
//   }



//   static async fetchSalaryRanges() {
//     try {
//       const [rows] = await db.execute(queries.GET_EMPLOYEE_SALARY_RANGE);
//       return {
//         labels: rows.map(row => row.label),
//         datasets: [

//           {
//             label: "Salaries",
//             data: rows.map(row => row.data),
//             backgroundColor: ["#82DAFE", "#00A1DA", "#0078CF", "#012FBA", "#011F7B"],
//           },
//         ],
//       };
//     } catch (err) {
//       console.error("Error fetching salary ranges:", err.message);
//       throw new Error("Failed to fetch salary ranges.");
//     }
//   }

// /**
//  * Fetch employee count by department.
//  * 
//  * @returns {Promise<Object[]>} List of departments with male and female employee count.
//  */
//   static async getEmployeeCountByDepartment () {
//   try {

//     const query = queries.GET_EMPLOYEE_COUNT_BY_DEPARTMENT;

//     const [rows] = await db.execute(query);
//     console.log("rows",rows);
//     return rows;
//   } catch (err) {
//     console.error("Error fetching employee count by department:", err.message);
//     throw new Error("Failed to fetch employee count by department.");
//   }
// };


// }

// module.exports = LoginService;


// const db = require("../config");
// const queries = require("../constants/loginQueries");
// const moment = require("moment");

// class LoginService {
//   /**
//    * Fetch user details by email.
//    * @param {string} email - User email.
//    * @returns {Promise<Object>} User details from the database.
//    */
//   static async fetchUserByEmail(email) {
//     const [rows] = await db.execute(queries.GET_USER_BY_EMAIL, [email]);
//     return rows[0];
//   }

//   /**
//    * Fetch admin dashboard data.
//    * @param {number} employee_id - ID of the admin.
//    * @returns {Promise<Object>} Dashboard statistics for admin users.
//    */
//   static async fetchAdminDashboard(employee_id) {
//     const [adminDetails] = await db.execute(queries.GET_ADMIN_DETAILS, [employee_id]);
//     if (!adminDetails.length) throw new Error("Admin details not found.");
//     const admin = adminDetails[0];

//     const [dashboardStats] = await db.execute(queries.GET_ADMIN_DASHBOARD);
//     const [salaryDistribution] = await db.execute(queries.GET_SALARY_DISTRIBUTION);
//     const [departmentDistribution] = await db.execute(queries.GET_DEPARTMENT_DISTRIBUTION);
//     const today = moment().startOf("day");
//     const { start, end } = { daily: { start: today, end: moment(today).endOf("day") } }["daily"];
//     const [loginData] = await db.execute(queries.GET_HOURLY_LOGIN_DATA, [start.toISOString(), end.toISOString()]);
//     const [currentProjects] = await db.execute(queries.GET_CURRENT_PROJECTS);
//     const [upcomingProjects] = await db.execute(queries.GET_UPCOMING_PROJECTS);
//     const [previousProjects] = await db.execute(queries.GET_PREVIOUS_PROJECTS);
//     const [financialStats] = await db.execute(queries.GET_FINANCIAL_STATS);

//     return {
//       name: admin.name,
//       employee_id: admin.employee_id,
//       email: admin.email,
//       gender: admin.gender,
//       total_employees: dashboardStats[0]?.total_employees || 0,
//       attendance: {
//         present: dashboardStats[0]?.present || 0,
//         sick_leave: dashboardStats[0]?.sick_leave || 0,
//         other_absence: dashboardStats[0]?.other_absence || 0,
//       },
//       salary_distribution: salaryDistribution[0] || {},
//       department_distribution: departmentDistribution || [],
//       login_timer_graph: loginData || [],
//       financial_stats: financialStats[0] || {},
//       projects: {
//         current: currentProjects.map(({ project_name, job_type, department, start_date, end_date, comments }) => ({
//           project_name, job_type, department, start_date, end_date, comments
//         })) || [],
//         upcoming: upcomingProjects || [],
//         previous: previousProjects || [],
//       },
//     };
//   }

//   /**
//    * Fetch employee dashboard data.
//    * @param {string} employeeId - Employee ID to fetch data for.
//    * @returns {Promise<Object>} Employee dashboard data.
//    */
//   static async fetchEmployeeDashboard(employeeId) {
//     const [rows] = await db.execute(queries.GET_EMPLOYEE_DASHBOARD, Array(5).fill(employeeId));
//     if (!rows.length) throw new Error("Employee not found");
//     const employee = rows[0];
//     return {
//       name: employee.name,
//       employeeId: employee.employee_id,
//       position: employee.position,
//       gender: employee.gender,
//       department_id: employee.department_id,
//       salary: employee.salary,
//       attendance_count: employee.attendance_count,
//       leave_queries_count: employee.leave_queries_count,
//       attendance_breakdown: {
//         present: employee.attendance_count,
//         sick_leave: employee.sick_leave,
//         other_absence: employee.other_absence,
//       },
//     };
//   }

//   /**
//    * Fetch sidebar menu items based on role.
//    * @param {string} role - User role.
//    * @returns {Promise<Array>} List of sidebar menu items.
//    */
//   static async fetchSidebarMenu(role) {
//     const [menuItems] = await db.execute(queries.GET_SIDEBAR_MENU, [role]);
//     return menuItems;
//   }

//   /**
//    * Fetch attendance status count.
//    * @returns {Promise<Object>} Attendance status count.
//    */
//   static async getAttendanceStatusCount() {
//     const [rows] = await db.execute(queries.GET_ATTENDANCE_STATUS_COUNT);
//     return {
//       totalEmployees: rows.length,
//       categories: ["Present", "Sick Leave", "Absent"].map(label => ({
//         label,
//         count: rows.filter(item => item.status === label).length,
//         color: { Present: "#004DC6", "Sick Leave": "#438CFF", Absent: "#C7DDFF" }[label],
//       })),
//     };
//   }

//   /**
//    * Fetch employee login data count.
//    * @returns {Promise<Object>} Login data statistics.
//    */
//   static async fetchEmployeeLoginDataCount() {
//     const [rows] = await db.execute(queries.GET_EMPLOYEE_LOGIN_DATA_COUNT);
//     return rows.map(({ label, daily, weekly, monthly }) => ({ label, daily, weekly, monthly }));
//   }

//   /**
//    * Fetch salary ranges.
//    * @returns {Promise<Object>} Salary range distribution.
//    */
//   // static async fetchSalaryRanges() {
//   //   const [rows] = await db.execute(queries.GET_EMPLOYEE_SALARY_RANGE);
//   //   return {
//   //     labels: rows.map(({ label }) => label),
//   //     datasets: [{
//   //       label: "Salaries",
//   //       data: rows.map(({ data }) => data),
//   //       backgroundColor: ["#82DAFE", "#00A1DA", "#0078CF", "#012FBA", "#011F7B"],
//   //     }],
//   //   };
//   // }

//   /**
//    * Fetch employee count by department.
//    * @returns {Promise<Object[]>} List of departments with male and female employee count.
//    */
//   static async getEmployeeCountByDepartment() {
//     const [rows] = await db.execute(queries.GET_EMPLOYEE_BY_DEPARTMENT);
//     return rows;
//   }
// }

// module.exports = LoginService;



// const db = require("../config");
// const queries = require("../constants/loginQueries");
// const moment = require("moment");

// class LoginService {
//   /**
//    * Fetch user details by email.
//    * @param {string} email - User email.
//    * @returns {Promise<Object>} User details from the database.
//    */
//   static async fetchUserByEmail(email) {
//     const [rows] = await db.execute(queries.GET_USER_BY_EMAIL, [email]);
//     return rows[0];
//   }

//   /**
//    * Fetch admin dashboard data.
//    * @param {number} employee_id - ID of the admin.
//    * @returns {Promise<Object>} Dashboard statistics for admin users.
//    */
//   static async fetchAdminDashboard(employee_id) {
//     const [adminDetails] = await db.execute(queries.GET_ADMIN_DETAILS, [employee_id]);
//     if (!adminDetails.length) throw new Error("Admin details not found.");
//     const admin = adminDetails[0];

//     const [dashboardStats] = await db.execute(queries.GET_ADMIN_DASHBOARD);
//     const [salaryDistribution] = await db.execute(queries.GET_SALARY_DISTRIBUTION);
//     const [departmentDistribution] = await db.execute(queries.GET_DEPARTMENT_DISTRIBUTION);
//     const today = moment().startOf("day");
//     const { start, end } = { daily: { start: today, end: moment(today).endOf("day") } }["daily"];
//     const [loginData] = await db.execute(queries.GET_HOURLY_LOGIN_DATA, [start.toISOString(), end.toISOString()]);
//     const [currentProjects] = await db.execute(queries.GET_CURRENT_PROJECTS);
//     const [upcomingProjects] = await db.execute(queries.GET_UPCOMING_PROJECTS);
//     const [previousProjects] = await db.execute(queries.GET_PREVIOUS_PROJECTS);
//     const [financialStats] = await db.execute(queries.GET_FINANCIAL_STATS);

//     return {
//       name: admin.name,
//       employee_id: admin.employee_id,
//       email: admin.email,
//       gender: admin.gender,
//       total_employees: dashboardStats[0]?.total_employees || 0,
//       attendance: {
//         present: dashboardStats[0]?.present || 0,
//         sick_leave: dashboardStats[0]?.sick_leave || 0,
//         other_absence: dashboardStats[0]?.other_absence || 0,
//       },
//       salary_distribution: salaryDistribution[0] || {},
//       department_distribution: departmentDistribution || [],
//       login_timer_graph: loginData || [],
//       financial_stats: financialStats[0] || {},
//       projects: {
//         current: currentProjects.map(({ project_name, job_type, department, start_date, end_date, comments }) => ({
//           project_name, job_type, department, start_date, end_date, comments
//         })) || [],
//         upcoming: upcomingProjects || [],
//         previous: previousProjects || [],
//       },
//     };
//   }

//   /**
//    * Fetch employee dashboard data.
//    * @param {string} employeeId - Employee ID to fetch data for.
//    * @returns {Promise<Object>} Employee dashboard data.
//    */
//   static async fetchEmployeeDashboard(employeeId) {
//     const [rows] = await db.execute(queries.GET_EMPLOYEE_DASHBOARD, Array(5).fill(employeeId));
//     if (!rows.length) throw new Error("Employee not found");
//     const employee = rows[0];
//     return {
//       name: employee.name,
//       employeeId: employee.employee_id,
//       position: employee.position,
//       gender: employee.gender,
//       department_id: employee.department_id,
//       salary: employee.salary,
//       attendance_count: employee.attendance_count,
//       leave_queries_count: employee.leave_queries_count,
//       attendance_breakdown: {
//         present: employee.attendance_count,
//         sick_leave: employee.sick_leave,
//         other_absence: employee.other_absence,
//       },
//     };
//   }

//   /**
//    * Fetch employee payroll data (previous month credit, expenses, and salary).
//    * @param {string} employeeId - Employee ID to fetch payroll data for.
//    * @returns {Promise<Object>} Employee payroll data.
//    */
  
// /**
//    * Fetch sidebar menu items based on role.
//    * @param {string} role - User role.
//    * @returns {Promise<Array>} List of sidebar menu items.
//    */
//   static async fetchSidebarMenu(role) {
//     const [menuItems] = await db.execute(queries.GET_SIDEBAR_MENU, [role]);
//     return menuItems;
//   }

//   /**
//    * Fetch attendance status count.
//    * @returns {Promise<Object>} Attendance status count.
//    */
//   static async getAttendanceStatusCount() {
//     const [rows] = await db.execute(queries.GET_ATTENDANCE_STATUS_COUNT);
//     return {
//       totalEmployees: rows.length,
//       categories: ["Present", "Sick Leave", "Absent"].map(label => ({
//         label,
//         count: rows.filter(item => item.status === label).length,
//         color: { Present: "#004DC6", "Sick Leave": "#438CFF", Absent: "#C7DDFF" }[label],
//       })),
//     };
//   }

//   /**
//    * Fetch employee login data count.
//    * @returns {Promise<Object>} Login data statistics.
//    */
//   static async fetchEmployeeLoginDataCount() {
//     const [rows] = await db.execute(queries.GET_EMPLOYEE_LOGIN_DATA_COUNT);
//     return rows.map(({ label, daily, weekly, monthly }) => ({ label, daily, weekly, monthly }));
//   }

//   /**
//    * Fetch salary ranges.
//    * @returns {Promise<Object>} Salary range distribution.
//    */
//   static async fetchSalaryRanges() {
//     const [rows] = await db.execute(queries.GET_EMPLOYEE_SALARY_RANGE);
//     return {
//       labels: rows.map(({ label }) => label),
//       datasets: [{
//         label: "Salaries",
//         data: rows.map(({ data }) => data),
//         backgroundColor: ["#82DAFE", "#00A1DA", "#0078CF", "#012FBA", "#011F7B"],
//       }],
//     };
//   }

//   /**
//    * Fetch employee count by department.
//    * @returns {Promise<Object[]>} List of departments with male and female employee count.
//    */
//   static async getEmployeeCountByDepartment() {
//     const [rows] = await db.execute(queries.GET_EMPLOYEE_BY_DEPARTMENT);
//     return rows;
//   }


//   static async getEmployeePayrollData() {
//     try {
//       const [rows] = await db.execute(queries.GET_EMPLOYEE_PAYROLL);
//       return {
//         total_previous_month_credit: rows[0]?.total_previous_month_credit || 0,
//         total_previous_month_expenses: rows[0]?.total_previous_month_expenses || 0,
//         total_previous_month_salary: rows[0]?.total_previous_month_salary || 0,
//       };
//     } catch (error) {
//       console.error("Error fetching employee payroll data:", error);
//       throw new Error("Failed to fetch payroll data");
//     }
//   }

// }

// module.exports = LoginService;

const db = require("../config");
const queries = require("../constants/loginQueries");
const moment = require("moment");

class LoginService {
  static async fetchUserByEmail(email) {
    try {
      const [rows] = await db.execute(queries.GET_USER_BY_EMAIL, [email]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching user by email:", error);
      throw new Error("Failed to fetch user details");
    }
  }

  static async fetchSidebarMenu(role) {
    const [menuItems] = await db.execute(queries.GET_SIDEBAR_MENU, [role]);
    return menuItems;
  }

  static async fetchAdminDashboard(employee_id) {
    try {
      const [adminDetails] = await db.execute(queries.GET_ADMIN_DETAILS, [employee_id]);
      if (!adminDetails.length) throw new Error("Admin details not found.");
      
      const admin = adminDetails[0];
      const [dashboardStats] = await db.execute(queries.GET_ADMIN_DASHBOARD);
      const [salaryDistribution] = await db.execute(queries.GET_SALARY_DISTRIBUTION);
      const [departmentDistribution] = await db.execute(queries.GET_DEPARTMENT_DISTRIBUTION);
      const today = moment().startOf("day");
      const { start, end } = { daily: { start: today, end: moment(today).endOf("day") } }["daily"];
      const [loginData] = await db.execute(queries.GET_HOURLY_LOGIN_DATA, [start.toISOString(), end.toISOString()]);
      const [currentProjects] = await db.execute(queries.GET_CURRENT_PROJECTS);
      const [upcomingProjects] = await db.execute(queries.GET_UPCOMING_PROJECTS);
      const [previousProjects] = await db.execute(queries.GET_PREVIOUS_PROJECTS);
      const [financialStats] = await db.execute(queries.GET_FINANCIAL_STATS);

      return {
        name: admin.name,
        employee_id: admin.employee_id,
        email: admin.email,
        gender: admin.gender,
        total_employees: dashboardStats[0]?.total_employees || 0,
        attendance: {
          present: dashboardStats[0]?.present || 0,
          sick_leave: dashboardStats[0]?.sick_leave || 0,
          other_absence: dashboardStats[0]?.other_absence || 0,
        },
        salary_distribution: salaryDistribution[0] || {},
        department_distribution: departmentDistribution || [],
        login_timer_graph: loginData || [],
        financial_stats: financialStats[0] || {},
        projects: {
          current: currentProjects.map(({ project_name, job_type, department, start_date, end_date, comments }) => ({
            project_name, job_type, department, start_date, end_date, comments
          })) || [],
          upcoming: upcomingProjects || [],
          previous: previousProjects || [],
        },
      };
    } catch (error) {
      console.error("Error fetching admin dashboard:", error);
      throw new Error("Failed to fetch admin dashboard data");
    }
  }

  static async fetchEmployeeDashboard(employeeId) {
    try {
      const [rows] = await db.execute(queries.GET_EMPLOYEE_DASHBOARD, Array(5).fill(employeeId));
      if (!rows.length) throw new Error("Employee not found");
      
      const employee = rows[0];
      return {
        name: employee.name,
        employeeId: employee.employee_id,
        position: employee.position,
        gender: employee.gender,
        department_id: employee.department_id,
        salary: employee.salary,
        attendance_count: employee.attendance_count,
        leave_queries_count: employee.leave_queries_count,
        attendance_breakdown: {
          present: employee.attendance_count,
          sick_leave: employee.sick_leave,
          other_absence: employee.other_absence,
        },
      };
    } catch (error) {
      console.error("Error fetching employee dashboard:", error);
      throw new Error("Failed to fetch employee dashboard data");
    }
  }

  // static async getAttendanceStatusCount() {
  //   try {
  //     console.log("Executing SQL Query: ", queries.GET_ATTENDANCE_STATUS_COUNT);
  //     const [rows] = await db.execute(queries.GET_ATTENDANCE_STATUS_COUNT);
      
  //     console.log("Query Result:", rows);
      
  //     if (!rows || rows.length === 0 || !rows[0]?.categories) {
  //       return { totalEmployees: 0, categories: [] };
  //     }
      
  //     console.log("Categories before parsing:", rows[0].categories);
  //     const categories = typeof rows[0].categories === 'string' 
  //       ? JSON.parse(rows[0].categories) 
  //       : rows[0].categories;

  //     return {
  //       totalEmployees: rows[0]?.totalEmployees || 0,
  //       categories: categories || [],
  //     };
  //   } catch (error) {
  //     console.error("Error fetching attendance status count:", error);
  //     throw new Error("Failed to fetch attendance status count: " + error.message);
  //   }
  // }


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
