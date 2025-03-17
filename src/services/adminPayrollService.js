
// import pool from "../config.js";
// import { getLastMonthTotalSalaryQuery } from "../constants/adminPayrollQueries.js";

// export const getLastMonthTotalSalary = async () => {
//   try {
//     // Get last month details
//     const now = new Date();
//     const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//     const formattedMonth = lastMonth.toLocaleString('en-US', { month: 'short' }).toLowerCase(); // e.g., "feb"
//     const formattedYear = lastMonth.getFullYear();

//     // Possible table names
//     const tableNames = [
//       `salary__${formattedMonth}_${formattedYear}`,
//       `salary_sts_${formattedMonth}_${formattedYear}`
//     ];

//     let validTable = null;

//     // Check which table exists
//     for (const tableName of tableNames) {
//       const [tables] = await pool.query(`SHOW TABLES LIKE ?`, [tableName]);
//       if (tables.length > 0) {
//         validTable = tableName;
//         break;
//       }
//     }

//     if (!validTable) {
//       throw new Error(`No matching table found for ${formattedMonth}_${formattedYear}.`);
//     }

//     console.log("Querying table:", validTable);

//     // Query total salary
//     const [result] = await pool.query(getLastMonthTotalSalaryQuery(validTable));

//     return result[0].total_salary || 0;
//   } catch (error) {
//     console.error("Error fetching last month's salary:", error);
//     throw error;
//   }
// };









import pool from "../config.js";
import { getLastMonthTotalSalaryQuery } from "../constants/adminPayrollQueries.js";

export const getLastMonthTotalSalary = async () => {
  try {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const formattedMonth = lastMonth.toLocaleString('en-US', { month: 'short' }).toLowerCase(); // e.g., "feb"
    const formattedYear = lastMonth.getFullYear();

    // Search for tables with ANY prefix before the month and year
    const searchPattern = `salary_%_${formattedMonth}_${formattedYear}`; 

    console.log("Searching for tables like:", searchPattern);

    // Find matching tables
    const [tables] = await pool.query(`SHOW TABLES LIKE ?`, [searchPattern]);

    if (tables.length === 0) {
      throw new Error(`No table found for ${formattedMonth}_${formattedYear}.`);
    }

    // Get the first matching table
    const tableName = Object.values(tables[0])[0];

    console.log("Using table:", tableName);

    // Fetch total salary from the found table
    const [result] = await pool.query(getLastMonthTotalSalaryQuery(tableName));

    return result[0].total_salary || 0;
  } catch (error) {
    console.error("Error fetching last month's salary:", error);
    throw error;
  }
};

