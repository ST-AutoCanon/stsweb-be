module.exports = (req, res, next) => {
  const idleLimit = 5 * 60 * 1000; // 15 minutes

  // If no session or last active time, continue
  if (!req.session || !req.session.lastActive) {
    req.session.lastActive = Date.now();
    return next();
  }

  const now = Date.now();
  const idleTime = now - req.session.lastActive;

  // Check if idle time exceeds limit
  if (idleTime > idleLimit) {
    // Destroy session and log out
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      return res.status(401).json({
        status: "error",
        code: 401,
        message: "Session expired due to inactivity.",
      });
    });
  } else {
    // Update last active time
    req.session.lastActive = now;
    next();
  }
};
