const bcrypt = require('bcrypt');
const LoginService = require("../services/loginService");
const ErrorHandler = require("../utils/errorHandler");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
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

      // Create a JWT token after successful login
      const token = jwt.sign(
        { userId: user.employee_id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '20m' }
      );

      // Dynamically fetch dashboard based on role
      const roleToDashboardFunction = {
        Admin: LoginService.fetchAdminDashboard,
        Employee: LoginService.fetchEmployeeDashboard,
      };

      const dashboardFunction = roleToDashboardFunction[user.role];
      if (!dashboardFunction) {
        return res.status(403).json(
          ErrorHandler.generateErrorResponse(403, `Dashboard not available for role: ${user.role}`)
        );
      }

      const dashboard = await dashboardFunction(user.employee_id);

      
      return res.status(200).json(ErrorHandler.generateSuccessResponse({
        token,
        role: user.role,
        dashboard,
      }));
    } catch (err) { 
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Internal server error"));
    }
  }
}

module.exports = LoginHandler;
