const db = require("../config");
const queries = require("../constants/empQueryQueries");

class EmployeeQueries {
  static async startThread(
    sender_id,
    sender_role,
    department_id,
    subject,
    message,
    recipientRole
  ) {
    let recipient_id;
    if (recipientRole === "Admin") {
      const [admins] = await db.execute(queries.GET_ADMIN);
      if (!admins || admins.length === 0) {
        throw new Error("No admin found.");
      }
      recipient_id = admins[0].employee_id;
    } else if (recipientRole === "HR") {
      const [hr] = await db.execute(queries.GET_HR);
      if (!hr || hr.length === 0) {
        throw new Error("No HR manager found.");
      }
      recipient_id = hr[0].employee_id;
    } else if (recipientRole === "Manager") {
      const [managers] = await db.execute(queries.GET_MANAGER_BY_DEPARTMENT, [
        department_id,
      ]);
      if (!managers || managers.length === 0) {
        throw new Error("No department manager found.");
      }
      recipient_id = managers[0].employee_id;
    } else {
      throw new Error("Invalid recipient role.");
    }

    // Create the thread
    const [result] = await db.execute(queries.CREATE_THREAD, [
      sender_id,
      recipient_id,
      subject,
      department_id,
    ]);
    const threadId = result.insertId;

    // Insert the initial message and capture the message id
    const [messageResult] = await db.execute(queries.ADD_MESSAGE, [
      threadId,
      sender_id,
      sender_role,
      message,
      null,
    ]);
    const messageId = messageResult.insertId;

    // Only mark the message as unread for the intended recipient.
    await EmployeeQueries.markMessageUnreadForRecipients(messageId, [
      recipient_id,
    ]);

    return threadId;
  }

  static async getAdminIds() {
    const [admins] = await db.execute(queries.GET_ADMIN);
    return admins.map((admin) => admin.employee_id).filter((id) => id !== null);
  }

  static async updateThreadLatestMessage(thread_id, message, attachment_url) {
    let latestMessageValue = "";

    if (message && message.trim().length > 0) {
      // If there's a text message, use it
      latestMessageValue = message;
    } else if (attachment_url) {
      // Otherwise, if there's an attachment but no text, set a placeholder
      latestMessageValue = "Attachment";
    } else {
      // No text, no attachment (edge case) - could leave blank or set a default
      latestMessageValue = "";
    }

    // Update the threads table
    await db.execute(queries.UPDATE_LATEST_MESSAGE, [
      latestMessageValue,
      thread_id,
    ]);
  }

  static async addMessage(
    thread_id,
    sender_id,
    sender_role,
    message,
    recipient_id,
    attachment_url = null
  ) {
    // Insert the message record
    const [result] = await db.execute(queries.ADD_MESSAGE, [
      thread_id,
      sender_id,
      sender_role,
      message,
      attachment_url,
    ]);
    const messageId = result.insertId;

    // Update latest_message in threads.
    await EmployeeQueries.updateThreadLatestMessage(
      thread_id,
      message,
      attachment_url
    );

    // Only mark as unread for the intended recipient.
    await EmployeeQueries.markMessageUnreadForRecipients(messageId, [
      recipient_id,
    ]);

    return messageId;
  }

  static async markMessageUnreadForRecipients(messageId, recipientIds) {
    const values = recipientIds.map((id) => [messageId, id, false]);
    await db.query(queries.UNREAD_STATUS, [values]);
  }

  static async markMessagesAsRead(thread_id, sender_id, user_role) {
    if (user_role === "Admin") {
      await db.execute(queries.MARK_MESSAGES_AS_READ_ADMIN, [thread_id]);
    } else {
      await db.execute(queries.MARK_MESSAGES_AS_READ, [thread_id, sender_id]);
    }
  }

  static async getThreadMessages(thread_id) {
    try {
      const [rows] = await db.execute(queries.GET_THREAD_MESSAGES, [thread_id]);
      return rows;
    } catch (error) {
      console.error("Error fetching thread messages:", error);
      throw new Error("Database query error.");
    }
  }

  static async closeThread(thread_id, feedback, note = null) {
    await db.execute(queries.CLOSE_THREAD, [feedback, note, thread_id]);
  }

  static async getAllThreads() {
    try {
      const [rows] = await db.execute(queries.GET_ALL_THREADS);
      return rows;
    } catch (error) {
      console.error("Error fetching threads:", error.sqlMessage || error);
      throw new Error(error.message || "Database query error.");
    }
  }

  static async getThreadsByEmployee(employeeId) {
    try {
      const [threads] = await db.execute(queries.FETCH_THREADS, [
        employeeId,
        employeeId,
        employeeId,
        employeeId,
        employeeId,
      ]);
      return threads;
    } catch (error) {
      console.error(error);
      throw new Error("Error fetching threads");
    }
  }
}

module.exports = EmployeeQueries;
