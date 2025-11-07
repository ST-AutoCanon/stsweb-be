// src/services/reportUtils.js
// DB utility (fetchRows). Uses project config exported from ../config

const db = require("../config");

/**
 * Count '?' placeholders in SQL while ignoring question marks inside string literals.
 * This is a best-effort parser (handles single-quoted and double-quoted strings).
 */
function countPlaceholders(sql) {
  if (!sql || typeof sql !== "string") return 0;
  let inSingle = false;
  let inDouble = false;
  let count = 0;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) {
      // toggle single-quote (ignore escaped quotes \' )
      if (!(i > 0 && sql[i - 1] === "\\")) inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      if (!(i > 0 && sql[i - 1] === "\\")) inDouble = !inDouble;
    } else if (ch === "?" && !inSingle && !inDouble) {
      count++;
    }
  }
  return count;
}

/**
 * fetchRows(sql, params) -> returns array of rows.
 * - Pads params with nulls if params.length < placeholder count (common cause of mysqld_stmt_execute error)
 * - Supports mysql2/promise style responses ([rows, fields]) and plain arrays.
 * - Prefers db.execute if present, otherwise uses db.query.
 */
async function fetchRows(sql, params = []) {
  if (!sql || typeof sql !== "string") {
    console.error("[reportUtils] fetchRows called with invalid SQL:", sql);
    throw new Error(
      "reportService: SQL query is missing or invalid. Check ../constants/reportQueries.js for missing keys."
    );
  }
  if (
    !db ||
    (typeof db.query !== "function" && typeof db.execute !== "function")
  ) {
    throw new Error("DB not available. Check ../config export.");
  }

  // Ensure params is an array
  if (!Array.isArray(params)) {
    params = [params];
  }

  // Count placeholders and pad params if necessary
  try {
    const placeholderCount = countPlaceholders(sql);
    if (placeholderCount > params.length) {
      const before = params.length;
      const toPad = placeholderCount - params.length;
      for (let i = 0; i < toPad; i++) params.push(null);
      console.debug(
        `[reportUtils] padded params to match placeholders { placeholderCount: ${placeholderCount}, paramsLength: ${before} }`
      );
    }
  } catch (e) {
    // non-fatal: continue
  }

  // Execute the query using whichever method the exported db offers
  try {
    let res;
    if (typeof db.execute === "function") {
      // prefer execute (prepared statement)
      res = await db.execute(sql, params);
    } else {
      // fallback to query
      res = await db.query(sql, params);
    }

    // mysql2/promise often returns [rows, fields]
    if (Array.isArray(res) && res.length > 0 && Array.isArray(res[0])) {
      return res[0];
    }
    // some drivers return { rows } or an array of rows
    if (Array.isArray(res)) {
      return res;
    }
    if (res && typeof res === "object" && Array.isArray(res.rows)) {
      return res.rows;
    }
    // if we got anything else, return empty array
    return [];
  } catch (err) {
    // Enrich error with SQL and params for easier debugging (keeps original message)
    const safeParams = Array.isArray(params)
      ? params.map((p) => {
          try {
            if (p === null) return null;
            if (typeof p === "string" && p.length > 200)
              return `${p.slice(0, 200)}...`;
            return p;
          } catch (e) {
            return String(p);
          }
        })
      : params;
    const enriched = new Error(
      `[reportUtils] fetchRows error: ${
        err && err.message ? err.message : String(err)
      }\nSQL: \n${sql}\n -- params: ${JSON.stringify(safeParams)}`
    );
    // preserve stack if possible
    enriched.stack = err && err.stack ? err.stack : enriched.stack;
    console.error(enriched.message);
    throw enriched;
  }
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
