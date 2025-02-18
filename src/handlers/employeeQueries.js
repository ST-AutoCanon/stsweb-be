const EmployeeQueries = require("../services/employeeQueries");
const ErrorHandler = require("../utils/errorHandler");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getIo } = require("../socket");

// Configure Multer storage (moved from routes)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
exports.upload = upload; // Export the upload middleware

// Handler for starting a new thread (query)
exports.startThread = async (req, res) => {
  const { sender_id, sender_role, department_id, subject, message } = req.body;
  console.log(req.body);
  try {
    const threadId = await EmployeeQueries.startThread(sender_id, sender_role, department_id, subject, message);
    const response = ErrorHandler.generateSuccessResponse(201, "Thread started successfully!", { threadId });
    res.status(201).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(500, "Failed to start thread.");
    res.status(500).send(response);
  }
};

// Handler for adding a message with an attachment
exports.addMessage = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const { sender_id, sender_role, message, recipient_id } = req.body;

    const attachment_url = req.file
      ? `${req.protocol}://${req.get("host")}/attachments/${req.file.filename}`
      : null;

    console.log("Request Params:", req.params);
    console.log("Request Body:", req.body);

    if (!recipient_id) {
      return res.status(400).json(ErrorHandler.generateErrorResponse(400, "Recipient ID is required"));
    }

    // Step 1: Add message to database and get messageId
    const messageId = await EmployeeQueries.addMessage(thread_id, sender_id, sender_role, message, attachment_url);
    if (!messageId) {
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, "Failed to insert message"));
    }

    // Step 2: Fetch all admin employee IDs
    const adminIds = await EmployeeQueries.getAdminIds();

    // Step 3: Merge selected recipient(s) + admins (avoid duplicates)
    const allRecipients = [...new Set([recipient_id, ...adminIds])];

    // Step 4: Mark message unread for all recipients
    await EmployeeQueries.markMessageUnreadForRecipients(messageId, allRecipients);

    // Emit socket event
    const io = getIo();
    if (io) {
      io.emit("receiveMessage", { thread_id, sender_id, sender_role, message, attachment_url });
    }

    res.status(200).json(ErrorHandler.generateSuccessResponse(200, "Message added successfully"));
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json(ErrorHandler.generateErrorResponse(500, "Failed to add message"));
  }
};

// Handler to retrieve all messages in a thread
exports.getThreadMessages = async (req, res) => {
  const { thread_id } = req.params;
  try {
    const messages = await EmployeeQueries.getThreadMessages(thread_id);
    const response = ErrorHandler.generateSuccessResponse(200, "Messages retrieved successfully.", messages);
    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(500, "Failed to retrieve messages.");
    res.status(500).send(response);
  }
};

// Handler for closing a thread with feedback
exports.closeThread = async (req, res) => {
  const { thread_id } = req.params;
  const { feedback, note } = req.body;
  try {
    await EmployeeQueries.closeThread(thread_id, feedback, note);
    const response = ErrorHandler.generateSuccessResponse(200, "Thread closed successfully with feedback.");
    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(500, "Failed to close thread.");
    res.status(500).send(response);
  }
};

// Handler to get all threads for admin review
exports.getAllThreads = async (req, res) => {
  try {
    const threads = await EmployeeQueries.getAllThreads();
    const response = ErrorHandler.generateSuccessResponse(200, "Threads retrieved successfully.", threads);
    res.status(200).send(response);
  } catch (error) {
    console.log("Failed to retrieve threads:", error);
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(500, "Failed to retrieve threads.");
    res.status(500).send(response);
  }
};

// Handler to get threads by employee
exports.getThreadsByEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const threads = await EmployeeQueries.getThreadsByEmployee(employeeId);
    res
      .status(200)
      .send(ErrorHandler.generateSuccessResponse(200, "Threads retrieved successfully.", threads));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Handler to mark messages as read
exports.markMessagesAsRead = async (req, res) => {
  const { thread_id } = req.params;
  const { sender_id } = req.body;
  try {
    await EmployeeQueries.markMessagesAsRead(thread_id, sender_id);
    const response = ErrorHandler.generateSuccessResponse(200, "Messages marked as read.");
    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(500, "Failed to mark messages as read.");
    res.status(500).send(response);
  }
};
