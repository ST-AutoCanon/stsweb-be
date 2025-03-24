const attendanceService = require("../services/attendanceService");

const attendanceHandler = {
  // Get all attendance records for a specific employee
  getEmployeeAttendance: async (req, res) => {
    try {
      const { employeeId } = req.params;

      if (!employeeId) {
        return res.status(400).json({ success: false, message: "Employee ID is required" });
      }

      console.log("[GET_ATTENDANCE] Employee ID:", employeeId);

      const records = await attendanceService.getEmployeeAttendance(employeeId);
      res.status(200).json({ success: true, data: records });
    } catch (error) {
      console.error("[GET_ATTENDANCE] Error:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Handle Punch In
  punchIn: async (req, res) => {
    try {
      const { employeeId, device, location, punchMode } = req.body;

      if (!employeeId || !device || !location || !punchMode) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      console.log("[PUNCH_IN] Params:", { employeeId, device, location, punchMode });

      // Check if the last status is already Punch In
      const lastPunchStatus = await attendanceService.getLastPunchStatus(employeeId);
      if (lastPunchStatus === "Punch In") {
        return res.status(400).json({ success: false, message: "Already punched in." });
      }

      const punchId = await attendanceService.addPunchIn(employeeId, device, location, punchMode);
      res.status(201).json({ success: true, message: "Punch In successful", punchId });
    } catch (error) {
      console.error("[PUNCH_IN] Error:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Handle Punch Out
  punchOut: async (req, res) => {
    try {
      const { employeeId, device, location, punchMode } = req.body;

      if (!employeeId || !device || !location || !punchMode) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      console.log("[PUNCH_OUT] Params:", { employeeId, device, location, punchMode });

      // Check if the last status is Punch In (to allow Punch Out)
      const lastPunchStatus = await attendanceService.getLastPunchStatus(employeeId);
      if (lastPunchStatus !== "Punch In") {
        return res.status(400).json({ success: false, message: "Cannot punch out without punching in first." });
      }

      const updatedRows = await attendanceService.updatePunchOut(employeeId, device, location, punchMode);
      if (updatedRows > 0) {
        res.status(200).json({ success: true, message: "Punch Out successful" });
      } else {
        res.status(400).json({ success: false, message: "Punch Out failed. No active Punch In record found." });
      }
    } catch (error) {
      console.error("[PUNCH_OUT] Error:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get today's attendance for all employees
  getTodayAttendance: async (req, res) => {
    try {
      console.log("[TODAY_ATTENDANCE] Fetching today's records...");

      const attendanceData = await attendanceService.getTodayAttendance();
      res.status(200).json({ success: true, data: attendanceData });
    } catch (error) {
      console.error("[TODAY_ATTENDANCE] Error:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Get latest Punch In record
getLatestPunchIn: async (req, res) => {
  try {
    const { employeeId } = req.params;
    const record = await attendanceService.getLatestPunchIn(employeeId);

    if (record) {
      res.status(200).json({ success: true, data: record });
    } else {
      res.status(404).json({ success: false, message: "No Punch In record found." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
},

// Get latest Punch Out record
getLatestPunchOut: async (req, res) => {
  try {
    const { employeeId } = req.params;
    const record = await attendanceService.getLatestPunchOut(employeeId);

    if (record) {
      res.status(200).json({ success: true, data: record });
    } else {
      res.status(404).json({ success: false, message: "No Punch Out record found." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

,

getLatestPunchRecord: async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const latestPunch = await attendanceService.fetchLatestPunchRecord(employeeId);

    if (!latestPunch) {
      return res.status(200).json({
        success: true,
        message: "No punch record found.",
        data: null, // Explicitly returning null instead of throwing an error
      });
    }

    res.status(200).json({ success: true, data: latestPunch });
  } catch (error) {
    console.error("Error fetching latest punch record:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

};

module.exports = attendanceHandler;
