export const getSalaryStatementQuery = (tableName) => `SELECT * FROM ${tableName}`;
export const GETEMPLOYEEBANKDETAILSQUERY = `SELECT * FROM employee_bank_details WHERE employee_id = ?`;
