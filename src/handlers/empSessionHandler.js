const attendanceService = require("../services/empSessionService");

const attendanceHandler = {
  // Handler to get today's punch records for an employee
  getTodayPunchRecords: async (req, res) => {
    try {
      const { employeeId } = req.params; // Get employeeId from request parameters

      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
      }

      const records = await attendanceService.getTodayPunchRecords(employeeId);

      return res.status(200).json({
        success: true,
        data: records,
      });
    } catch (error) {
      console.error("Error in getTodayPunchRecords handler:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
};

module.exports = attendanceHandler;
