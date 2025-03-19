export const getLastMonthTotalSalaryQuery = (tableName) => `
  SELECT SUM(net_salary) AS total_salary FROM ${tableName};
`;
