// services/subordinateService.js
const db = require("../config"); // MySQL connection
const { CHECK_EMPLOYEE_SUBORDINATES } = require("../constants/hasSubordinatesQuery");

const checkSubordinates = async (employeeId) => {
  const [rows] = await db.query(CHECK_EMPLOYEE_SUBORDINATES, [employeeId]);
  return rows[0].count > 0;
};

module.exports = {
  checkSubordinates,
};
