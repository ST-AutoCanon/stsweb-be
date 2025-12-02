const bcrypt = require("bcrypt");
const LoginService = require("../services/loginService");
const ErrorHandler = require("../utils/errorHandler");
const dotenv = require("dotenv");
dotenv.config();

class LoginHandler {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await LoginService.fetchUserByEmail(email);
      if (!user) {
        return res
          .status(401)
          .json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
      }

      if (user.status === "Inactive") {
        return res
          .status(403)
          .json(
            ErrorHandler.generateErrorResponse(
              403,
              "Account is Inactive. Please contact your administrator."
            )
          );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res
          .status(401)
          .json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
      }

      const roleToDashboardFunction = {
        Admin: LoginService.fetchAdminDashboard,
        Employee: LoginService.fetchEmployeeDashboard,
      };
      const dashboardFunction =
        roleToDashboardFunction[user.role] ||
        LoginService.fetchEmployeeDashboard;
      const dashboard = await dashboardFunction(user.employee_id);

      const sidebarMenu = await LoginService.fetchSidebarMenu(user.role);

      const attendanceCount = await LoginService.getAttendanceStatusCount();
      const loginDataCount = await LoginService.fetchEmployeeLoginDataCount();
      const employeeCountByDepartment =
        await LoginService.getEmployeeCountByDepartment();

      req.session.userId = user.employee_id;
      req.session.userRole = user.role;
      req.session.lastActive = Date.now();

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
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
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

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
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

  static async getEmployeeLoginDataCount(req, res) {
    try {
      const loginDataCount = await LoginService.fetchEmployeeLoginDataCount();

      if (!loginDataCount.length) {
        return res
          .status(404)
          .json(ErrorHandler.generateErrorResponse(404, "No login data found"));
      }

      const aggregatedData = {};

      loginDataCount.forEach((item) => {
        const label = item.punchin_label || "";
        if (!aggregatedData[label]) {
          aggregatedData[label] = {
            daily_count: 0,
            weekly_count: 0,
            monthly_count: 0,
          };
        }
        aggregatedData[label].daily_count += parseInt(item.daily_count || 0);
        aggregatedData[label].weekly_count += parseInt(item.weekly_count || 0);
        aggregatedData[label].monthly_count += parseInt(
          item.monthly_count || 0
        );
      });

      const labels = Object.keys(aggregatedData);
      const daily = labels.map((label) => aggregatedData[label].daily_count);
      const weekly = labels.map((label) => aggregatedData[label].weekly_count);
      const monthly = labels.map(
        (label) => aggregatedData[label].monthly_count
      );

      return res.status(200).json({
        status: "success",
        code: 200,
        data: { labels, daily, weekly, monthly },
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

  static async getSalaryRanges(req, res) {
    try {
      const salaryRanges = await LoginService.fetchSalaryRanges();
      return res.status(200).json({
        status: "success",
        code: 200,
        message: salaryRanges,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

  static async getEmployeeCountByDepartment(req, res) {
    try {
      const categories = await LoginService.getEmployeeCountByDepartment();

      if (!categories || categories.length === 0) {
        return res
          .status(404)
          .json(ErrorHandler.generateErrorResponse(404, "No data found"));
      }

      const totalEmployees = categories.reduce(
        (sum, item) => sum + item.count,
        0
      );

      return res.status(200).json({
        totalEmployees,
        categories,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }

  static async getEmployeePayrollData(req, res) {
    try {
      const payrollData = await LoginService.getEmployeePayrollData();

      if (!payrollData) {
        return res
          .status(404)
          .json(
            ErrorHandler.generateErrorResponse(404, "No payroll data found")
          );
      }

      return res.status(200).json({
        status: "success",
        code: 200,
        message: payrollData,
      });
    } catch (err) {
      console.error("Error fetching employee payroll data:", err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }
}

module.exports = LoginHandler;
