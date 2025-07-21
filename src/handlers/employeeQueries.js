const EmployeeQueries = require("../services/employeeQueries");
const ErrorHandler = require("../utils/errorHandler");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
exports.upload = upload;

exports.startThread = async (req, res) => {
  const { sender_id, sender_role, department_id, subject, message, role } =
    req.body;

  try {
    const threadId = await EmployeeQueries.startThread(
      sender_id,
      sender_role,
      department_id,
      subject,
      message,
      role
    );
    const response = ErrorHandler.generateSuccessResponse(
      201,
      "Thread started successfully!",
      { threadId }
    );
    res.status(201).send(response);

  try {
    const threadId = await EmployeeQueries.startThread(
      sender_id,
      sender_role,
      department_id,
      subject,
      message,
      role
    );
    const response = ErrorHandler.generateSuccessResponse(
      201,
      "Thread started successfully!",
      { threadId }
    );
    res.status(201).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(
      500,
      "Failed to start thread."
    );
    res.status(500).send(response);
  }
};

exports.addMessage = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const { sender_id, sender_role, message, recipient_id } = req.body;

    const attachment_url = req.file
      ? `${req.protocol}://${req.get("host")}/attachments/${req.file.filename}`
      : null;

    if (!recipient_id) {
      return res
        .status(400)
        .json(
          ErrorHandler.generateErrorResponse(400, "Recipient ID is required")
        );
    }

    const messageId = await EmployeeQueries.addMessage(
      thread_id,
      sender_id,
      sender_role,
      message,
      recipient_id,
      attachment_url
    );

    if (!messageId) {
      return res
        .status(500)
        .json(
          ErrorHandler.generateErrorResponse(500, "Failed to insert message")
        );
    }

    const created_at = new Date().toISOString();

    const newMessage = {
      id: messageId,
      thread_id,
      sender_id,
      sender_role,
      message,
      attachment_url,
      created_at,
    };

    // WebSocket emission removed since websockets are no longer used.
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Message added successfully",
      data: { message: newMessage },
    });
  } catch (error) {
    console.error("Error adding message:", error);
    res
      .status(500)
      .json(ErrorHandler.generateErrorResponse(500, "Failed to add message"));
  }
};

exports.getThreadMessages = async (req, res) => {
  const { thread_id } = req.params;
  try {
    const messages = await EmployeeQueries.getThreadMessages(thread_id);
    const response = ErrorHandler.generateSuccessResponse(
      200,
      "Messages retrieved successfully.",
      messages
    );
    res.status(200).send(response);

  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(
      500,

      "Failed to start thread."

      "Failed to retrieve messages."

    );
    res.status(500).send(response);
  }
};


exports.addMessage = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const { sender_id, sender_role, message, recipient_id } = req.body;

    const attachment_url = req.file
      ? `${req.protocol}://${req.get("host")}/attachments/${req.file.filename}`
      : null;

    if (!recipient_id) {
      return res
        .status(400)
        .json(
          ErrorHandler.generateErrorResponse(400, "Recipient ID is required")
        );
    }

    const messageId = await EmployeeQueries.addMessage(
      thread_id,
      sender_id,
      sender_role,
      message,
      recipient_id,
      attachment_url
    );

    if (!messageId) {
      return res
        .status(500)
        .json(
          ErrorHandler.generateErrorResponse(500, "Failed to insert message")
        );
    }

    const created_at = new Date().toISOString();

    const newMessage = {
      id: messageId,
      thread_id,
      sender_id,
      sender_role,
      message,
      attachment_url,
      created_at,
    };

    // inside exports.addMessage, after const newMessage = { … }
    const io = req.app.get("io");
    io.to(`query_${thread_id}`).emit("newMessage", newMessage);

    // WebSocket emission removed since websockets are no longer used.
    res.status(200).json({
      status: "success",
      code: 200,
      message: "Message added successfully",
      data: { message: newMessage },
    });
  } catch (error) {
    console.error("Error adding message:", error);
    res
      .status(500)
      .json(ErrorHandler.generateErrorResponse(500, "Failed to add message"));
  }
};

exports.getThreadMessages = async (req, res) => {
  const { thread_id } = req.params;
  try {
    const messages = await EmployeeQueries.getThreadMessages(thread_id);
    const response = ErrorHandler.generateSuccessResponse(
      200,
      "Messages retrieved successfully.",
      messages
    );
    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(
      500,
      "Failed to retrieve messages."
    );
    res.status(500).send(response);
  }
};

exports.closeThread = async (req, res) => {
  const { thread_id } = req.params;
  const { feedback, note } = req.body;
  try {
    await EmployeeQueries.closeThread(thread_id, feedback, note);
    const response = ErrorHandler.generateSuccessResponse(
      200,
      "Thread closed successfully with feedback."
    );

exports.closeThread = async (req, res) => {
  const { thread_id } = req.params;
  const { feedback, note } = req.body;
  try {
    await EmployeeQueries.closeThread(thread_id, feedback, note);
    const response = ErrorHandler.generateSuccessResponse(
      200,
      "Thread closed successfully with feedback."
    );

    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(
      500,
      "Failed to close thread."
    );
    res.status(500).send(response);
  }
};

exports.getAllThreads = async (req, res) => {
  try {
    const threads = await EmployeeQueries.getAllThreads();
    const response = ErrorHandler.generateSuccessResponse(
      200,
      "Threads retrieved successfully.",
      threads
    );
    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(
      500,
      "Failed to retrieve threads."
    );
    res.status(500).send(response);
  }
};

exports.getThreadsByEmployee = async (req, res) => {
  const { employeeId } = req.params;
  try {
    const threads = await EmployeeQueries.getThreadsByEmployee(employeeId);
    res
      .status(200)
      .send(
        ErrorHandler.generateSuccessResponse(
          200,
          "Threads retrieved successfully.",
          threads
        )
      );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error." });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  const { thread_id } = req.params;
  const { sender_id, user_role } = req.body;
  try {
    await EmployeeQueries.markMessagesAsRead(thread_id, sender_id, user_role);
    const response = ErrorHandler.generateSuccessResponse(
      200,
      "Messages marked as read."
    );
    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    const response = ErrorHandler.generateErrorResponse(
      500,
      "Failed to mark messages as read."
    );
    res.status(500).send(response);
  }
};
