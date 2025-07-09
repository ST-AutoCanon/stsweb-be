const pool = require("../config"); // Adjust path if needed
const { GET_EMPLOYEE_BIRTHDAY_BY_EMAIL } = require("../constants/employeeBirthday");

const fetchEmployeeBirthday = async (email) => {
  const [rows] = await pool.query(GET_EMPLOYEE_BIRTHDAY_BY_EMAIL, [email]);
  return rows.length > 0 ? rows[0] : null;
};

module.exports = { fetchEmployeeBirthday };
