

// // const cron = require("node-cron");
// // const db = require("../config"); // Ensure this path is correct
// // const moment = require("moment-timezone"); // Install via: npm install moment-timezone

// // cron.schedule("13 00 * * *", async () => {
// //   try {
// //     console.log("Running attendance update job at 00:00 AM...");

// //     // Fetch all employees who are currently punched in
// //     const [punchedInUsers] = await db.query(
// //       "SELECT * FROM `emp_attendence` WHERE punch_status = 'Punch In'"
// //     );

// //     if (!punchedInUsers.length) {
// //       console.log("No employees to update.");
// //       return;
// //     }

// //     // Get current date and yesterday's date in IST timezone
// //     const currentDate = moment().tz("Asia/Kolkata"); // Current date in IST
// //     const yesterday = moment().tz("Asia/Kolkata").subtract(1, "days"); // Yesterday in IST

// //     const punchOutTime = yesterday.format("YYYY-MM-DD") + " 23:59:55"; // Punch Out time for yesterday
// //     const punchInTime = currentDate.format("YYYY-MM-DD") + " 00:00:05"; // Punch In time for today

// //     const updatedUsers = [];

// //     for (let user of punchedInUsers) {
// //       const { punch_id, employee_id, punchin_device, punchin_location } = user;

// //       // Update punch-out time for the previous day
// //       const [updateResult] = await db.query(
// //         `UPDATE \`emp_attendence\` 
// //          SET punch_status = 'Punch Out', 
// //              punchout_time = ?, 
// //              punchout_device = ?, 
// //              punchout_location = ?, 
// //              punchmode = 'Automatic' 
// //          WHERE punch_id = ?`,
// //         [punchOutTime, punchin_device, punchin_location, punch_id]
// //       );

// //       if (updateResult.affectedRows > 0) {
// //         updatedUsers.push({ employee_id, punchin_device, punchin_location });
// //       }
// //     }

// //     // Insert new automatic punch-in record for updated users
// //     for (let user of updatedUsers) {
// //       const { employee_id, punchin_device, punchin_location } = user;

// //       await db.query(
// //         `INSERT INTO \`emp_attendence\` 
// //          (employee_id, punch_status, punchin_time, punchin_device, punchin_location, punchmode) 
// //          VALUES (?, 'Punch In', ?, ?, ?, 'Automatic')`,
// //         [employee_id, punchInTime, punchin_device, punchin_location]
// //       );

// //       console.log(
// //         `Employee ${employee_id} punched out at 23:59:55 (yesterday) and punched in again at 00:08:55 (today) automatically.`
// //       );
// //     }
// //   } catch (error) {
// //     console.error("Error running attendance update job:", error);
// //   }
// // });




// const cron = require("node-cron");
// const db = require("../config"); // Ensure correct DB connection path
// const moment = require("moment-timezone"); // Install via: npm install moment-timezone

// // Punch-out job at 23:59:55
// cron.schedule("55 12 13 * * *", async () => {
//   try {
//     console.log("Running automatic punch-out job at 23:59:55...");

//     const currentTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

//     // Find all employees who are currently punched in
//     const [punchedInUsers] = await db.query(
//       "SELECT punch_id, employee_id, punchin_device, punchin_location FROM emp_attendence WHERE punch_status = 'Punch In'"
//     );

//     if (!punchedInUsers.length) {
//       console.log("No employees to punch out.");
//       return;
//     }

//     // Update punch-out details
//     const punchOutPromises = punchedInUsers.map(({ punch_id }) => {
//       return db.query(
//         `UPDATE emp_attendence 
//          SET punch_status = 'Punch Out', 
//              punchout_time = ?, 
//              punchmode = 'Automatic' 
//          WHERE punch_id = ?`,
//         [currentTime, punch_id]
//       );
//     });

//     await Promise.all(punchOutPromises);
//     console.log(`Automatically punched out ${punchedInUsers.length} employees at ${currentTime}.`);
//   } catch (error) {
//     console.error("Error in automatic punch-out job:", error);
//   }
// });

