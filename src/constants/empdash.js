// // empdash.js
// module.exports = {
//     // Example query
//     GET_EMPLOYEE_BY_DEPARTMENT: `
//         SELECT 
//             d.name AS department_name, 
//             COUNT(CASE WHEN e.gender = 'Male' THEN 1 END) AS men,
//             COUNT(CASE WHEN e.gender = 'Female' THEN 1 END) AS women
//         FROM 
//             employees e
//         LEFT JOIN 
//             departments d ON e.department_id = d.id
//         GROUP BY 
//             d.name;
//     `,

//     // Add more queries as needed
// };
