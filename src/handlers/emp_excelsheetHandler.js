

const { getAttendanceExcelData } = require('../services/emp_excelsheetService');

const fetchAttendanceExcelData = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: 'Missing from/to date' });
    }

    const excelBuffer = await getAttendanceExcelData(from, to);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="punch-data-${from}-to-${to}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  fetchAttendanceExcelData,
};