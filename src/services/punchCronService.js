

const cron = require("node-cron");
const db = require("../config"); // Ensure this path is correct
const moment = require("moment-timezone"); // Install via: npm install moment-timezone

cron.schedule("01 00 * * *", async () => {
  try {
    console.log("Running attendance update job at 00:00 AM...");

    // Fetch all employees who are currently punched in
    const [punchedInUsers] = await db.query(
      "SELECT * FROM `emp_attendence` WHERE punch_status = 'Punch In'"
    );

    if (!punchedInUsers.length) {
      console.log("No employees to update.");
      return;
    }

    // Get current date and yesterday's date in IST timezone
    const currentDate = moment().tz("Asia/Kolkata"); // Current date in IST
    const yesterday = moment().tz("Asia/Kolkata").subtract(1, "days"); // Yesterday in IST

    const punchOutTime = yesterday.format("YYYY-MM-DD") + " 23:59:55"; // Punch Out time for yesterday
    const punchInTime = currentDate.format("YYYY-MM-DD") + " 00:00:05"; // Punch In time for today

    const updatedUsers = [];

    for (let user of punchedInUsers) {
      const { punch_id, employee_id, punchin_device, punchin_location } = user;

      // Update punch-out time for the previous day
      const [updateResult] = await db.query(
        `UPDATE \`emp_attendence\` 
         SET punch_status = 'Punch Out', 
             punchout_time = ?, 
             punchout_device = ?, 
             punchout_location = ?, 
             punchmode = 'Automatic' 
         WHERE punch_id = ?`,
        [punchOutTime, punchin_device, punchin_location, punch_id]
      );

      if (updateResult.affectedRows > 0) {
        updatedUsers.push({ employee_id, punchin_device, punchin_location });
      }
    }

    // Insert new automatic punch-in record for updated users
    for (let user of updatedUsers) {
      const { employee_id, punchin_device, punchin_location } = user;

      await db.query(
        `INSERT INTO \`emp_attendence\` 
         (employee_id, punch_status, punchin_time, punchin_device, punchin_location, punchmode) 
         VALUES (?, 'Punch In', ?, ?, ?, 'Automatic')`,
        [employee_id, punchInTime, punchin_device, punchin_location]
      );

      console.log(
        `Employee ${employee_id} punched out at 23:59:55 (yesterday) and punched in again at 00:08:55 (today) automatically.`
      );
    }
  } catch (error) {
    console.error("Error running attendance update job:", error);
  }
});
