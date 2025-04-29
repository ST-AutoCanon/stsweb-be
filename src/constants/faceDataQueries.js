const GET_FACE_DATA_BY_EMPLOYEE = `
  SELECT * FROM face_data WHERE employee_id = ?
`;

module.exports = {
  GET_FACE_DATA_BY_EMPLOYEE
};
