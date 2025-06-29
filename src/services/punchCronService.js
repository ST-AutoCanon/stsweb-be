

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