// // Punch-in job at 00:00:05
// cron.schedule("13 13 * * *", async () => {
//   try {
//     console.log("Running automatic punch-in job at 00:00:05...");

//     const currentTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
//     const yesterdayDate = moment().tz("Asia/Kolkata").subtract(1, "day").format("YYYY-MM-DD");

//     // Find employees who were auto-punched out at exactly 23:59:55 yesterday
//     // const yesterdayDate = moment().tz("Asia/Kolkata").subtract(1, "day").format("YYYY-MM-DD");

//     const [punchedOutUsers] = await db.query(
//       `SELECT employee_id, punchout_device, punchout_location 
//        FROM emp_attendence 
//        WHERE punch_status = 'Punch Out' 
//        AND punchmode = 'Automatic' 
//        AND punchout_time BETWEEN ? AND ?
//        AND NOT EXISTS (
//            SELECT 1 FROM emp_attendence AS sub 
//            WHERE sub.employee_id = emp_attendence.employee_id 
//            AND sub.punch_status = 'Punch In' 
//            AND sub.punchmode = 'Automatic' 
//            AND sub.punchin_time > emp_attendence.punchout_time
//        )`,
//       [`${yesterdayDate} 13:13:00`, `${yesterdayDate} 13:00:00`]
//     );
    

//     if (!punchedOutUsers.length) {
//       console.log("No employees to punch in.");
//       return;
//     }

//     // Insert punch-in records
//     const punchInPromises = punchedOutUsers.map(({ employee_id, punchout_device, punchout_location }) => {
//       return db.query(
//         `INSERT INTO emp_attendence 
//          (employee_id, punch_status, punchin_time, punchin_device, punchin_location, punchmode) 
//          VALUES (?, 'Punch In', ?, ?, ?, 'Automatic')`,
//         [employee_id, currentTime, punchout_device, punchout_location]
//       );
//     });

//     await Promise.all(punchInPromises);
//     console.log(`Automatically punched in ${punchedOutUsers.length} employees at ${currentTime}.`);
//   } catch (error) {
//     console.error("Error in automatic punch-in job:", error);
//   }
// });


const cron = require("node-cron");
const db = require("../config"); // Ensure correct DB connection path
const moment = require("moment-timezone"); // Install via: npm install moment-timezone

// Combined Punch-out & Punch-in Job
cron.schedule("55 59 23 * * *", async () => {
  try {
    console.log("Running automatic punch-out job at 23:59:55...");
    const punchOutTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    
    // Find employees currently punched in
    const [punchedInUsers] = await db.query(
      "SELECT punch_id, employee_id, punchin_device, punchin_location FROM emp_attendence WHERE punch_status = 'Punch In'"
    );

    if (punchedInUsers.length) {
      // Update punch-out details
      await Promise.all(
        punchedInUsers.map(({ punch_id }) => {
          return db.query(
            `UPDATE emp_attendence 
             SET punch_status = 'Punch Out', 
                 punchout_time = ?, 
                 punchmode = 'Automatic' 
             WHERE punch_id = ?`,
            [punchOutTime, punch_id]
          );
        })
      );
      console.log(`Automatically punched out ${punchedInUsers.length} employees at ${punchOutTime}.`);
    } else {
      console.log("No employees to punch out.");
    }

    // Wait for 10 seconds before punch-in
    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log("Running automatic punch-in job at 00:00:05...");
    const punchInTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    const yesterdayDate = moment().tz("Asia/Kolkata").subtract(1, "day").format("YYYY-MM-DD");

    // Find employees who were auto-punched out at exactly 23:59:55 yesterday
    const [punchedOutUsers] = await db.query(
      `SELECT employee_id, punchout_device, punchout_location 
       FROM emp_attendence 
       WHERE punch_status = 'Punch Out' 
       AND punchmode = 'Automatic' 
       AND punchout_time BETWEEN ? AND ?
       AND NOT EXISTS (
           SELECT 1 FROM emp_attendence AS sub 
           WHERE sub.employee_id = emp_attendence.employee_id 
           AND sub.punch_status = 'Punch In' 
           AND sub.punchmode = 'Automatic' 
           AND sub.punchin_time > emp_attendence.punchout_time
       )`,
      [`${yesterdayDate} 23:59:55`, `${yesterdayDate} 23:59:55`]
    );

    if (punchedOutUsers.length) {
      // Insert punch-in records
      await Promise.all(
        punchedOutUsers.map(({ employee_id, punchout_device, punchout_location }) => {
          return db.query(
            `INSERT INTO emp_attendence 
             (employee_id, punch_status, punchin_time, punchin_device, punchin_location, punchmode) 
             VALUES (?, 'Punch In', ?, ?, ?, 'Automatic')`,
            [employee_id, punchInTime, punchout_device, punchout_location]
          );
        })
      );
      console.log(`Automatically punched in ${punchedOutUsers.length} employees at ${punchInTime}.`);
    } else {
      console.log("No employees to punch in.");
    }
  } catch (error) {
    console.error("Error in automatic punch-out & punch-in job:", error);
  }
});


