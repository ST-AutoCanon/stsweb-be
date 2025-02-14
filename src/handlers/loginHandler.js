// const bcrypt = require('bcrypt');
// const LoginService = require("../services/loginService");
// const ErrorHandler = require("../utils/errorHandler");
// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// dotenv.config();

// class LoginHandler {
//   static async login(req, res) {
//     try {
//       const { email, password } = req.body;

//       // Fetch user by email
//       const user = await LoginService.fetchUserByEmail(email);
//       if (!user) {
//         return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
//       }

//       // Validate password
//       const isPasswordValid = await bcrypt.compare(password, user.password);
//       if (!isPasswordValid) {
//         return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
//       }

//       // Generate JWT token
//       const token = jwt.sign(
//         { userId: user.employee_id, role: user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: '20m' }
//       );

//       // Fetch dashboard data based on role
//       const roleToDashboardFunction = {
//         Admin: LoginService.fetchAdminDashboard,
//         Employee: LoginService.fetchEmployeeDashboard,
//       };
//       const dashboardFunction = roleToDashboardFunction[user.role] || LoginService.fetchEmployeeDashboard;
//       const dashboard = await dashboardFunction(user.employee_id);

//       // Fetch sidebar menu based on role
//       const sidebarMenu = await LoginService.fetchSidebarMenu(user.role);

