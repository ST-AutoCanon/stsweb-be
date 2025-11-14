// src/services/reportFilters.js
// Collection of shared helpers used by handlers + reports module.

const fs = require("fs");
const path = require("path");
const util = require("util");

const reportUtils = require("./reportUtils"); // provides fetchRows
const queries = require("../constants/reportQueries");

/* ----------------- Basic small helpers ----------------- */

function coerceToString(val, fallback = null) {
  if (val === undefined || val === null) return fallback;
  if (Array.isArray(val)) val = val[val.length - 1];
  try {
    const s = String(val).trim();
    return s.length ? s : fallback;
  } catch (e) {
    return fallback;
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ----------------- Status normalizer for DB query params -------------- */

/**
 * canonicalizeStatusToken(raw)
 * - robustly normalizes a raw status string into a canonical token used across filters.
 * - returns null for empty/no-filter tokens such as "all", "null", etc.
 */
function canonicalizeStatusToken(raw) {
  if (raw === undefined || raw === null) return null;
  let s = typeof raw === "string" ? raw.trim() : String(raw).trim();
  if (!s) return null;

  // treat 'all' and obvious non-values as no filter
  const lowCheck = s.toLowerCase();
  if (["all", "null", "undefined", "none", "any"].includes(lowCheck))
    return null;

  // 1) normalize separators/punctuation to space
  s = s
    .replace(/[\u2018\u2019\u201C\u201D]/g, "") // smart quotes
    .replace(/[_\s\-–—]+/g, " ") // underscores, spaces, dashes -> single space
    .replace(/\s*\/\s*/g, "/") // keep slash compound like "approved/paid"
    .replace(/[^\w\s\/]+/g, "") // remove other punctuation except slash
    .trim()
    .toLowerCase();

  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ");

  // mapping of common variants -> canonical token values
  const map = {
    // reimbursements / generic
    approve: "approved",
    approved: "approved",
    rejecting: "rejected",
    reject: "rejected",
    rejected: "rejected",
    pending: "pending",
    paid: "paid",
    unpaid: "unpaid",
    "approved/paid": "approved/paid",
    "approved/pending": "approved/pending",
    "approved/unpaid": "approved/unpaid",

    // attendance
    "punch in": "punch in",
    "punch out": "punch out",

    // tasks (supervisor and employee) — canonical forms used by handlers
    "yet to start": "yet to start",
    "not started": "not started",
    "not-started": "not started",
    notstarted: "not started",
    "in progress": "in progress",
    inprogress: "in progress",
    "in-progress": "in progress",
    "on hold": "on hold",
    "on-hold": "on hold",
    onhold: "on hold",
    "add on": "add on",
    "add-on": "add on",
    "re work": "re work",
    "re-work": "re work",
    rework: "re work",
    incomplete: "incomplete",
    working: "working",
    "working on": "working",
    "in review": "in review",
    "in-review": "in review",

    // employees
    active: "active",
    inactive: "inactive",

    // assets
    assigned: "assigned",
    "in use": "in use",
    returned: "returned",
    decommissioned: "decommissioned",

    // employee-driven task synonyms
    completed: "completed",
    complete: "completed",
    "not started": "not started",
    working: "working",
    "in progress": "working", // map some synonyms to 'working' if desired
  };

  // If exact mapped variant exists, return it
  if (Object.prototype.hasOwnProperty.call(map, s)) return map[s];

  // If it's a compound token containing slash(s), normalize each part and rejoin
  if (s.includes("/")) {
    const parts = s
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => (Object.prototype.hasOwnProperty.call(map, p) ? map[p] : p));
    if (parts.length === 0) return null;
    return parts.join("/");
  }

  // as a fallback, return the cleaned string
  return s;
}

/**
 * normalizeStatusForQuery
 * - Accepts many UI inputs and returns a canonical token (or null for "no filter").
 * - This is the function used by SQL builders (so it returns a string that the DB compare will likely match).
 */
function normalizeStatusForQuery(status) {
  return canonicalizeStatusToken(status);
}

/* ----------------- buildDateStatusParams (used by SQL fetchers) ---------------- */

/**
 * buildDateStatusParams(startDate, endDate, status)
 *
 * Many of your SQL queries use a pattern like:
 *   WHERE (? IS NULL OR <date> >= ?) AND (? IS NULL OR <date> < DATE_ADD(?, INTERVAL 1 DAY))
 *   ... AND ( ? IS NULL OR LOWER(col) = LOWER(?) )
 *
 * To make "All" behave as "no filter", this function returns null placeholders
 * when status is null/empty/'all'.
 */
function buildDateStatusParams(startDate, endDate, status) {
  const s = startDate || null;
  const e = endDate || null;
  const st = normalizeStatusForQuery(status);
  if (!st) {
    // provide nulls so SQL clauses written as (? IS NULL OR LOWER(col)=LOWER(?)) work as expected
    return [s, s, e, e, null, null];
  }
  return [s, s, e, e, st, st];
}

/* ----------------- Field selectors ----------------- */

function keepOnlyFields(rows, requestedFields, defaultOrder) {
  if (!Array.isArray(rows)) return [];
  if (!requestedFields || requestedFields.length === 0) {
    return rows.map((r) => ({ ...r }));
  }
  const fieldsToReturn = [];
  const seen = new Set();
  for (const f of requestedFields) {
    const k = String(f || "").trim();
    if (!k) continue;
    if (!seen.has(k)) {
      fieldsToReturn.push(k);
      seen.add(k);
    }
  }
  const finalFields =
    fieldsToReturn.length > 0
      ? fieldsToReturn
      : defaultOrder || Object.keys(rows[0] || {});
  return rows.map((r) => {
    const obj = {};
    for (const f of finalFields) {
      if (Object.prototype.hasOwnProperty.call(r, f)) {
        obj[f] = r[f];
      } else {
        const lower = f.toLowerCase();
        const foundKey = Object.keys(r).find(
          (k) => String(k).toLowerCase() === lower
        );
        if (foundKey) obj[f] = r[foundKey];
        else obj[f] = ""; // preserve column but empty value
      }
    }
    return obj;
  });
}

// alias used by some handlers
function pickFields(rows, fields) {
  return keepOnlyFields(rows, fields, null);
}

/* ----------------- Reimbursement row normalization ----------------- */

function normalizeReimbursementRow(raw) {
  const r = Object.assign({}, raw);
  if (!Object.prototype.hasOwnProperty.call(r, "approval_status")) {
    r.approval_status =
      r.status !== undefined &&
      r.status !== null &&
      String(r.status).trim() !== ""
        ? r.status
        : "";
  }
  if (
    !Object.prototype.hasOwnProperty.call(r, "payment_status") ||
    r.payment_status === null
  ) {
    if (
      Object.prototype.hasOwnProperty.call(r, "raw_payment_status") &&
      r.raw_payment_status != null &&
      String(r.raw_payment_status).trim() !== ""
    ) {
      r.payment_status = r.raw_payment_status;
    } else {
      r.payment_status = r.approval_status || "";
    }
  }
  if (
    !Object.prototype.hasOwnProperty.call(r, "id") &&
    Object.prototype.hasOwnProperty.call(r, "reimbursement_id")
  ) {
    r.id = r.reimbursement_id;
  }
  if (
    !Object.prototype.hasOwnProperty.call(r, "employee_name") &&
    (r.first_name || r.last_name)
  ) {
    r.employee_name = `${r.first_name || ""} ${r.last_name || ""}`.trim();
  }
  return r;
}

/* ----------------- Employee / Department filters ----------------- */

async function applyEmployeeAndDepartmentFilters(
  rows,
  employeeId,
  departmentId
) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  let filtered = rows;

  // --- Employee filter ---
  if (employeeId != null && String(employeeId).trim() !== "") {
    const empStr = String(employeeId).trim();
    filtered = filtered.filter((r) => {
      if (r.employee_id != null) return String(r.employee_id).trim() === empStr;
      const keys = Object.keys(r);
      const foundKey = keys.find(
        (k) => String(k).toLowerCase() === "employee_id"
      );
      if (foundKey) return String(r[foundKey]).trim() === empStr;
      return Object.values(r).some((v) => String(v || "").trim() === empStr);
    });
  }

  if (!Array.isArray(filtered) || filtered.length === 0) return [];

  // --- Department filter ---
  if (departmentId != null && String(departmentId).trim() !== "") {
    const didStr = String(departmentId).trim();

    // Strict compare on department_id if present
    const hasDeptIdField = filtered.some((r) =>
      Object.prototype.hasOwnProperty.call(r, "department_id")
    );
    if (hasDeptIdField) {
      filtered = filtered.filter((r) => {
        const val = r.department_id;
        if (val === null || val === undefined) return false;
        return String(val).trim() === didStr;
      });
      return filtered;
    }

    // If rows have employee_id, try to map via employee_professional in one query
    const empIds = Array.from(
      new Set(
        filtered
          .map((r) =>
            r.employee_id != null ? String(r.employee_id).trim() : null
          )
          .filter(Boolean)
      )
    );

    if (empIds.length > 0) {
      try {
        const placeholders = empIds.map(() => "?").join(",");
        const sql = `SELECT employee_id, department_id FROM employee_professional WHERE employee_id IN (${placeholders})`;
        const deptRows = await reportUtils.fetchRows(sql, empIds);
        const empToDept = {};
        if (Array.isArray(deptRows)) {
          for (const dr of deptRows) {
            if (dr && dr.employee_id != null) {
              empToDept[String(dr.employee_id).trim()] =
                dr.department_id != null
                  ? String(dr.department_id).trim()
                  : null;
            }
          }
        }

        const hasAnyMapping = Object.keys(empToDept).length > 0;
        if (hasAnyMapping) {
          filtered = filtered.filter((r) => {
            const emp =
              r.employee_id != null ? String(r.employee_id).trim() : null;
            if (!emp) return false;
            const did = empToDept[emp];
            return did != null && String(did).trim() === didStr;
          });
          return filtered;
        }
      } catch (e) {
        console.warn(
          "[reportFilters] employee_professional lookup failed, falling back to department_name resolution:",
          e && (e.message || e)
        );
      }
    }

    // Try resolving department name by id
    try {
      let deptName = null;
      if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
        const nameRows = await reportUtils.fetchRows(
          queries.GET_DEPARTMENT_NAME_BY_ID,
          [departmentId]
        );
        if (Array.isArray(nameRows) && nameRows[0]) {
          deptName = (
            nameRows[0].name ||
            nameRows[0].department_name ||
            nameRows[0].department ||
            ""
          )
            .toString()
            .trim()
            .toLowerCase();
        }
      } else {
        const rowsDept = await reportUtils.fetchRows(
          "SELECT name FROM departments WHERE id = ? LIMIT 1",
          [departmentId]
        );
        if (Array.isArray(rowsDept) && rowsDept[0] && rowsDept[0].name) {
          deptName = String(rowsDept[0].name).trim().toLowerCase();
        }
      }

      if (deptName !== null && deptName !== "") {
        filtered = filtered.filter((r) => {
          const dn = r.department_name;
          if (dn === null || dn === undefined) return false;
          return String(dn).trim().toLowerCase() === deptName;
        });
        return filtered;
      }
    } catch (e) {
      console.warn(
        "[reportFilters] department lookup failed, skipping department_name equality filtering:",
        e && (e.message || e)
      );
    }

    // Fallback: contains match on department_name
    filtered = filtered.filter((r) => {
      const dn = r.department_name;
      if (!dn) return false;
      return String(dn).toLowerCase().includes(didStr.toLowerCase());
    });
  }

  return filtered;
}

