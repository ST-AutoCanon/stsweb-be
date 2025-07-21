// backend/constants/notificationQueries.js

const INSERT_NOTIFICATION = `
  INSERT INTO notifications
    (user_id, meeting_id, message, triggered_at)
  VALUES (?, ?, ?, ?);
`;

const SELECT_UNREAD_NOTIFICATIONS = `
  SELECT
    id,
    meeting_id,
    message,
    triggered_at
  FROM notifications
  WHERE user_id = ?
    AND is_read = 0
  ORDER BY triggered_at DESC;
`;

const MARK_NOTIFICATION_READ = `
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = ?
    AND user_id = ?;
`;

module.exports = {
  INSERT_NOTIFICATION,
  SELECT_UNREAD_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
};
