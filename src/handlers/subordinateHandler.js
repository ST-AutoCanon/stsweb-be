// handlers/subordinateHandler.js
const subordinateService = require("../services/subordinateService");

const getSubordinateStatus = async (req, res) => {
  const employeeId = req.header("x-employee-id");
  if (!employeeId) {
    return res.status(400).json({ error: "Employee ID missing" });
  }

  try {
    const hasSubordinates = await subordinateService.checkSubordinates(employeeId);
    res.json({ hasSubordinates });
  } catch (err) {
    console.error("Error fetching subordinates:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getSubordinateStatus,
};
