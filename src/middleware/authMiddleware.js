const authenticate = (req, res, next) => {
    // Example: Authentication logic (Adjust based on your actual logic)
    const token = req.headers.authorization;
    if (!token) {
      return res.status(403).json({ error: "Access denied. No token provided." });
    }
    next();
  };
  
  module.exports = authenticate;
  