const db = require("../config");
const queries = require("../constants/empQueryQueries");

class EmployeeQueries {
  // Start a new thread for an employee query
  static async startThread(sender_id, department_id, subject, question) {
    // Get the department manager
    const [recipients] = await db.execute(queries.GET_MANAGER_BY_DEPARTMENT, [department_id]);
    
    if (!recipients || recipients.length === 0) {
      throw new Error("No department manager found.");
    }

    const recipient_id = recipients[0].employee_id;
    const [result] = await db.execute(queries.CREATE_THREAD, [sender_id, recipient_id, subject, department_id]);
    const threadId = result.insertId;
    
    await db.execute(queries.ADD_MESSAGE, [threadId, sender_id, "employee", question, true, null]); // No attachment initially
    return threadId;
  }

  static async getAdminIds() {
    const [admins] = await db.execute(queries.GET_ADMIN);
    return admins.map(admin => admin.employee_id);
}


  // Add a message to an existing thread with an attachment
  static async addMessage(thread_id, sender_id, sender_role, message, attachment_url = null) {
    const [result] = await db.execute(queries.ADD_MESSAGE, [thread_id, sender_id, sender_role, message, attachment_url]);
    return result.insertId;  // Ensure `messageId` is returned
  }
  

  // **New function: Mark the message as unread for recipients**
  static async markMessageUnreadForRecipients(messageId, recipientIds) {
    const values = recipientIds.map(id => [messageId, id, false]);
    await db.query(queries.UNREAD_STATUS, [values]);
}


  // Mark all messages in a thread as read
  static async markMessagesAsRead(thread_id, sender_id) {
    await db.execute(queries.MARK_MESSAGES_AS_READ, [thread_id, sender_id]);
  }

  // Retrieve all messages in a specific thread
  static async getThreadMessages(thread_id) {
    try {
      const [rows] = await db.execute(queries.GET_THREAD_MESSAGES, [thread_id]); 
      return rows;
    } catch (error) {
      console.error("Error fetching thread messages:", error);
      throw new Error("Database query error.");
    }
  }
  

  // Close a thread with feedback
  static async closeThread(thread_id, feedback, note = null) {
    await db.execute(queries.CLOSE_THREAD, [feedback, note, thread_id]);
  }

  // Retrieve all threads for admin review
  static async getAllThreads() {
  try {
    const [rows] = await db.execute(queries.GET_ALL_THREADS);
    console.log(rows);
    return rows;
  } catch (error) {
    console.error("Error fetching threads:", error.sqlMessage || error);
    throw new Error(error.message || "Database query error.");
  }
}

  

  // Retrieve all threads for a specific employee
  static async getThreadsByEmployee(employeeId) {
    try {
      const [threads] = await db.execute(queries.FETCH_THREADS, [employeeId, employeeId, employeeId, employeeId]);
      return threads;
    } catch (error) {
      console.error(error);
      throw new Error("Error fetching threads");
    }
  }
}

module.exports = EmployeeQueries;
