import pool from "../config.js";
import { getSalaryStatementQuery, GETEMPLOYEEBANKDETAILSQUERY } from "../constants/adminSalaryStatement.js";

// Function to fetch salary statement data based on selected month and year
export const getSalaryStatement = async (month, year) => {
    try {
        const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        const tableName = `salary_sts_${month}_${year}`;
        const query = `SELECT * FROM ${tableName}`;
                        console.log("Fetching salary statement from:", tableName);
  
      const [rows] = await pool.query(getSalaryStatementQuery(tableName));
      return rows;
    } catch (error) {
      console.error("Error fetching salary statement:", error);
      throw error;
    }
  };
  

// Function to fetch employee bank details
export const getEmployeeBankDetails = async (employeeId) => {
  try {
    const [rows] = await pool.query(GETEMPLOYEEBANKDETAILSQUERY, [employeeId]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error fetching employee bank details:", error);
    throw error;
  }
};
