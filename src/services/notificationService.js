const pool = require('../config/dbConfig'); // Ensure this path is correct
const { NOTIFICATION_QUERIES } = require('../constants/notificationQueries'); // Adjust the path if needed

async function addNotification({ senderId, recipientId, department, message, documentUrl }) {
  try {
    const [result] = await pool.execute(NOTIFICATION_QUERIES.addNotification, [
      String(senderId),
      recipientId ? String(recipientId) : null,
      department || null,
      message,
      documentUrl || null,
    ]);
    return result;
  } catch (error) {
    console.error('Error in addNotification:', error);
    throw error;
  }
}

async function getNotifications({ recipientId, department }) {
  try {
    const [notifications] = await pool.execute(NOTIFICATION_QUERIES.getNotifications, [
      recipientId || null,
      department || null,
    ]);
    return notifications;
  } catch (error) {
    console.error('Error in getNotifications:', error);
    throw error;
  }
}

module.exports = { addNotification, getNotifications };
