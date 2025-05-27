
const attendanceService = require('../services/employeeloginService');

// Debug log to verify import
console.log('Imported attendanceService:', attendanceService);

const getTodayAndYesterdayPunchData = async (req, res) => {
  try {
    console.log('[TODAY_YESTERDAY_PUNCHES] Fetching records...');
    const punchData = await attendanceService.fetchTodayAndYesterdayData();
    console.log('[TODAY_YESTERDAY_PUNCHES] Response data:', punchData);
    res.status(200).json({ success: true, data: punchData });
  } catch (error) {
    console.error("[TODAY_YESTERDAY_PUNCHES] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTodayAndYesterdayPunchData
};