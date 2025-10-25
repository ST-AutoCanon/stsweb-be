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
    const s = String(val);
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
function normalizeStatusForQuery(status) {
  if (status === undefined || status === null) return null;
  if (typeof status !== "string") return status;
  const s = status.trim();
  if (s === "") return null;
  const low = s.toLowerCase();

  // treat 'all' as a special case (no filtering)
  if (low === "all" || low === "null" || low === "undefined") return null;

  // Accept many synonyms/use-cases used in UI for different modules
  const accepted = new Set([
    // attendance
    "punch in",
    "punch out",

    // generic / workflow
    "pending",
    "inprogress",
    "in progress",
    "completed",
    "rejected",
    "approved",
    "onhold",
    "on hold",
    "paid",
    "unpaid",
    "approved/paid",
    "approved/pending",
    "approved/unpaid",
    "active",
    "inactive",
    "assigned",
    "in use",
    "returned",
    "decommissioned",

    // tasks - employee driven (weekly_tasks)
    "completed",
    "add on",
    "add-on",
    "addon",
    "re work",
    "rework",
    "re-work",
    "incomplete",
    "incompleted",

    // tasks - supervisor driven (tasks)
    "yet to start",
    "yet_to_start",
    "in progress",
    "inprogress",
    "on hold",
    "onhold",
  ]);

  if (!accepted.has(low)) {
    console.warn(
      `[reportFilters] Invalid status value: ${s}. Using null instead.`
    );
    return null;
  }

  // Canonicalize common variants into stable tokens used downstream.
  switch (low) {
    case "punch in":
      return "Punch In";
    case "punch out":
      return "Punch Out";

    case "add-on":
    case "addon":
    case "add on":
      return "Add on";
    case "rework":
    case "re-work":
    case "re work":
      return "Re work";
    case "incomplete":
    case "incompleted":
      return "Incomplete";

    case "yet to start":
    case "yet_to_start":
      return "Yet to Start";
    case "in progress":
    case "inprogress":
      return "In Progress";
    case "on hold":
    case "onhold":
      return "On Hold";

    default:
      return s;
  }
}

/* ----------------- buildDateStatusParams (used by SQL fetchers) ---------------- */

function buildDateStatusParams(startDate, endDate, status) {
  const s = startDate || null;
  const e = endDate || null;
  const st = normalizeStatusForQuery(status);
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
        else obj[f] = "";
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

function normalizeForCompare(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, "");
}

function statusMatches(requestedStatus, rowStatusCandidates = []) {
  const req = normalizeForCompare(requestedStatus || "");
  if (!req) return true;
  for (const cand of rowStatusCandidates) {
    if (!cand) continue;
    const n = normalizeForCompare(cand);
    if (n === req) return true;
    if (n.includes(req) || req.includes(n)) return true;
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
  const statusCandidate =
    rawStatus && String(rawStatus).trim().toLowerCase() === "all"
      ? null
      : rawStatus;
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

  // status matcher
  normalizeForCompare,
  statusMatches,
};
