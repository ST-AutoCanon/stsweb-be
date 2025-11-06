// src/handlers/reportAttendanceHandler.js
const reportService = require("../services/reportIndex");
const {
  coerceToString,
  isPreviewRequest,
  sendPreviewResponse,
  safeFilename,
  parseDates,
  ensureTwoMonthWindow,
} = require("../services/reportFilters");

const db = require("../config");
const mysql = require("mysql2"); // keep if you use mysql formatting elsewhere

/**
 * dbExec - supports both promise-style and callback-style mysql clients.
 * - Sanitizes params (undefined -> null).
 * - Prefers db.query (promise or callback) and falls back to db.execute.
 * Returns [rows, fields] or throws.
 */
async function dbExec(sql, params = []) {
  try {
    if (!Array.isArray(params)) params = [params];
    // sanitize undefined -> null
    params = params.map((p) => (typeof p === "undefined" ? null : p));

    // Prefer db.query (promise or callback)
    if (db && typeof db.query === "function") {
      const maybePromise = db.query(sql, params);
      if (maybePromise && typeof maybePromise.then === "function") {
        const result = await maybePromise; // mysql2/promise pool.query returns [rows, fields]
        if (Array.isArray(result)) return result;
        return [result, null];
      } else {
        return await new Promise((resolve, reject) => {
          db.query(sql, params, (err, rows, fields) => {
            if (err) return reject(err);
            resolve([rows, fields]);
          });
        });
      }
    }

    // Fallback to db.execute
    if (db && typeof db.execute === "function") {
      const maybePromise = db.execute(sql, params);
      if (maybePromise && typeof maybePromise.then === "function") {
        const result = await maybePromise; // returns [rows, fields]
        if (Array.isArray(result)) return result;
        return [result, null];
      } else {
        return await new Promise((resolve, reject) => {
          db.execute(sql, params, (err, rows, fields) => {
            if (err) return reject(err);
            resolve([rows, fields]);
          });
        });
      }
    }

    throw new Error("DB client has no execute/query method");
  } catch (e) {
    console.error(
      "[reportAttendanceHandler][dbExec] error:",
      e && (e.stack || e.message)
    );
    throw e;
  }
}

/**
 * Find employee id in request. Handles strings, numbers and JSON-stringified objects.
 * Returns a plain employee id string (e.g. "STS105") or null.
 */
function findEmployeeIdInRequest(req) {
  const safe = (v) =>
    v === undefined || v === null ? null : String(v).trim() || null;

  const tryParseCandidate = (raw) => {
    if (raw === null || typeof raw === "undefined") return null;
    const s = String(raw).trim();
    if (!s) return null;
    if (
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith('"') && s.endsWith('"'))
    ) {
      try {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === "object") {
          return (
            safe(parsed.employee_id) ||
            safe(parsed.employeeId) ||
            safe(parsed.id) ||
            safe(parsed.user_id) ||
            safe(parsed.email) ||
            null
          );
        }
      } catch (e) {
        // not JSON — ignore
      }
    }
    return s;
  };

  const headerCandidates = [
    "x-employee-id",
    "x-employeeid",
    "x-emp-id",
    "x-user-id",
    "x-user",
  ];
  for (const h of headerCandidates) {
    const raw = req.headers && req.headers[h];
    const candidate = tryParseCandidate(raw);
    if (candidate) {
      if (
        candidate &&
        (candidate.startsWith("{") || candidate.includes('"employeeId"'))
      ) {
        try {
          const p = JSON.parse(candidate);
          const extracted =
            safe(p.employee_id) ||
            safe(p.employeeId) ||
            safe(p.id) ||
            safe(p.user_id) ||
            safe(p.email) ||
            null;
          if (extracted) return extracted;
        } catch (e) {
          // fallthrough
        }
      }
      if (candidate && !candidate.startsWith("{")) return candidate;
    }
  }

  const r1 = req.employeeId ?? req.employee_id ?? req.userId ?? req.user_id;
  if (r1) {
    const candidate = tryParseCandidate(r1);
    if (candidate && !candidate.startsWith("{")) return candidate;
    if (candidate && candidate.startsWith("{")) {
      try {
        const p = JSON.parse(candidate);
        const extracted =
          safe(p.employee_id) ||
          safe(p.employeeId) ||
          safe(p.id) ||
          safe(p.user_id) ||
          safe(p.email) ||
          null;
        if (extracted) return extracted;
      } catch (e) {}
    }
  }

  const user = req.user || req.authUser || req.auth || req.session?.user;
  if (user && typeof user === "object") {
    const cand =
      safe(user.employee_id) ||
      safe(user.employeeId) ||
      safe(user.id) ||
      safe(user.user_id) ||
      safe(user.email);
    if (cand) return cand;
    const userStr = tryParseCandidate(user);
    if (userStr && !userStr.startsWith("{")) return userStr;
  }

  const auth = safe(req.headers && req.headers.authorization);
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token.split(".").length === 3) {
      try {
        const payloadRaw = Buffer.from(token.split(".")[1], "base64").toString(
          "utf8"
        );
        const payload = JSON.parse(payloadRaw);
        const candidate =
          safe(payload.employee_id) ||
          safe(payload.employeeId) ||
          safe(payload.sub) ||
          safe(payload.id) ||
          safe(payload.user_id) ||
          null;
        if (candidate) return candidate;
      } catch (e) {
        // ignore invalid token
      }
    }
  }

  const qCandidate =
    tryParseCandidate(
      req.query && (req.query.employee_id || req.query.employeeId)
    ) ||
    tryParseCandidate(
      req.body && (req.body.employee_id || req.body.employeeId)
    );
  if (qCandidate) return qCandidate;

  return null;
}

