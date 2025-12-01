const attendanceService = require("../services/employeeloginService");

const getTodayAndYesterdayPunchData = async (req, res) => {
  try {
    const punchData = await attendanceService.fetchTodayAndYesterdayData();
    res.status(200).json({ success: true, data: punchData });
  } catch (error) {
    console.error("[TODAY_YESTERDAY_PUNCHES] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTodayAndYesterdayPunchData,
};
