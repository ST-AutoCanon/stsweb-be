const bcrypt = require('bcrypt');
const LoginService = require("../services/loginService");
const ErrorHandler = require("../utils/errorHandler");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const moment = require('moment'); // Remove moment-timezone as we're using UTC
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

      // Respond with token, role, dashboard, and sidebar menu
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
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }
}

module.exports = LoginHandler;
