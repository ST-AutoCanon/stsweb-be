const INSERT_FACE_DATA = `
  INSERT INTO face_data (employee_id, label, descriptors)
  VALUES (?, ?, ?)
`;

const GET_EMPLOYEE_NAME = `
  SELECT first_name FROM employees WHERE employee_id = ?
`;

module.exports = {
  INSERT_FACE_DATA,
  GET_EMPLOYEE_NAME,
};