//       // Respond with token, role, dashboard, and sidebar menu
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: {
//           token,
//           role: user.role,
//           name: user.name,
//           gender: user.gender,
//           dashboard,
//           sidebarMenu, // Include sidebar menu data
//         },
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get the count of attendance status (Present, Sick Leave, Absent).
//    */
//   static async getAttendanceStatusCount(req, res) {
//     try {
//       const attendanceCount = await LoginService.getAttendanceStatusCount();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: attendanceCount
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get the login data count (Daily, Weekly, Monthly).
//    */
//   static async getEmployeeLoginDataCount(req, res) {
//     try {
//       const loginDataCount = await LoginService.fetchEmployeeLoginDataCount();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: loginDataCount
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get salary ranges.
//    */
//   static async getSalaryRanges(req, res) {
//     try {
//       const salaryRanges = await LoginService.fetchSalaryRanges();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: salaryRanges
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

  
// }

// module.exports = LoginHandler;




// const bcrypt = require('bcrypt');
// const LoginService = require("../services/loginService");
// const ErrorHandler = require("../utils/errorHandler");
// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// dotenv.config();

// class LoginHandler {
//   static async login(req, res) {
//     try {
//       const { email, password } = req.body;

//       // Fetch user by email
//       const user = await LoginService.fetchUserByEmail(email);
//       if (!user) {
//         return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
//       }

//       // Validate password
//       const isPasswordValid = await bcrypt.compare(password, user.password);
//       if (!isPasswordValid) {
//         return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
//       }

//       // Generate JWT token
//       const token = jwt.sign(
//         { userId: user.employee_id, role: user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: '20m' }
//       );

//       // Fetch dashboard data based on role
//       const roleToDashboardFunction = {
//         Admin: LoginService.fetchAdminDashboard,
//         Employee: LoginService.fetchEmployeeDashboard,
//       };
//       const dashboardFunction = roleToDashboardFunction[user.role] || LoginService.fetchEmployeeDashboard;
//       const dashboard = await dashboardFunction(user.employee_id);

//       // Fetch sidebar menu based on role
//       const sidebarMenu = await LoginService.fetchSidebarMenu(user.role);

//       // Respond with token, role, dashboard, and sidebar menu
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: {
//           token,
//           role: user.role,
//           name: user.name,
//           gender: user.gender,
//           dashboard,
//           sidebarMenu, // Include sidebar menu data
//         },
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get the count of attendance status (Present, Sick Leave, Absent).
//    */
//   static async getAttendanceStatusCount(req, res) {
//     try {
//       const attendanceCount = await LoginService.getAttendanceStatusCount();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: attendanceCount
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get the login data count (Daily, Weekly, Monthly).
//    */
//   static async getEmployeeLoginDataCount(req, res) {
//     try {
//       const loginDataCount = await LoginService.fetchEmployeeLoginDataCount();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: loginDataCount
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get salary ranges.
//    */
//   static async getSalaryRanges(req, res) {
//     try {
//       const salaryRanges = await LoginService.fetchSalaryRanges();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: salaryRanges
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get employee count by department.
//    */
//   static async getEmployeeCountByDepartment(req, res) {
//     try {
//       const employeeCountByDepartment = await LoginService.getEmployeeCountByDepartment();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: employeeCountByDepartment
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }
// }

// module.exports = LoginHandler;

// const bcrypt = require('bcrypt');
// const LoginService = require("../services/loginService");
// const ErrorHandler = require("../utils/errorHandler");
// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// dotenv.config();

// class LoginHandler {
//   static async login(req, res) {
//     try {
//       const { email, password } = req.body;

//       // Fetch user by email
//       const user = await LoginService.fetchUserByEmail(email);
//       if (!user) {
//         return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
//       }

//       // Validate password
//       const isPasswordValid = await bcrypt.compare(password, user.password);
//       if (!isPasswordValid) {
//         return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
//       }

//       // Generate JWT token
//       const token = jwt.sign(
//         { userId: user.employee_id, role: user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: '20m' }
//       );

//       // Fetch dashboard data based on role
//       const roleToDashboardFunction = {
//         Admin: LoginService.fetchAdminDashboard,
//         Employee: LoginService.fetchEmployeeDashboard,
//       };
//       const dashboardFunction = roleToDashboardFunction[user.role] || LoginService.fetchEmployeeDashboard;
//       const dashboard = await dashboardFunction(user.employee_id);

//       // Fetch sidebar menu based on role
//       const sidebarMenu = await LoginService.fetchSidebarMenu(user.role);

//       // Fetch employee payroll data
//       const payrollData = await LoginService.fetchEmployeePayrollData(user.employee_id);
//       const attendanceCount = await LoginService.getAttendanceStatusCount(); // Attendance Status
//       const loginDataCount = await LoginService.fetchEmployeeLoginDataCount(); // Login Data Count
//       const employeeCountByDepartment = await LoginService.getEmployeeCountByDepartment(); // Employee Count


//       // Respond with token, role, dashboard, sidebar menu, and payroll data
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: {
//           token,
//           role: user.role,
//           name: user.name,
//           gender: user.gender,
//           dashboard,
//           sidebarMenu, // Include sidebar menu data
//           payrollData, // Include payroll data
//           attendanceCount, // Include attendance count
//           loginDataCount,  // Include login data count
//           employeeCountByDepartment, // Include employee count by department
      
//         },
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get the count of attendance status (Present, Sick Leave, Absent).
//    */
//   static async getAttendanceStatusCount(req, res) {
//     try {
//       const attendanceCount = await LoginService.getAttendanceStatusCount();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: attendanceCount
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get the login data count (Daily, Weekly, Monthly).
//    */
//   static async getEmployeeLoginDataCount(req, res) {
//     try {
//       const loginDataCount = await LoginService.fetchEmployeeLoginDataCount();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: loginDataCount
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }
//   static async getEmployeeLoginDataCount(req, res) {
//     try {
//       const loginDataCount = await LoginService.fetchEmployeeLoginDataCount();
  
//       if (!loginDataCount.length) {
//         return res.status(404).json(ErrorHandler.generateErrorResponse(404, "No login data found"));
//       }
  
//       // Ensure response structure matches frontend expectations
//       const labels = loginDataCount.map(item => item.label);
//       const daily = loginDataCount.map(item => item.daily);
//       const weekly = loginDataCount.map(item => item.weekly);
//       const monthly = loginDataCount.map(item => item.monthly);
  
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         data: { labels, daily, weekly, monthly } // Ensure proper structure
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }
  
//   /**
//    * Handler to get salary ranges.
//    */
//   static async getSalaryRanges(req, res) {
//     try {
//       const salaryRanges = await LoginService.fetchSalaryRanges();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: salaryRanges
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get employee count by department.
//    */
//   static async getEmployeeCountByDepartment(req, res) {
//     try {
//       const employeeCountByDepartment = await LoginService.getEmployeeCountByDepartment();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: employeeCountByDepartment
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }



//   // In LoginHandler.js

// static async getEmployeePayrollData(req, res) {
//   try {
//     const { employeeId } = req.params; // Get employeeId from URL params
//     const payrollData = await LoginService.fetchEmployeePayrollData(employeeId); // Fetch payroll data using service

