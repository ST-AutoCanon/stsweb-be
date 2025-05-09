module.exports = {
    getSalarySlipQuery: (tableName) => `SELECT * FROM ${tableName} WHERE employee_id = ?`,

    GETEMPLOYEEBANKDETAILSQUERY: `SELECT * FROM employee_bank_details WHERE employee_id = ?`,
    GET_EMPLOYEE_DETAILS_QUERY: `SELECT * FROM employees WHERE employee_id = ?`

  };
  