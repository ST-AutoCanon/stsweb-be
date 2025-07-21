// backend/services/notificationService.js

const db = require("../config"); // your mysql2/promise or similar db client
const { INSERT_NOTIFICATION } = require("../constants/notificationQueries");

// Called by reminderService when it’s time to fire
async function sendMeetingReminder(meeting) {
  const {
    id: meetingId,
    follow_up_date,
    client_company,
    contact_name,
    created_by: userId,
  } = meeting;

  const message = `Follow up with ${contact_name} at ${client_company}`;

  await db.execute(INSERT_NOTIFICATION, [
    userId,
    meetingId,
    message,
    follow_up_date,
  ]);
}

async function sendAssignmentNotification(meeting) {
  const {
    assigned_to: userId,
    id: meetingId,
    client_company,
    contact_name,
  } = meeting;
  const message = `You’ve been assigned follow-up for ${client_company} / ${contact_name}`;
  const triggeredAt = new Date(); // or meeting.follow_up_date if you prefer
  await db.execute(INSERT_NOTIFICATION, [
    userId,
    meetingId,
    message,
    triggeredAt,
  ]);
}

module.exports = { sendMeetingReminder, sendAssignmentNotification };