/**
 * More tolerant local filter for attendance rows:
 * - accepts employeeId or departmentId/name
 * - compares numeric dept ids when possible, otherwise case-insensitive name match
 */
function filterAttendanceRows(rows, employeeId, departmentId) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!employeeId && !departmentId) return rows;

  const empIdStr = employeeId ? String(employeeId).trim() : null;
  const deptIdRaw = departmentId ? String(departmentId).trim() : null;

  // detect if dept filter is numeric id or a name
  const deptFilterNum =
    deptIdRaw && /^-?\d+$/.test(deptIdRaw) ? Number(deptIdRaw) : null;
  const deptFilterName =
    deptFilterNum === null && deptIdRaw ? deptIdRaw.toLowerCase() : null;

  return rows.filter((r) => {
    // normalize row employee id
    const rowEmpId =
      r.employee_id != null ? String(r.employee_id).trim() : null;

    // normalize potential dept fields on the row (multiple shapes)
    let rowDeptId = null;
    let rowDeptName = null;

    // common column names returned by your SQL/service
    if (r.department_id != null) rowDeptId = Number(r.department_id);
    if (r.pr_department_id != null) rowDeptId = Number(r.pr_department_id);
    if (r.departmentId != null) rowDeptId = Number(r.departmentId);
    if (r.department_name != null)
      rowDeptName = String(r.department_name).toLowerCase();
    if (!rowDeptName && r.departmentName != null)
      rowDeptName = String(r.departmentName).toLowerCase();
    if (!rowDeptName && r.department != null)
      rowDeptName = String(r.department).toLowerCase();

    // employee filtering — strict
    if (empIdStr && rowEmpId !== empIdStr) return false;

    // department filtering
    if (deptFilterNum !== null) {
      // if filter is numeric, require rowDeptId to match
      if (rowDeptId == null) return false;
      if (Number(rowDeptId) !== Number(deptFilterNum)) return false;
      return true;
    } else if (deptFilterName !== null) {
      // filter is a name — compare against rowDeptName or rowDeptId converted via depts table later
      if (rowDeptName && rowDeptName === deptFilterName) return true;
      // also allow numeric rowDeptId if the caller passed a name that is numeric-like (rare)
      if (rowDeptId != null && String(rowDeptId) === deptIdRaw) return true;
      return false;
    }

    // no department filter — row passed employee filter (or neither filter present)
    return true;
  });
}

/**
 * Map employees in rows to their department_id (if missing on rows) by querying employee_professional.
 * Mutates rows in-place to add pr_department_id when found.
 */
async function attachDeptInfoForRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const empIds = Array.from(
    new Set(
      rows
        .map((r) => (r.employee_id != null ? String(r.employee_id) : null))
        .filter(Boolean)
    )
  );

  if (empIds.length === 0) return;

  // Build placeholders and params
  const placeholders = empIds.map(() => "?").join(",");
  const sql = `SELECT employee_id, department_id FROM employee_professional WHERE employee_id IN (${placeholders})`;
  try {
    const [dbRows] = await dbExec(sql, empIds);
    const map = new Map();
    if (Array.isArray(dbRows)) {
      for (const dr of dbRows) {
        if (dr && dr.employee_id)
          map.set(String(dr.employee_id), dr.department_id);
      }
    }
    // attach
    for (const r of rows) {
      const eid = r.employee_id != null ? String(r.employee_id) : null;
      if (eid && r.pr_department_id == null && r.department_id == null) {
        const did = map.get(eid);
        if (typeof did !== "undefined" && did !== null) {
          // set pr_department_id so filterAttendanceRows will see it
          r.pr_department_id = did;
        }
      }
    }
  } catch (e) {
    // don't hard-fail the whole flow — just log and continue (filter may still remove rows)
    console.warn(
      "[reportAttendanceHandler] attachDeptInfoForRows failed:",
      e && e.message
    );
  }
}

