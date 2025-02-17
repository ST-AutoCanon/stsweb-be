require("dotenv").config();

const validateApiKey = (req, res, next) => {
  const apiKey = req.header("x-api-key");
  if (!apiKey || apiKey !== process.env.X_API_KEY) {
    return res.status(403).json({ message: "Forbidden: Invalid API Key" });
  }
  next();
};

module.exports = validateApiKey;
