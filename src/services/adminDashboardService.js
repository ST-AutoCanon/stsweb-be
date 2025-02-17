
// const db = require("../config");
// const queries = require("../constants/loginQueries");

// /**
//  * Fetch employee count by department.
//  * 
//  * @returns {Promise<Object[]>} List of departments with male and female employee count.
//  */
// const getEmployeeCountByDepartment = async () => {
//   try {

//     const query = queries.GET_EMPLOYEE_COUNT_BY_DEPARTMENT;

//     const [rows] = await db.execute(query);
//     console.log("rows",rows);
//     return rows;
//   } catch (err) {
//     console.error("Error fetching employee count by department:", err.message);
//     throw new Error("Failed to fetch employee count by department.");
//   }
// };

// module.exports = {
//   getEmployeeCountByDepartment,
// };