/* ------------------ Status matching utilities ----------------- */

/**
 * normalizeForCompare
 * removes non-alphanumeric characters and collapses to lowercase for robust comparisons.
 */
function normalizeForCompare(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\/]+/g, "") // keep slashes for compound statuses
    .replace(/_+/g, "")
    .replace(/-+/g, "");
}

/**
 * statusMatches(requestedStatus, rowStatusCandidates)
 *
 * - requestedStatus: token returned by normalizeStatusForQuery (string or null)
 * - rowStatusCandidates: array of values from the row (e.g. [r.status, r.payment_status])
 *
 * Returns true when:
 *  - requestedStatus is null -> no filter (true)
 *  - requestedStatus contains "/" -> split into parts and require every part to appear (partial match allowed)
 *  - otherwise require any candidate to match or contain the token
 *
 * Matching is done on canonicalized forms (canonicalizeStatusToken) first and falls back to normalized string compare.
 */
function statusMatches(requestedStatus, rowStatusCandidates = []) {
  if (!requestedStatus) return true;
  const reqRaw = String(requestedStatus || "").trim();
  if (!reqRaw) return true;

  // Attempt canonical forms
  const reqCanon = canonicalizeStatusToken(reqRaw);
  const candidateCanons = (
    Array.isArray(rowStatusCandidates) ? rowStatusCandidates : []
  )
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .filter(Boolean)
    .map((v) => canonicalizeStatusToken(v));

  // If any candidate canonical matches requested canonical, return true
  if (reqCanon) {
    for (const cc of candidateCanons) {
      if (!cc) continue;
      // direct equality
      if (cc === reqCanon) return true;
      // partial: requested contained in candidate (e.g. "in progress" vs "in progress qa")
      if (cc.includes(reqCanon) || reqCanon.includes(cc)) return true;
      // compound handling if either side has slash
      if (reqCanon.includes("/")) {
        const parts = reqCanon
          .split("/")
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.every((p) => cc.includes(p))) return true;
      }
    }
  }

  // Fallback to normalized compare for older DB values
  const reqNorm = normalizeForCompare(reqRaw);
  const normalizedRowVals = (
    Array.isArray(rowStatusCandidates) ? rowStatusCandidates : []
  )
    .map((v) => (v === null || v === undefined ? "" : String(v)))
    .filter(Boolean)
    .map(normalizeForCompare);

  if (normalizedRowVals.length === 0) return false;

  // compound: require all parts to be present in at least one candidate or across candidates
  if (reqNorm.includes("/")) {
    const parts = reqNorm
      .split("/")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return false;
    const ok = parts.every((part) =>
      normalizedRowVals.some((rv) => rv === part || rv.includes(part))
    );
    if (ok) return true;
  }

  // single token: match if any candidate matches exactly or contains token
  if (normalizedRowVals.some((rv) => rv === reqNorm || rv.includes(reqNorm))) {
    return true;
  }

  // debug: when nothing matched, log the request and the canonical candidates (non-production only)
  if (process && process.env && process.env.NODE_ENV !== "production") {
    try {
      const candidDisplay = JSON.stringify({
        requested: { raw: reqRaw, canon: reqCanon, norm: reqNorm },
        candidates: candidateCanons,
        normalizedRowVals,
      });
      console.debug(
        `[reportFilters] statusMatches NO MATCH => ${candidDisplay}`
      );
    } catch (e) {
      /* ignore logging errors */
    }
  }

  return false;
}

