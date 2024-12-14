const EMPLOYEE_QUERIES = {
  getEmployeeProfile: `
    SELECT 
      employee_id AS id, 
      CONCAT(first_name, ' ', last_name) AS name, 
      department, 
      position, 
      email, 
      phone_number, 
      dob, 
      address, 
      aadhaar_number, 
      pan_number, 
      photo_url, 
      salary, 
      role
    FROM employees 
    WHERE employee_id = ?;
  `
};

module.exports = EMPLOYEE_QUERIES;
