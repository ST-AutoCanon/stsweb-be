const db = require('../config');
const { GET_EMP_ATTENDANCE_BY_DATE_RANGE } = require('../constants/emp_excelsheetQueries');
const ExcelJS = require('exceljs');

const getAttendanceExcelData = async (fromDate, toDate) => {
  const [rows] = await db.execute(GET_EMP_ATTENDANCE_BY_DATE_RANGE, [
    fromDate,
    toDate,
  ]);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  // Define headers
  worksheet.columns = [
    { header: 'Employee ID', key: 'employee_id', width: 15 },
    { header: 'Employee Name', key: 'employee_name', width: 25 },
    { header: 'Date', key: 'attendance_date', width: 15 },
    { header: 'First Punch In', key: 'first_punchin', width: 20 },
    { header: 'Last Punch Out', key: 'last_punchout', width: 20 },
    { header: 'Total Work Hours', key: 'total_work_hours', width: 15 },
    { header: 'First Punch In Location', key: 'first_punchin_location', width: 25 },
    { header: 'Last Punch Out Location', key: 'last_punchout_location', width: 25 },
  ];

  // Add rows
  rows.forEach(row => {
    worksheet.addRow({
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      attendance_date: row.attendance_date,
      first_punchin: row.first_punchin ? new Date(row.first_punchin).toLocaleString() : '—',
      last_punchout: row.last_punchout ? new Date(row.last_punchout).toLocaleString() : '—',
      total_work_hours: row.total_work_hours || '00:00',
      first_punchin_location: row.first_punchin_location || '—',
      last_punchout_location: row.last_punchout_location || '—',
    });
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  getAttendanceExcelData,
};
