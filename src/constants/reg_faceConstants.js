// constants/reg_faceConstants.js
const CHECK_FACE_REGISTERED = `
  SELECT id 
  FROM face_data 
  WHERE employee_id = ?
`;

module.exports = { CHECK_FACE_REGISTERED };

