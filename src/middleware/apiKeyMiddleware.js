const ErrorHandler = require("../utils/errorHandler");

const validateApiKey = (req, res, next) => {
  const apiKey = req.header("x-api-key");
  const validApiKey = process.env.X_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    const errorResponse = ErrorHandler.generateErrorResponse(
      403,
      "Forbidden: Invalid API key"
    );
    return res.status(403).json(errorResponse);
  }

  next();
};

module.exports = validateApiKey;
