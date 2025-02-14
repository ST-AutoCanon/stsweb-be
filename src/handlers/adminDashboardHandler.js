// // const pool = require("../config");  // Ensure this is correct
// // const queries = require("../constants/empdash");

// // const getEmployeeByDepartment = async (req, res) => {
// //     try {
// //         console.log("🔍 Fetching employees by department...");

// //         // Execute query
// //         const [rows] = await pool.query(queries.GET_EMPLOYEE_BY_DEPARTMENT);

// //         // Debug: Check if rows are undefined or empty
// //         if (!rows) {
// //             console.error("❌ Query returned undefined!");
// //             return res.status(500).json({ status: "error", message: "Database query returned undefined" });
// //         }

// //         console.log("✅ Query Result:", rows);

// //         if (rows.length === 0) {
// //             return res.status(404).json({ status: "error", message: "No data found" });
// //         }

// //         res.status(200).json({ status: "success", data: rows });

// //     } catch (error) {
// //         console.error("❌ Database Query Error:", error);

// //         res.status(500).json({ 
// //             status: "error", 
// //             message: "Internal Server Error", 
// //             details: error.message 
// //         });
// //     }
// // };


// //   module.exports = { getEmployeeByDepartment };


// const EmployeeService = require("../services/adminDashboardService");
// const ErrorHandler = require("../utils/errorHandler");

// class EmployeeHandler {
//   /**
//    * Fetch employee count by department.
//    *
//    * @param {Object} req - HTTP request object.
//    * @param {Object} res - HTTP response object.
//    */
//   static async getEmployeeCountByDepartment(req, res) {
//     try {
//       const userRole = req.user.role;
//       console.log("req,user",req.user);
//       const allowedRoles = ["Admin"]; // Change roles as per your requirement

//       if (!allowedRoles.includes(userRole)) {
//         return res.status(403).json(
//           ErrorHandler.generateErrorResponse(
//             403,
//             `Forbidden: Your role (${userRole}) does not have permission to access this resource.`
//           )
//         );
//       }

//       // Get employee count by department
//       const employeeCount = await EmployeeService.getEmployeeCountByDepartment();
//       console.log("empcount",employeeCount)

//       return res.status(200).json({
//         success: true,
//         statusCode: 200,
//         data: employeeCount,
//       });
//     } catch (err) {
//       console.error("Error in EmployeeHandler.getEmployeeCountByDepartment:", err);
//       return res
//         .status(500)
//         .json(ErrorHandler.generateErrorResponse(500, "Internal server error."));
//     }
//   }
// }

// module.exports = EmployeeHandler;
