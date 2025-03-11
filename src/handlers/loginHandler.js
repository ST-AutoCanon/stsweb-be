// LoginHandler.js
const bcrypt = require('bcrypt');
const LoginService = require("../services/loginService");
const ErrorHandler = require("../utils/errorHandler");
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
  
      // Fetch dashboard data based on role
      const roleToDashboardFunction = {
        Admin: LoginService.fetchAdminDashboard,
        Employee: LoginService.fetchEmployeeDashboard,
      };
      const dashboardFunction = roleToDashboardFunction[user.role] || LoginService.fetchEmployeeDashboard;
      const dashboard = await dashboardFunction(user.employee_id);
  
      // Fetch sidebar menu based on role
      const sidebarMenu = await LoginService.fetchSidebarMenu(user.role);
  
      const attendanceCount = await LoginService.getAttendanceStatusCount(); // Attendance Status
      const loginDataCount = await LoginService.fetchEmployeeLoginDataCount(); // Login Data Count
      const employeeCountByDepartment = await LoginService.getEmployeeCountByDepartment(); // Employee Count
  
      // Now set session variables
      req.session.lastActive = Date.now();
      console.log("User role from DB:", user.role);
      req.session.userRole = user.role;
      console.log("Session ID:", req.sessionID);
  
      // Save session then return the response
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        } else {
          console.log("Session saved with userRole:", req.session.userRole);
        }
        return res.status(200).json({
          status: "success",
          code: 200,
          message: {
            role: user.role,
            name: user.name,
            gender: user.gender,
            dashboard,
            sidebarMenu,
            attendanceCount,
            loginDataCount,
            employeeCountByDepartment,
          },
        });
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
