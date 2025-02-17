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

      // Store last active time (optional: you can store it in DB if needed)
      req.session.lastActive = Date.now();

      // Fetch dashboard data based on role
      const roleToDashboardFunction = {
        Admin: LoginService.fetchAdminDashboard,
        Employee: LoginService.fetchEmployeeDashboard,
      };
      const dashboardFunction = roleToDashboardFunction[user.role] || LoginService.fetchEmployeeDashboard;
      const dashboard = await dashboardFunction(user.employee_id);

      // Fetch sidebar menu based on role
      const sidebarMenu = await LoginService.fetchSidebarMenu(user.role);

      return res.status(200).json({
        status: "success",
        code: 200,
        message: {
          role: user.role,
          name: user.name,
          gender: user.gender,
          dashboard,
          sidebarMenu,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }
}

module.exports = LoginHandler;
