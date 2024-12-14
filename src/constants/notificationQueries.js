const NOTIFICATION_QUERIES = {
    addNotification: `
      INSERT INTO notifications (sender_id, recipient_id, department, message, document_url)
      VALUES (?, ?, ?, ?, ?);
    `,
    getNotifications: `
      SELECT * FROM notifications 
      WHERE recipient_id = ? OR department = ? 
      ORDER BY created_at DESC;
    `,
  };
  
  module.exports = { NOTIFICATION_QUERIES };
  