const db = require("../config");
const Q = require("../constants/chatQueries");

async function createRoom(name, isGroup, creatorId, memberIds = []) {
  // If this is a 1-on-1 (private) with exactly one other member, check first:
  if (!isGroup && memberIds.length === 1) {
    const otherId = memberIds[0];
    const [existing] = await db.execute(Q.FIND_PRIVATE_ROOM, [
      creatorId,
      otherId,
    ]);
    if (existing.length) {
      return existing[0].room_id; // reuse
    }
  }

  // otherwise, make a new room:
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.execute(Q.CREATE_ROOM, [
      name || "",
      isGroup ? 1 : 0,
      creatorId,
    ]);
    const roomId = res.insertId;

    // add both creator and members
    const all = [creatorId, ...memberIds];
    for (let id of all) {
      await conn.execute(Q.ADD_MEMBER, [roomId, id]);
    }

    await conn.commit();
    return roomId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function getUserRooms(userId) {
  // exactly two bindings for the two '?' above
  const [rows] = await db.execute(Q.GET_ROOMS_FOR_USER, [userId, userId]);
  return rows;
}

async function saveMessage(
  roomId,
  senderId,
  content,
  type = "text",
  fileUrl = null
) {
  // normalize any undefined to '' or null
  const text = content ?? "";
  const msgType = type ?? "text";
  const fUrl = fileUrl ?? null;

  await db.execute(Q.SAVE_MESSAGE, [roomId, senderId, text, msgType, fUrl]);
}

async function getMessages(roomId) {
  const [rows] = await db.execute(Q.GET_MESSAGES, [roomId]);
  return rows;
}

async function getRoomMembers(roomId) {
  const [rows] = await db.execute(Q.GET_ROOM_MEMBERS, [roomId]);
  return rows;
}

async function addMemberToRoom(roomId, employeeId) {
  await db.execute(Q.ADD_MEMBER_TO_ROOM, [roomId, employeeId]);
}

async function removeMemberFromRoom(roomId, employeeId) {
  await db.execute(Q.REMOVE_MEMBER_FROM_ROOM, [roomId, employeeId]);
}

async function deleteRoom(roomId) {
  // cascades should remove room_members and messages if you set FK ON DELETE CASCADE
  await db.execute("DELETE FROM chat_rooms WHERE room_id = ?", [roomId]);
}

async function deleteMessage(messageId, roomId, userId) {
  const [result] = await db.execute(Q.DELETE_MESSAGE, [
    messageId,
    roomId,
    userId,
  ]);
  if (result.affectedRows === 0) {
    const err = new Error("Message not found or not yours");
    err.status = 403;
    throw err;
  }
}

module.exports = {
  createRoom,
  getUserRooms,
  saveMessage,
  getMessages,
  getRoomMembers,
  addMemberToRoom,
  removeMemberFromRoom,
  deleteRoom,
  deleteMessage,
};
