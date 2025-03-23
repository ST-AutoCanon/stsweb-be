const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const EmployeeQueries = require("./services/employeeQueries");

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("sendMessage", async (payload) => {
      try {
        const {
          thread_id,
          sender_id,
          sender_role,
          recipient_id,
          sender_name,
          message,
          attachmentBase64,
        } = payload;

        let attachment_url = null;
        if (attachmentBase64) {
          const base64Data = attachmentBase64.replace(/^data:.*;base64,/, "");
          const fileBuffer = Buffer.from(base64Data, "base64");

          let ext = ".png";
          if (attachmentBase64.indexOf("image/jpeg") !== -1) {
            ext = ".jpeg";
          } else if (attachmentBase64.indexOf("application/pdf") !== -1) {
            ext = ".pdf";
          }

          const uniqueName = `${Date.now()}-${Math.floor(
            Math.random() * 1000
          )}${ext}`;

          const uploadDir = path.join(__dirname, ".", "uploads");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const filePath = path.join(uploadDir, uniqueName);

          fs.writeFileSync(filePath, fileBuffer);

          attachment_url = `${process.env.BACKEND_URL}/attachments/${uniqueName}`;
        }

        // After: Passing recipient_id from the payload
        const messageId = await EmployeeQueries.addMessage(
          thread_id,
          sender_id,
          sender_role,
          message,
          recipient_id, // Now passing the recipient id
          attachment_url
        );

        if (!messageId) {
          console.error("Failed to insert message in DB");
          return;
        }

        let recipientList = [];
        if (sender_role === "Employee") {
          const adminIds = await EmployeeQueries.getAdminIds();
          recipientList = [recipient_id, ...adminIds];
        } else {
          recipientList = [recipient_id];
        }
        const uniqueRecipients = [...new Set(recipientList)];
        await EmployeeQueries.markMessageUnreadForRecipients(
          messageId,
          uniqueRecipients
        );

        const newMessage = {
          id: messageId,
          thread_id,
          sender_id,
          sender_role,
          sender_name,
          message,
          attachment_url,
          created_at: new Date().toISOString(),
        };

        io.emit("receiveMessage", newMessage);
      } catch (err) {
        console.error("Error handling sendMessage:", err);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
}

module.exports = { initializeSocket, getIo };
