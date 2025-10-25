// src/services/reportUtils.js
// DB utility (fetchRows). Uses project config exported from ../config

const db = require("../config");

/**
 * fetchRows(sql, params) -> returns array of rows
 * Supports mysql2/promise style responses ([rows, fields]) and plain arrays.
 */
async function fetchRows(sql, params = []) {
  if (!sql || typeof sql !== "string") {
    console.error("[reportUtils] fetchRows called with invalid SQL:", sql);
    throw new Error(
      "reportService: SQL query is missing or invalid. Check ../constants/reportQueries.js for missing keys."
    );
  }
  if (!db || typeof db.query !== "function") {
    throw new Error("DB not available. Check ../config export.");
  }

  const res = await db.query(sql, params);
  // mysql2/promise often returns [rows, fields]
  if (Array.isArray(res) && res.length > 0 && Array.isArray(res[0])) {
    return res[0];
  }
  return Array.isArray(res) ? res : [];
}

/** light helper used by some handlers */
function coerceToString(val, fallback = null) {
  if (val === undefined || val === null) return fallback;
  if (Array.isArray(val)) val = val[val.length - 1];
  try {
    const s = String(val);
    return s.length ? s : fallback;
  } catch (e) {
    return fallback;
  }
}

module.exports = {
  fetchRows,
  coerceToString,
};
