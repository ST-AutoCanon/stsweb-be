const pool = require("../config");
const {
  getLastMonthTotalSalaryQuery,
} = require("../constants/adminPayrollQueries");

const getLastMonthTotalSalary = async () => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const formattedMonth = lastMonth
      .toLocaleString("en-US", { month: "short" })
      .toLowerCase(); // e.g., "feb"
    const formattedYear = lastMonth.getFullYear();

    const searchPattern = `salary_%_${formattedMonth}_${formattedYear}`;

    const [tables] = await pool.query(`SHOW TABLES LIKE ?`, [searchPattern]);

    if (tables.length === 0) {
      throw new Error(`No table found for ${formattedMonth}_${formattedYear}.`);
    }

    const tableName = Object.values(tables[0])[0];

    const [result] = await pool.query(getLastMonthTotalSalaryQuery(tableName));

    return result[0]?.total_salary || 0;
  } catch (error) {
    console.error("Error fetching last month's salary:", error);
    throw error;
  }
};

module.exports = {
  getLastMonthTotalSalary,
};