/**
 * Build render meta from request query.
 * - Prefer department_name / departmentName / department if present.
 * - If only department_id / departmentId present and numeric, lookup departments table to get readable name.
 */
async function buildMetaFromReqQuery(query = {}) {
  const meta = {};
  const rawStatus =
    coerceToString(query.status, null) ||
    coerceToString(query.punch_status, null);
  if (rawStatus) {
    try {
      meta.status = rawStatus;
    } catch (e) {
      meta.status = rawStatus;
    }
  }

  // Employee name or fallback to id
  const typedEmployeeName =
    coerceToString(query.employee_name, null) ||
    coerceToString(query.employeeName, null) ||
    coerceToString(query.employee, null);
  if (typedEmployeeName) {
    meta.employeeName = typedEmployeeName;
  } else {
    const empId =
      coerceToString(query.employee_id, null) ||
      coerceToString(query.employeeId, null);
    if (empId) meta.employeeName = empId;
  }

  // Department: prefer name-like fields, otherwise resolve department_id -> name
  let typedDept =
    coerceToString(query.department_name, null) ||
    coerceToString(query.departmentName, null) ||
    coerceToString(query.department, null);

  if (typedDept) {
    meta.department = typedDept;
  } else {
    // try department_id or departmentId
    const deptId =
      coerceToString(query.department_id, null) ||
      coerceToString(query.departmentId, null);

    if (deptId) {
      // if deptId is numeric, try lookup in departments table
      if (/^\d+$/.test(deptId)) {
        try {
          const [rows] = await dbExec(
            `SELECT id, department_name, departmentName, name FROM departments WHERE id = ? LIMIT 1`,
            [deptId]
          );
          if (Array.isArray(rows) && rows[0]) {
            const rec = rows[0];
            const name =
              coerceToString(rec.department_name, null) ||
              coerceToString(rec.departmentName, null) ||
              coerceToString(rec.name, null);
            if (name) meta.department = name;
            else meta.department = String(rec.id);
          } else {
            // no row found — fallback to raw id string
            meta.department = deptId;
          }
        } catch (e) {
          console.warn(
            "[reportAttendanceHandler] lookup department name failed:",
            e && e.message
          );
          // fallback to raw id if lookup fails
          meta.department = deptId;
        }
      } else {
        // deptId isn't numeric — treat it as a name
        meta.department = deptId;
      }
    }
  }

  return meta;
}

