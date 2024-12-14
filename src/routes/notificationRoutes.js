
const express = require('express');
const { addNotificationHandler, getNotificationsHandler } = require('../handlers/notificationHandler');

const router = express.Router();

// Add a notification
//http://localhost:3001/notifications
/*
{
  "senderId": "STS003",
  "recipientId": "STS001",
  "department": "HR",
  "message": "New policy update available.",
  "documentUrl": "https://example.com/policy.pdf"
}

*/
router.post('/notifications', addNotificationHandler);

// Fetch notifications
//http://localhost:3001/notifications?recipientId=STS006&department=IT
router.get('/notifications', getNotificationsHandler);

module.exports = router;
