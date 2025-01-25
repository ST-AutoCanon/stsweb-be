const bcrypt = require('bcrypt');
const LoginService = require("../services/loginService");
const ErrorHandler = require("../utils/errorHandler");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const moment = require('moment'); // Remove moment-timezone as we're using UTC
dotenv.config();

class LoginHandler {
  /**
   * Login a user and fetch their dashboard data based on role.
   * 
   * @param {Object} req - HTTP request object.
   * @param {Object} res - HTTP response object.
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await LoginService.fetchUserByEmail(email);

      if (!user) {
        return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json(ErrorHandler.generateErrorResponse(401, "Invalid credentials"));
      }

      // Get the current time in UTC (no fixed timezone, using universal time)
      const currentTimeUTC = moment.utc().format(); // UTC time for logging or debugging
      console.log(`Login attempt at: ${currentTimeUTC}`);

      // Create a JWT token after successful login with UTC expiration
      const token = jwt.sign(
        { userId: user.employee_id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '20m' } // JWT expiration is set using UTC time (independent of server time zone)
      );

      // Dynamically fetch dashboard based on role
      const roleToDashboardFunction = {
        Admin: LoginService.fetchAdminDashboard,
        Employee: LoginService.fetchEmployeeDashboard,
      };

      // Default to Employee dashboard if role is not recognized
      const dashboardFunction = roleToDashboardFunction[user.role] || LoginService.fetchEmployeeDashboard;  
      const dashboard = await dashboardFunction(user.employee_id);

      // Respond with the token, role, and dashboard data
      return res.status(200).json({
        status: "success",
        code: 200,
        message: {
          token,
          role: user.role,
          dashboard,
        },
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }
}

module.exports = LoginHandler;
