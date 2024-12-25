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
  const unprotectedRoutes = ["/login", "/password-reset"]; // Add any other unprotected routes if needed

  // Skip validation for unprotected routes
  if (unprotectedRoutes.includes(req.path)) {
    return next();
  }

  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(ErrorHandler.generateErrorResponse(401, 'Session token is required'));
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verifies the token

    const isSessionValidResult = isSessionValid(token); // Validate the session

    if (!isSessionValidResult) {
      return res.status(401).json(ErrorHandler.generateErrorResponse(401, 'Session expired, please login again'));
    }

    const tokenData = jwt.decode(token); // Decode without verification

    if (expireSoon(tokenData.exp)) {
      res.setHeader('Warning', 'Session expiring soon');
      console.log('Session is about to expire soon.');
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json(ErrorHandler.generateErrorResponse(401, 'Invalid or expired session token'));
  }
};

module.exports = validateSessionToken;
