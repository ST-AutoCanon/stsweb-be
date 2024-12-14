const ATTENDANCE_QUERIES = {
    checkAttendance: `
      SELECT * FROM attendance1 
      WHERE employee_id = ? AND date = CURDATE();
    `,
    insertLogin: `
      INSERT INTO attendance1 (employee_id, date, login_time, location)
      VALUES (?, CURDATE(), CURTIME(), ?);
    `,
    updateLogout: `
      UPDATE attendance1 
      SET logout_time = CURTIME() 
      WHERE employee_id = ? AND date = CURDATE();
    `,
  };
  
  module.exports = { ATTENDANCE_QUERIES };
  