// const cron = require("node-cron");
// const db = require("../config"); // Ensure correct DB connection path
// const moment = require("moment-timezone"); // Install via: npm install moment-timezone

// // Combined Punch-out & Punch-in Job (Testing Mode)
// cron.schedule("55 35 17 * * *", async () => {  // Runs every 2 seconds for testing
//   try {
//     console.log("Running automatic punch-out job...");
//     const punchOutTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    
//     // Find employees currently punched in
//     const [punchedInUsers] = await db.query(
//       "SELECT punch_id, employee_id, punchin_device, punchin_location FROM emp_attendence WHERE punch_status = 'Punch In'"
//     );

//     if (punchedInUsers.length) {
//       // Update punch-out details
//       await Promise.all(
//         punchedInUsers.map(({ punch_id }) => {
//           return db.query(
//             `UPDATE emp_attendence 
//              SET punch_status = 'Punch Out', 
//                  punchout_time = ?, 
//                  punchmode = 'Automatic' 
//              WHERE punch_id = ?`,
//             [punchOutTime, punch_id]
//           );
//         })
//       );
//       console.log(`Automatically punched out ${punchedInUsers.length} employees at ${punchOutTime}.`);
//     } else {
//       console.log("No employees to punch out.");
//     }

//     // Wait for 10 seconds before punch-in
//     await new Promise((resolve) => setTimeout(resolve, 10000));

//     console.log("Running automatic punch-in job...");
//     const punchInTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
//     const todayDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD"); // Using today's date for testing

//     // Find employees who were auto-punched out **today**
//     const [punchedOutUsers] = await db.query(
//       `SELECT employee_id, punchout_device, punchout_location 
//        FROM emp_attendence 
//        WHERE punch_status = 'Punch Out' 
//        AND punchmode = 'Automatic' 
//        AND punchout_time BETWEEN ? AND ? 
//        AND NOT EXISTS (
//            SELECT 1 FROM emp_attendence AS sub 
//            WHERE sub.employee_id = emp_attendence.employee_id 
//            AND sub.punch_status = 'Punch In' 
//            AND sub.punchmode = 'Automatic' 
//            AND sub.punchin_time > emp_attendence.punchout_time
//        )`,
//       [`${todayDate} 17:35:50`, `${todayDate} 17:35:55`]  // Today’s date range for testing
//     );

//     if (punchedOutUsers.length) {
//       // Insert punch-in records
//       await Promise.all(
//         punchedOutUsers.map(({ employee_id, punchout_device, punchout_location }) => {
//           return db.query(
//             `INSERT INTO emp_attendence 
//              (employee_id, punch_status, punchin_time, punchin_device, punchin_location, punchmode) 
//              VALUES (?, 'Punch In', ?, ?, ?, 'Automatic')`,
//             [employee_id, punchInTime, punchout_device, punchout_location]
//           );
//         })
//       );
//       console.log(`Automatically punched in ${punchedOutUsers.length} employees at ${punchInTime}.`);
//     } else {
//       console.log("No employees to punch in.");
//     }
//   } catch (error) {
//     console.error("Error in automatic punch-out & punch-in job:", error);
//   }
// });
