// backend/services/notificationService.js

const db = require("../config");
const { INSERT_NOTIFICATION } = require("../constants/notificationQueries");

/**
 * Called by reminderService.scheduleReminder when it's time.
 * Instead of emailing, we now persist a notification row.
 */
async function scheduleReminder(meetingRecord) {
  const {
    id: meetingId,
    follow_up_date,
    client_company,
    contact_name,
    created_by: userId,
  } = meetingRecord;

  const message = `Follow up with ${contact_name} at ${client_company}`;

  try {
    await db.execute(INSERT_NOTIFICATION, [
      userId,
      meetingId,
      message,
      follow_up_date,
    ]);
    console.log(
      `[NotificationService] Inserted notification for meeting ID ${meetingId}`
    );
  } catch (err) {
    console.error(
      `[NotificationService] Error inserting notification for meeting ID ${meetingId}:`,
      err
    );
    throw err;
  }
}

module.exports = {
  scheduleReminder,
};
