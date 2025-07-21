const db = require("../config");
const {
  INSERT_MEETING,
  SELECT_MEETING_BY_ID,
  SELECT_MEETINGS_BY_USER,
} = require("../constants/meetingQueries");

/**
 * Insert a new meeting note and return the inserted row.
 */
async function createMeeting({
  client_company,
  contact_name,
  purpose,
  description,
  action_points,
  assigned_to,
  key_points,
  follow_up_date,
  created_by,
}) {
  console.log("[meetingService] createMeeting called with:", {
    client_company,
    contact_name,
    purpose,
    description,
    action_points,
    assigned_to,
    key_points,
    follow_up_date,
    created_by,
  });

  try {
    console.log("[meetingService] Executing INSERT_MEETING");
    const [result] = await db.execute(INSERT_MEETING, [
      client_company,
      contact_name,
      purpose,
      description,
      action_points,
      assigned_to,
      key_points,
      follow_up_date,
      created_by,
    ]);
    console.log("[meetingService] INSERT result:", result);

    const insertedId = result.insertId;
    console.log("[meetingService] Inserted ID:", insertedId);

    console.log(
      "[meetingService] Executing SELECT_MEETING_BY_ID for ID:",
      insertedId
    );
    const [rows] = await db.execute(SELECT_MEETING_BY_ID, [insertedId]);
    console.log("[meetingService] SELECT result rows:", rows);

    return rows[0];
  } catch (err) {
    console.error("[meetingService] Error in createMeeting:", err);
    throw err;
  }
}

/**
 * Fetch a meeting by its ID. Returns null if not found.
 */
async function getMeetingById(meetingId) {
  console.log("[meetingService] getMeetingById called with ID:", meetingId);

  try {
    console.log(
      "[meetingService] Executing SELECT_MEETING_BY_ID for ID:",
      meetingId
    );
    const [rows] = await db.execute(SELECT_MEETING_BY_ID, [meetingId]);
    console.log("[meetingService] SELECT result rows:", rows);
    return rows[0] || null;
  } catch (err) {
    console.error("[meetingService] Error in getMeetingById:", err);
    throw err;
  }
}

/**
 * Fetch all meetings created by the given user (alphanumeric ID).
 */
async function getMeetingsByCreator(created_by) {
  console.log("[meetingService] getMeetingsByCreator called with:", created_by);
  try {
    console.log("[meetingService] Executing SELECT_MEETINGS_BY_CREATOR");
    const [rows] = await db.execute(SELECT_MEETINGS_BY_USER, [
      created_by,
      created_by,
    ]);
    console.log(
      "[meetingService] SELECT_MEETINGS_BY_CREATOR result rows:",
      rows
    );
    return rows;
  } catch (err) {
    console.error("[meetingService] Error in getMeetingsByCreator:", err);
    throw err;
  }
}

module.exports = {
  createMeeting,
  getMeetingById,
  getMeetingsByCreator,
};
