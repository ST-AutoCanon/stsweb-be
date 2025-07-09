const GET_EMPLOYEE_BIRTHDAY_BY_EMAIL = `
  SELECT first_name, last_name, dob
  FROM employees
  WHERE email = ?
  AND DATE_FORMAT(dob, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')
`;

module.exports = { GET_EMPLOYEE_BIRTHDAY_BY_EMAIL };