//     if (!payrollData) {
//       return res.status(404).json(ErrorHandler.generateErrorResponse(404, "Payroll data not found"));
//     }

//     return res.status(200).json({
//       status: "success",
//       code: 200,
//       message: payrollData,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//   }
// }

// }

// module.exports = LoginHandler;



// const bcrypt = require('bcrypt');
// const LoginService = require("../services/loginService");
// const ErrorHandler = require("../utils/errorHandler");
// const jwt = require('jsonwebtoken');
// const dotenv = require('dotenv');
// dotenv.config();

// class LoginHandler {
//   static async login(req, res) {
//     try {
//       const { email, password } = req.body;

//       // Fetch user by email
//       const user = await LoginService.fetchUserByEmail(email);
//       if (!user) {
//         return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
//       }

//       // Validate password
//       const isPasswordValid = await bcrypt.compare(password, user.password);
//       if (!isPasswordValid) {
//         return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
//       }

//       // Generate JWT token
//       const token = jwt.sign(
//         { userId: user.employee_id, role: user.role },
//         process.env.JWT_SECRET,
//         { expiresIn: '20m' }
//       );

//       // Fetch dashboard data based on role
//       const roleToDashboardFunction = {
//         Admin: LoginService.fetchAdminDashboard,
//         Employee: LoginService.fetchEmployeeDashboard,
//       };
//       const dashboardFunction = roleToDashboardFunction[user.role] || LoginService.fetchEmployeeDashboard;
//       const dashboard = await dashboardFunction(user.employee_id);

//       // Fetch sidebar menu based on role
//       const sidebarMenu = await LoginService.fetchSidebarMenu(user.role);

//       // Fetch employee payroll data
//       const payrollData = await LoginService.fetchEmployeePayrollData(user.employee_id);
//       const attendanceCount = await LoginService.getAttendanceStatusCount(); // Attendance Status
//       const loginDataCount = await LoginService.fetchEmployeeLoginDataCount(); // Login Data Count
//       const employeeCountByDepartment = await LoginService.getEmployeeCountByDepartment(); // Employee Count

//       // Respond with token, role, dashboard, sidebar menu, and payroll data
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: {
//           token,
//           role: user.role,
//           name: user.name,
//           gender: user.gender,
//           dashboard,
//           sidebarMenu, // Include sidebar menu data
//           payrollData, // Include payroll data
//           attendanceCount, // Include attendance count
//           loginDataCount,  // Include login data count
//           employeeCountByDepartment, // Include employee count by department
//         },
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get the count of attendance status (Present, Sick Leave, Absent).
//    */
//   static async getAttendanceStatusCount(req, res) {
//     try {
//       const attendanceCount = await LoginService.getAttendanceStatusCount();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: attendanceCount
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get the login data count (Daily, Weekly, Monthly).
//    */
//   static async getEmployeeLoginDataCount(req, res) {
//     try {
//       const loginDataCount = await LoginService.fetchEmployeeLoginDataCount();
  
//       if (!loginDataCount.length) {
//         return res.status(404).json(ErrorHandler.generateErrorResponse(404, "No login data found"));
//       }
  
//       // Ensure response structure matches frontend expectations
//       const labels = loginDataCount.map(item => item.label);
//       const daily = loginDataCount.map(item => item.daily);
//       const weekly = loginDataCount.map(item => item.weekly);
//       const monthly = loginDataCount.map(item => item.monthly);
  
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         data: { labels, daily, weekly, monthly } // Ensure proper structure
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get salary ranges.
//    */
//   static async getSalaryRanges(req, res) {
//     try {
//       const salaryRanges = await LoginService.fetchSalaryRanges();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: salaryRanges
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get employee count by department.
//    */
//   static async getEmployeeCountByDepartment(req, res) {
//     try {
//       const employeeCountByDepartment = await LoginService.getEmployeeCountByDepartment();
//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: employeeCountByDepartment
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }

//   /**
//    * Handler to get payroll data for an employee.
//    */
//   static async getEmployeePayrollData(req, res) {
//     try {
//       const { employeeId } = req.params; // Get employeeId from URL params
//       const payrollData = await LoginService.fetchEmployeePayrollData(employeeId); // Fetch payroll data using service

//       if (!payrollData) {
//         return res.status(404).json(ErrorHandler.generateErrorResponse(404, "Payroll data not found"));
//       }

