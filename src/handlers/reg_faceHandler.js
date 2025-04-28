// handlers/reg_faceHandler.js
const { checkFaceRegistered } = require("../services/reg_faceService");

const handleCheckFaceRegistered = async (req, res) => {
  const employeeId = req.params.employee_id;  // Correctly use employee_id from route params

  try {
    const isRegistered = await checkFaceRegistered(employeeId);  // Returns true or false
    res.json({ isRegistered });
  } catch (err) {
    console.error("Error checking face registration:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { handleCheckFaceRegistered };