async function downloadAttendanceReport(req, res) {
  console.log(
    "[reportAttendanceHandler] downloadAttendanceReport called - query:",
    req.query
  );

  try {
    const parsed = parseDates(req.query || {});
    let { startDate, endDate, status, format, fields } = parsed;

    const employeeIdQuery = coerceToString(req.query.employee_id, null);
    let departmentIdQuery = coerceToString(req.query.department_id, null);

    // find requester employee id and derive department if needed
    const requesterEmpId = findEmployeeIdInRequest(req);
    if (requesterEmpId) {
      console.debug(
        "[reportAttendanceHandler] requester employee id discovered:",
        requesterEmpId
      );
    } else {
      console.debug(
        "[reportAttendanceHandler] no requester employee id discovered in request"
      );
    }

    if (!departmentIdQuery && requesterEmpId) {
      const derived = await (async (id) => {
        try {
          const [rows] = await dbExec(
            `SELECT department_id FROM employee_professional WHERE employee_id = ? LIMIT 1`,
            [id]
          );
          if (Array.isArray(rows) && rows[0] && rows[0].department_id != null)
            return String(rows[0].department_id);
        } catch (e) {
          console.warn(
            "[reportAttendanceHandler] lookupDeptForEmployee failed:",
            e && e.message
          );
        }
        return null;
      })(requesterEmpId);

      if (derived) {
        departmentIdQuery = derived;
        console.debug(
          "[reportAttendanceHandler] derived department for requester:",
          departmentIdQuery
        );
      } else {
        console.debug(
          "[reportAttendanceHandler] could not derive department for requester:",
          requesterEmpId
        );
      }
    } else if (departmentIdQuery) {
      console.debug(
        "[reportAttendanceHandler] using department_id from query:",
        departmentIdQuery
      );
    }

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    if (typeof reportService.getAttendanceRows !== "function") {
      console.error(
        "[reportAttendanceHandler] reportService.getAttendanceRows missing"
      );
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    let rows = await reportService.getAttendanceRows(
      startDate,
      endDate,
      status,
      fields,
      employeeIdQuery,
      null // pass null dept to service; we'll do local scoping if required
    );

    // ensure rows is array
    rows = Array.isArray(rows) ? rows : [];

    // debug: log effective date window and number of rows returned BEFORE local filtering
    console.debug("[reportAttendanceHandler] effective date window:", {
      startDate,
      endDate,
    });
    console.debug(
      "[reportAttendanceHandler] rows returned from service BEFORE filtering:",
      rows.length
    );
    if (rows.length > 0) {
      try {
        console.debug(
          "[reportAttendanceHandler] sample row:",
          JSON.stringify(rows[0])
        );
      } catch (e) {
        console.debug(
          "[reportAttendanceHandler] sample row (stringify failed):",
          rows[0]
        );
      }
    }

    // If department filter present but rows lack department info, try to attach department info for rows
    const needLocalFiltering = Boolean(
      employeeIdQuery || departmentIdQuery || requesterEmpId
    );
    if (needLocalFiltering && rows.length > 0) {
      // If dept filter present and no rows contain any department columns, attach mapping from employee_professional
      const anyHasDept = rows.some(
        (r) =>
          r.department_id != null ||
          r.pr_department_id != null ||
          r.departmentName != null ||
          r.department_name != null
      );

      if (!anyHasDept && departmentIdQuery) {
        // attach department info for rows
        await attachDeptInfoForRows(rows);
      }

      // Now run the tolerant local filter (emp or dept)
      rows = filterAttendanceRows(
        rows,
        employeeIdQuery || null,
        departmentIdQuery || null
      );
      console.debug(
        "[reportAttendanceHandler] rows after local filtering:",
        rows.length
      );
    }

    // Preview: always 200 JSON; include friendly message when empty
    if (isPreviewRequest(req)) {
      const msg =
        rows.length === 0
          ? "No attendance data for selected date range"
          : undefined;
      return sendPreviewResponse(req, res, rows, msg);
    }

    if (!Array.isArray(rows))
      return res
        .status(500)
        .json({ message: "Failed to fetch attendance data" });
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "No attendance data for selected date range" });

    // build meta for rendering
    const meta = await buildMetaFromReqQuery(req.query || {});
    console.debug("[reportAttendanceHandler] render meta:", meta);

    // Excel output
    if (format === "xlsx") {
      if (typeof reportService.renderExcelBuffer !== "function")
        return res
          .status(500)
          .json({ message: "Excel renderer not available" });

      const headers = [
        { header: "Punch ID", key: "punch_id" },
        { header: "Employee ID", key: "employee_id" },
        { header: "Employee Name", key: "employee_name" },
        { header: "Department", key: "department_name" },
        { header: "Status", key: "punch_status" },
        { header: "Punch In Time", key: "punchin_time" },
        { header: "Punch In Device", key: "punchin_device" },
        { header: "Punch In Location", key: "punchin_location" },
        { header: "Punch Out Time", key: "punchout_time" },
        { header: "Punch Out Device", key: "punchout_device" },
        { header: "Punch Out Location", key: "punchout_location" },
        { header: "Punch Mode", key: "punchmode" },
      ];

      const buf = await reportService.renderExcelBuffer(rows, headers);
      const filename = safeFilename("attendance_report", "xlsx");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buf.length);
      return res.send(buf);
    }

    // PDF output
    if (format === "pdf") {
      if (typeof reportService.renderPdfBuffer !== "function")
        return res.status(500).json({ message: "PDF renderer not available" });

      const buffer = await reportService.renderPdfBuffer(
        "Attendance Report",
        rows,
        { meta }
      );
      const filename = safeFilename("attendance_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    }

    return res.status(400).json({ message: "Invalid format" });
  } catch (err) {
    console.error(
      "[reportAttendanceHandler] Error rendering Attendance report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { downloadAttendanceReport };
