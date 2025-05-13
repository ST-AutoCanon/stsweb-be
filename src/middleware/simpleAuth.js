// src/middleware/simpleAuth.js
module.exports = function simpleAuth(req, res, next) {
  // your front-end must send this on every chat request:
  const userId = req.header("x-employee-id");
  if (!userId) {
    return res.status(401).json({ error: "Missing x-employee-id header" });
  }
  req.user = { id: userId };
  next();
};
