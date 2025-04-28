const CHECK_FACE_EXISTS = `
  SELECT 1 FROM face_data WHERE employee_id = ? LIMIT 1
`;

module.exports = {
  CHECK_FACE_EXISTS,
};
