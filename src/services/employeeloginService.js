const db = require("../config");

/**
 * Fetch punch records for today and yesterday, enriched with employee details
 */
const fetchTodayAndYesterdayData = async () => {
  const query = `
    SELECT
      ea.punch_id,
      ea.employee_id,
      CASE
        WHEN ea.punch_status = 'IN' THEN 'Punch In'
        WHEN ea.punch_status = 'OUT' THEN 'Punch Out'
        ELSE ea.punch_status
      END AS punch_status,
      DATE_FORMAT(ea.punchin_time, '%Y-%m-%d %H:%i:%s') AS punchin_time,
      ea.punchin_device,
      ea.punchin_location,
      DATE_FORMAT(ea.punchout_time, '%Y-%m-%d %H:%i:%s') AS punchout_time,
      ea.punchout_device,
      ea.punchout_location,
      ea.punchmode,
      e.first_name, 
      e.last_name,
      p.photo_url,
      pr.role,
      CASE
        WHEN DATE(ea.punchin_time) = CURDATE() THEN 'Today'
        WHEN DATE(ea.punchin_time) = CURDATE() - INTERVAL 1 DAY THEN 'Yesterday'
        ELSE DATE_FORMAT(ea.punchin_time, '%Y-%m-%d')
      END AS record_day
    FROM emp_attendence ea
    JOIN employees e
      ON ea.employee_id = e.employee_id
    LEFT JOIN employee_personal p
      ON p.employee_id = e.employee_id
    LEFT JOIN employee_professional pr
      ON pr.employee_id = e.employee_id
    WHERE DATE(ea.punchin_time) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)
    ORDER BY ea.punchin_time DESC;
  `;

  try {
    console.log("Executing punch query");
    const [rows] = await db.execute(query);
    console.log("Fetched punch records:", rows.length);
    return rows;
  } catch (error) {
    console.error("Error fetching punch data:", error.message);
    throw new Error("Failed to fetch punch data");
  }
};

module.exports = {
  fetchTodayAndYesterdayData,
};
