const { recordAttendance } = require('../services/attendanceService');

async function markAttendanceHandler(req, res) {
  console.log('Received Payload:', req.body);

  try {
    const { employeeId, type, location } = req.body;

    if (!employeeId || !type) {
      return res.status(400).json({ message: 'Employee ID and type are required.' });
    }

    // Call the service to record attendance
    const result = await recordAttendance(employeeId, type, location);

    res.status(200).json({ message: result.message });
  } catch (error) {
    console.error('Error in markAttendanceHandler:', error.message);
    res.status(500).json({ message: 'Failed to record attendance.', error: error.message });
  }
}

module.exports = { markAttendanceHandler };