//       return res.status(200).json({
//         status: "success",
//         code: 200,
//         message: payrollData,
//       });
//     } catch (err) {
//       console.error(err);
//       return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
//     }
//   }
// }

// module.exports = LoginHandler;




const bcrypt = require('bcrypt');
const LoginService = require("../services/loginService");
const ErrorHandler = require("../utils/errorHandler");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

class LoginHandler {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Fetch user by email
      const user = await LoginService.fetchUserByEmail(email);
      if (!user) {
        return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
      }

      // Validate password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.employee_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '20m' }
      );

      // Fetch dashboard data based on role
      const roleToDashboardFunction = {
        Admin: LoginService.fetchAdminDashboard,
        Employee: LoginService.fetchEmployeeDashboard,
      };
      const dashboardFunction = roleToDashboardFunction[user.role] || LoginService.fetchEmployeeDashboard;
      const dashboard = await dashboardFunction(user.employee_id);

      // Fetch sidebar menu based on role
      const sidebarMenu = await LoginService.fetchSidebarMenu(user.role);

      // Fetch employee payroll data
      const attendanceCount = await LoginService.getAttendanceStatusCount(); // Attendance Status
      const loginDataCount = await LoginService.fetchEmployeeLoginDataCount(); // Login Data Count
      const employeeCountByDepartment = await LoginService.getEmployeeCountByDepartment(); // Employee Count

      // Respond with token, role, dashboard, sidebar menu, and payroll data
      return res.status(200).json({
        status: "success",
        code: 200,
        message: {
          token,
          role: user.role,
          name: user.name,
          gender: user.gender,
          dashboard,
          sidebarMenu, // Include sidebar menu data
          attendanceCount, // Include attendance count
          loginDataCount,  // Include login data count
          employeeCountByDepartment, // Include employee count by department
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

  /**
   * Handler to get the count of attendance status (Present, Sick Leave, Absent).
   */
  static async getAttendanceStatusCount(req, res) {
    try {
      const attendanceData = await LoginService.getAttendanceStatusCount();
      return res.status(200).json({
        status: "success",
        code: 200,
        message: attendanceData,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }
  /**
   * Handler to get the login data count (Daily, Weekly, Monthly).
   */
  static async getEmployeeLoginDataCount(req, res) {
    try {
      const loginDataCount = await LoginService.fetchEmployeeLoginDataCount();
  
      if (!loginDataCount.length) {
        return res.status(404).json(ErrorHandler.generateErrorResponse(404, "No login data found"));
      }
  
      // Ensure response structure matches frontend expectations
      const labels = loginDataCount.map(item => item.label);
      const daily = loginDataCount.map(item => item.daily);
      const weekly = loginDataCount.map(item => item.weekly);
      const monthly = loginDataCount.map(item => item.monthly);
  
      return res.status(200).json({
        status: "success",
        code: 200,
        data: { labels, daily, weekly, monthly } // Ensure proper structure
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

  /**
   * Handler to get salary ranges.
   */
  static async getSalaryRanges(req, res) {
    try {
      const salaryRanges = await LoginService.fetchSalaryRanges();
      return res.status(200).json({
        status: "success",
        code: 200,
        message: salaryRanges
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

  /**
   * Handler to get employee count by department.
   */
  static async getEmployeeCountByDepartment(req, res) {
    try {
        const categories = await LoginService.getEmployeeCountByDepartment();

        if (!categories || categories.length === 0) {
            return res.status(404).json(ErrorHandler.generateErrorResponse(404, "No data found"));
        }

        // Calculate total employees
        const totalEmployees = categories.reduce((sum, item) => sum + item.count, 0);

        // Structure the response correctly
        return res.status(200).json({
            totalEmployees,
            categories
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
}

  /**
   * Handler to get payroll data for an employee.
   */
  static async getEmployeePayrollData(req, res) {
    try {
      const { employeeId } = req.params;
      
      // Fetch payroll data
      const payrollData = await LoginService.getEmployeePayrollData(employeeId);
      
      if (!payrollData) {
        return res.status(404).json(ErrorHandler.generateErrorResponse(404, "No payroll data found"));
      }

      return res.status(200).json({
        status: "success",
        code: 200,
        message: payrollData,
      });
    } catch (err) {
      console.error("Error fetching employee payroll data:", err);
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

  
}

module.exports = LoginHandler;