/* ------------------ Preview helpers ------------------ */

/**
 * isPreviewRequest(req)
 * - returns true when request is intended for preview (JSON UI preview)
 * - checks ?preview=true OR Accept header indicating JSON
 */
function isPreviewRequest(req) {
  if (!req) return false;
  const q = req.query && req.query.preview;
  const accept = req.headers && req.headers.accept;
  return (
    (typeof q === "string" && q.toLowerCase() === "true") ||
    q === true ||
    (accept && accept.includes("application/json"))
  );
}

/**
 * sendPreviewResponse(req, res, rows, message?)
 * - rows: array of preview rows (may be undefined/null)
 * - message: optional friendly message to include in response when rows empty
 *
 * Response shape (always 200):
 * { rows: [...], totalRows: N, message?: "...", meta?: { status, departmentName, employeeName } }
 *
 * Supports previewLimit via req.query.previewLimit (same behavior as before).
 */
async function sendPreviewResponse(req, res, rows, message) {
  const limitRaw = req.query && req.query.previewLimit;
  let previewLimit = null;
  if (limitRaw != null) {
    const n = parseInt(limitRaw, 10);
    previewLimit = Number.isFinite(n) && n > 0 ? n : null;
  }
  const safeRows = Array.isArray(rows) ? rows : [];
  const totalRows = safeRows.length;
  const outRows =
    previewLimit && previewLimit > 0
      ? safeRows.slice(0, previewLimit)
      : safeRows;

  // Build metadata from request: status, departmentName (resolved), employeeName (if provided)
  const meta = {};

  try {
    // raw status from query - preserve original form if possible then normalize
    const rawStatus = coerceToString(req.query && req.query.status, null);
    meta.status = rawStatus ? normalizeStatusForQuery(rawStatus) : null;
  } catch (e) {
    meta.status = null;
  }

  // department name resolution (if department_id provided)
  try {
    const depId = coerceToString(
      req.query && (req.query.department_id || req.query.departmentId),
      null
    );
    if (depId) {
      // prefer configured query if available
      if (queries && queries.GET_DEPARTMENT_NAME_BY_ID) {
        try {
          const nameRows = await reportUtils.fetchRows(
            queries.GET_DEPARTMENT_NAME_BY_ID,
            [depId]
          );
          if (Array.isArray(nameRows) && nameRows[0]) {
            meta.departmentName =
              nameRows[0].department_name ||
              nameRows[0].name ||
              nameRows[0].department ||
              String(nameRows[0]).slice(0, 100);
          }
        } catch (e) {
          // ignore and fall through to fallback query
        }
      }
      if (!meta.departmentName) {
        try {
          const rowsDept = await reportUtils.fetchRows(
            "SELECT name FROM departments WHERE id = ? LIMIT 1",
            [depId]
          );
          if (Array.isArray(rowsDept) && rowsDept[0] && rowsDept[0].name) {
            meta.departmentName = String(rowsDept[0].name);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // employee name: prefer an explicit employee_name param (frontend will send when user typed name)
  try {
    const typedEmployeeName = coerceToString(
      req.query && (req.query.employee_name || req.query.employeeName),
      null
    );
    if (typedEmployeeName) {
      meta.employeeName = typedEmployeeName;
    } else {
      const empId = coerceToString(
        req.query && (req.query.employee_id || req.query.employeeId),
        null
      );
      if (empId) {
        // try configured query first
        if (queries && queries.GET_EMPLOYEE_NAME_BY_ID) {
          try {
            const empRows = await reportUtils.fetchRows(
              queries.GET_EMPLOYEE_NAME_BY_ID,
              [empId]
            );
            if (Array.isArray(empRows) && empRows[0]) {
              meta.employeeName =
                empRows[0].employee_name ||
                (empRows[0].first_name || "") +
                  " " +
                  (empRows[0].last_name || "");
            }
          } catch (e) {
            // ignore
          }
        }
        if (!meta.employeeName) {
          try {
            const en = await reportUtils.fetchRows(
              "SELECT CONCAT(COALESCE(first_name,''),' ',COALESCE(last_name,'')) AS employee_name FROM employees WHERE employee_id = ? LIMIT 1",
              [empId]
            );
            if (Array.isArray(en) && en[0] && en[0].employee_name) {
              meta.employeeName = String(en[0].employee_name).trim();
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  const out = { rows: outRows, totalRows };
  if (message && typeof message === "string" && message.trim().length > 0) {
    out.message = message;
  } else if (safeRows.length === 0) {
    out.message = "No data for selected date range";
  }
  if (Object.keys(meta).length > 0) out.meta = meta;

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json(out);
}

/* ------------------ Filename + Date window helpers ------------------ */

function safeFilename(base, ext) {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  return `${base}_${now}.${ext}`;
}

const MAX_RANGE_DAYS = 62;

function parseDateISO(d) {
  if (!d) return null;
  if (typeof d !== "string") return null;
  const parts = d.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day))
    return null;
  return new Date(Date.UTC(y, m, day));
}

function daysBetweenInclusive(startIso, endIso) {
  const s = parseDateISO(startIso);
  const e = parseDateISO(endIso);
  if (!s || !e) return Infinity;
  const diffMs = e.getTime() - s.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function ensureTwoMonthWindow(startDate, endDate) {
  const now = new Date();
  if (!startDate && !endDate) {
    const end = now;
    const start = new Date(now);
    start.setMonth(start.getMonth() - 2);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { ok: true, startDate: fmt(start), endDate: fmt(end) };
  }
  if (!startDate || !endDate) {
    return {
      ok: false,
      message:
        "Please provide both startDate and endDate, or leave both empty to use the default last 2 months range.",
    };
  }
  const s = parseDateISO(startDate);
  const e = parseDateISO(endDate);
  if (!s || !e)
    return { ok: false, message: "Invalid date format. Use YYYY-MM-DD." };
  if (s > e)
    return { ok: false, message: "Start date cannot be after End date." };
  const numDays = daysBetweenInclusive(startDate, endDate);
  if (numDays > MAX_RANGE_DAYS) {
    return {
      ok: false,
      message: `Requested range is too large: ${numDays} days. Maximum allowed range is ${MAX_RANGE_DAYS} days (≈ 2 months).`,
    };
  }
  return { ok: true, startDate, endDate };
}

/* ----------------- Date/Query parsing helper (for handlers) ---------------- */
function parseDates(q) {
  const rawFormat = coerceToString(q.format, "xlsx");
  const format = (rawFormat || "xlsx").toLowerCase();

  const rawStatus = coerceToString(q.status, null);
  // if raw is "all" -> treated as null below by normalizeStatusForQuery
  const statusCandidate = rawStatus || null;
  const status = normalizeStatusForQuery(statusCandidate);

  const startDate = coerceToString(q.startDate, null);
  const endDate = coerceToString(q.endDate, null);

  const rawFields = coerceToString(q.fields, null);
  const fields = rawFields
    ? String(rawFields)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  return {
    startDate: startDate || null,
    endDate: endDate || null,
    status: status || null,
    format,
    fields,
  };
}

/* ----------------- Export ----------------- */

module.exports = {
  coerceToString,
  escapeHtml,

  // parsing + validation
  parseDates,
  ensureTwoMonthWindow,
  parseDateISO,
  daysBetweenInclusive,
  MAX_RANGE_DAYS,

  // preview helpers
  isPreviewRequest,
  sendPreviewResponse,

  // filename
  safeFilename,

  // status/date params
  normalizeStatusForQuery,
  buildDateStatusParams,

  // field helpers
  keepOnlyFields,
  pickFields,

  // reimbursements normalization
  normalizeReimbursementRow,

  // filtering
  applyEmployeeAndDepartmentFilters,

  // status matcher (compat)
  normalizeForCompare,
  statusMatches,
};
