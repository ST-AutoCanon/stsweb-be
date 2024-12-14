const jwt = require('jsonwebtoken');
const { isSessionValid, expireSoon } = require('../utils/sessionManager');
const ErrorHandler = require('../utils/errorHandler');

/**
 * Middleware for validating JWT session token.
 * This will be applied to all authenticated routes.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {Function} next - Next middleware function.
 */
const validateSessionToken = (req, res, next) => {
  const unprotectedRoutes = ["/login", "/signup"]; // Add more routes as needed

  if (unprotectedRoutes.includes(req.path)) {
    return next();
  }

  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(ErrorHandler.generateErrorResponse(401, 'Session token is required'));
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    // Additional session validation
    if (!isSessionValid(token)) {
      return res.status(401).json(ErrorHandler.generateErrorResponse(401, 'Session expired, please login again'));
    }

    // Warn if token is about to expire
    const tokenData = jwt.decode(token); // Decode without verification
    if (expireSoon(tokenData.exp)) {
      res.setHeader('Warning', 'Session expiring soon');
    }

    req.user = decoded; // Attach decoded token data to the request
    next();
  } catch (err) {
    console.error("JWT Validation Error:", err.message); // Log error for debugging
    return res.status(401).json(ErrorHandler.generateErrorResponse(401, 'Invalid or expired session token'));
  }
};

module.exports = validateSessionToken;
