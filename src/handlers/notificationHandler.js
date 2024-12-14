const { addNotification, getNotifications } = require('../services/notificationService');

async function addNotificationHandler(req, res) {
  const { senderId, recipientId, department, message, documentUrl } = req.body;

  if (!senderId || !message) {
    return res.status(400).json({ message: 'Both senderId and message are required fields.' });
  }

  try {
    const result = await addNotification({
      senderId,
      recipientId: recipientId || null,
      department: department || null,
      message,
      documentUrl: documentUrl || null,
    });

    res.status(201).json({
      message: 'Notification added successfully.',
      notificationId: result.insertId,
    });
  } catch (error) {
    console.error('Error adding notification:', error);
    res.status(500).json({ message: 'Failed to add notification.', error: error.message });
  }
}

async function getNotificationsHandler(req, res) {
  const { recipientId, department } = req.query;

  try {
    const notifications = await getNotifications({
      recipientId: recipientId || null,
      department: department || null,
    });

    res.status(200).json({ message: 'Notifications fetched successfully.', notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.', error: error.message });
  }
}

module.exports = { addNotificationHandler, getNotificationsHandler };
