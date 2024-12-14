// constants/leaveQueries.js

module.exports = {
    insertLeaveRequest: `
      INSERT INTO leavequeries (employee_id, start_date, end_date, reason, leave_type)
      VALUES (?, ?, ?, ?, ?)
    `,
    selectLeaveRequests: `
      SELECT * FROM leavequeries WHERE employee_id = ?
    `
  };
  