const chatService = require("../services/chatService");
const multer = require("multer");
const path = require("path");

// file upload config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

module.exports = {
  createRoom: async (req, res) => {
    const { name, isGroup, members } = req.body;
    const creatorId = req.user.id; // assume req.user populated
    const roomId = await chatService.createRoom(
      name,
      isGroup,
      creatorId,
      members
    );
    res.json({ roomId });
  },

  listRooms: async (req, res) => {
    const rooms = await chatService.getUserRooms(req.user.id);
    res.json(rooms);
  },

  getMessages: async (req, res) => {
    const { roomId } = req.params;
    const msgs = await chatService.getMessages(roomId);
    res.json(msgs);
  },

  uploadFile: [
    upload.single("file"),
    (req, res) => {
      // return file URL for client to send as message
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    },
  ],

  listMembers: async (req, res) => {
    try {
      const { roomId } = req.params;
      const members = await chatService.getRoomMembers(roomId);
      res.json(members);
    } catch (err) {
      console.error("Failed to list members:", err);
      res.status(500).json({ error: "Could not fetch members" });
    }
  },

  addMember: async (req, res) => {
    try {
      const { roomId } = req.params;
      const { employeeId } = req.body;
      await chatService.addMemberToRoom(roomId, employeeId);
      res.status(204).end();
    } catch (err) {
      console.error("addMember error", err);
      res.status(500).json({ error: "Could not add member" });
    }
  },

  removeMember: async (req, res) => {
    try {
      const { roomId, employeeId } = req.params;
      await chatService.removeMemberFromRoom(roomId, employeeId);
      res.status(204).end();
    } catch (err) {
      console.error("removeMember error", err);
      res.status(500).json({ error: "Could not remove member" });
    }
  },

  // near your removeMember handler
  deleteRoom: async (req, res) => {
    try {
      const { roomId } = req.params;
      await chatService.deleteRoom(roomId);
      res.status(204).end();
    } catch (err) {
      console.error("deleteRoom error", err);
      res.status(500).json({ error: "Could not delete room" });
    }
  },

  deleteMessage: async (req, res) => {
    const { roomId, messageId } = req.params;
    const userId = req.user.id; // from simpleAuth
    try {
      await chatService.deleteMessage(messageId, roomId, userId);
      res.sendStatus(204);
    } catch (err) {
      console.error("deleteMessage error:", err);
      res.status(err.status === 403 ? 403 : 500).json({ error: err.message });
    }
  },
};
