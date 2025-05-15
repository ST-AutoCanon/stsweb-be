module.exports = {
  // — Rooms —
  CREATE_ROOM: `
    INSERT INTO chat_rooms (room_name, is_group, created_by)
    VALUES (?, ?, ?)
  `,
  GET_ROOMS_FOR_USER: `
    SELECT
      r.room_id AS id,
      r.created_by AS createdBy,
      CASE
        WHEN r.is_group = 1 THEN r.room_name
        ELSE CONCAT(
          ANY_VALUE(e2.first_name), ' ', ANY_VALUE(e2.last_name)
        )
      END                                      AS name,
      CASE
        WHEN r.is_group = 1 THEN NULL
        ELSE ANY_VALUE(e2.photo_url)
      END                                      AS photo_url,
      CASE
        WHEN r.is_group = 1 THEN NULL
        ELSE ANY_VALUE(e2.role)
      END                                      AS role,
      CASE
        WHEN r.is_group = 1 THEN NULL
        ELSE ANY_VALUE(e2.gender)
      END                                      AS gender,
      r.is_group                               AS is_group,
      r.created_at
    FROM chat_rooms r
    JOIN room_members m
      ON m.room_id = r.room_id
      AND m.employee_id = ?
    LEFT JOIN room_members m2
      ON m2.room_id = r.room_id
      AND m2.employee_id <> ?
    LEFT JOIN employees e2
      ON e2.employee_id = m2.employee_id
    GROUP BY r.room_id
    ORDER BY r.created_at DESC
  `,
  ADD_MEMBER: `
    INSERT IGNORE INTO room_members (room_id, employee_id)
    VALUES (?, ?)
  `,

  // — Messages —
  SAVE_MESSAGE: `
    INSERT INTO messages
      (room_id, sender_id, message_text, type, file_url)
    VALUES (?, ?, ?, ?, ?)
  `,
  GET_MESSAGES: `
    SELECT
      m.message_id    AS id,
      m.sender_id,
      CONCAT(e.first_name, ' ', e.last_name) AS sender_name,
      e.photo_url AS photo_url,
      m.message_text  AS content,
      m.type          AS type,
      m.file_url      AS file_url,
      m.created_at    AS sent_at
    FROM messages m
    JOIN employees e
      ON e.employee_id = m.sender_id
    WHERE m.room_id = ?
    ORDER BY m.created_at ASC
  `,

  FIND_PRIVATE_ROOM: `
    SELECT r.room_id
    FROM chat_rooms r
    JOIN room_members m1 ON m1.room_id = r.room_id AND m1.employee_id = ?
    JOIN room_members m2 ON m2.room_id = r.room_id AND m2.employee_id = ?
    WHERE r.is_group = 0
    LIMIT 1
  `,
  GET_ROOM_MEMBERS: `
  SELECT
    e.employee_id   AS employee_id,
    CONCAT(e.first_name, ' ', e.last_name) AS name,
    e.photo_url     AS photo_url,
    e.role          AS role,
    e.gender        AS gender,
    rm.joined_at    AS joined_at,
    cr.created_by   AS creatorId
  FROM room_members rm
  JOIN employees e
    ON e.employee_id = rm.employee_id
  JOIN chat_rooms cr
    ON cr.room_id = rm.room_id
  WHERE rm.room_id = ?
  ORDER BY rm.joined_at ASC
`,

  ADD_MEMBER_TO_ROOM: `
    INSERT IGNORE INTO room_members (room_id, employee_id)
    VALUES (?, ?)
  `,
  REMOVE_MEMBER_FROM_ROOM: `
    DELETE FROM room_members
    WHERE room_id = ? AND employee_id = ?
  `,
  DELETE_MESSAGE: `
    DELETE FROM messages
     WHERE message_id = ?
       AND room_id    = ?
       AND sender_id  = ?
  `,
};
