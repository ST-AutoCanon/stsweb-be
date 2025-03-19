module.exports = {
    getSalaryStatementQuery: (tableName) => `SELECT * FROM ${tableName}`,
  
    GETEMPLOYEEBANKDETAILSQUERY: `SELECT * FROM employee_bank_details WHERE employee_id = ?`,
  };
  