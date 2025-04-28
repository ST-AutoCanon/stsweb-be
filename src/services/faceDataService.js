const db = require('../config');
const { SAVE_FACE_DATA, GET_FACE_DATA_BY_EMPLOYEE } = require('../constants/faceDataQueries');

const saveFaceDataService = async (employee_id, descriptors) => {
  await db.query(SAVE_FACE_DATA, [employee_id, JSON.stringify(descriptors)]);
};

// Service to get face data by employee_id
const getFaceDataByEmployeeService = async (employee_id) => {
  // Query to fetch face data from the database based on employee_id
  const [result] = await db.query(GET_FACE_DATA_BY_EMPLOYEE, [employee_id]);

  // If data exists, return the first result, else return null
  return result.length > 0 ? result[0] : null;
};

module.exports = {
  saveFaceDataService,
  getFaceDataByEmployeeService
};
