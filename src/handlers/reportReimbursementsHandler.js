// src/handlers/reportReimbursementsHandler.js
const reportService = require("../services/reportIndex");
const {
  coerceToString,
  parseDates,
  ensureTwoMonthWindow,
  safeFilename,
  pickFields,
  normalizeStatusForQuery,
  statusMatches,
  isPreviewRequest,
  sendPreviewResponse,
} = require("../services/reportFilters");

const db = require("../config");

/**
 * dbExec - supports both promise-style and callback-style mysql clients.
 * - Sanitizes params (undefined -> null).
 * - Prefers db.query (promise or callback) and falls back to db.execute.
 * Returns [rows, fields] or throws.
 */
async function dbExec(sql, params = []) {
  try {
    if (!Array.isArray(params)) params = [params];
    params = params.map((p) => (typeof p === "undefined" ? null : p));

    if (db && typeof db.query === "function") {
      const maybePromise = db.query(sql, params);
      if (maybePromise && typeof maybePromise.then === "function") {
        const result = await maybePromise;
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

    if (db && typeof db.execute === "function") {
      const maybePromise = db.execute(sql, params);
      if (maybePromise && typeof maybePromise.then === "function") {
        const result = await maybePromise;
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
      "[reportReimbursementsHandler][dbExec] error:",
      e && (e.stack || e.message)
    );
    throw e;
  }
}

function findEmployeeIdInRequest(req) {
  const safe = (v) =>
    v === undefined || v === null ? null : String(v).trim() || null;
  const headers = [
    "x-employee-id",
    "x-employeeid",
    "x-emp-id",
    "x-user-id",
    "x-user",
  ];
  for (const h of headers) {
    const v = safe(req.headers && req.headers[h]);
    if (v) return v;
  }
  const r1 = safe(
    req.employeeId ?? req.employee_id ?? req.userId ?? req.user_id
  );
  if (r1) return r1;
  const user = req.user || req.authUser || req.auth || req.session?.user;
  if (user && typeof user === "object") {
    const cand =
      safe(user.employee_id) ||
      safe(user.employeeId) ||
      safe(user.id) ||
      safe(user.user_id) ||
      safe(user.email);
    if (cand) return cand;
  }
  const auth = safe(req.headers && req.headers.authorization);
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    try {
      if (token.split(".").length === 3) {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString("utf8")
        );
        const cand =
          safe(payload.employee_id) ||
          safe(payload.employeeId) ||
          safe(payload.sub) ||
          safe(payload.id);
        if (cand) return cand;
      }
    } catch (e) {}
  }
  const qCandidate =
    safe(req.query && (req.query.employee_id || req.query.employeeId)) ||
    safe(req.body && (req.body.employee_id || req.body.employeeId));
  if (qCandidate) return qCandidate;
  return null;
}

async function lookupDeptForEmployee(employeeId) {
  try {
    if (!employeeId) return null;
    const sql = `SELECT department_id FROM employee_professional WHERE employee_id = ? LIMIT 1`;
    const [rows] = await dbExec(sql, [employeeId]);
    if (Array.isArray(rows) && rows[0] && rows[0].department_id != null)
      return String(rows[0].department_id);
  } catch (e) {
    console.warn(
      "[reportReimbursementsHandler] lookupDeptForEmployee failed:",
      e && e.message
    );
  }
  return null;
}

async function buildMetaFromReqQuery(query = {}) {
  const meta = {};
  const rawStatus =
    coerceToString(query.status, null) ||
    coerceToString(query.approval_status, null);
  if (rawStatus) {
    try {
      meta.status = normalizeStatusForQuery(rawStatus) || rawStatus;
    } catch (e) {
      meta.status = rawStatus;
    }
  }

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
    if (empId) {
      try {
        if (typeof reportService.searchEmployees === "function") {
          const found = await reportService.searchEmployees(empId);
          meta.employeeName =
            Array.isArray(found) && found[0]
              ? found[0].employee_name ||
                `${(found[0].first_name || "").trim()} ${(
                  found[0].last_name || ""
                ).trim()}`.trim() ||
                empId
              : empId;
        } else if (typeof reportService.getEmployeeRows === "function") {
          const er = await reportService.getEmployeeRows(empId);
          meta.employeeName =
            Array.isArray(er) && er[0]
              ? er[0].employee_name ||
                `${(er[0].first_name || "").trim()} ${(
                  er[0].last_name || ""
                ).trim()}`.trim() ||
                empId
              : empId;
        } else meta.employeeName = empId;
      } catch (e) {
        meta.employeeName = empId;
      }
    }
  }

  const typedDept =
    coerceToString(query.department_name, null) ||
    coerceToString(query.departmentName, null) ||
    coerceToString(query.department, null);
  if (typedDept) meta.department = typedDept;
  else {
    const deptId =
      coerceToString(query.department_id, null) ||
      coerceToString(query.departmentId, null);
    if (deptId) {
      try {
        if (typeof reportService.getDepartments === "function") {
          const depts = await reportService.getDepartments();
          if (Array.isArray(depts)) {
            const found = depts.find(
              (d) =>
                d &&
                (String(d.id) === String(deptId) ||
                  String(d.department_id || d.id) === String(deptId))
            );
            meta.department =
              (found &&
                (found.name || found.department_name || found.department)) ||
              deptId;
          } else meta.department = deptId;
        } else meta.department = deptId;
      } catch (e) {
        meta.department = deptId;
      }
    }
  }

  return meta;
}

async function downloadReimbursementsReport(req, res) {
  console.log(
    "[reportReimbursementsHandler] downloadReimbursementsReport called - query:",
    req.query
  );
  const startTs = Date.now();
  try {
    const parsed = parseDates(req.query || {});
    let { startDate, endDate, status, format, fields } = parsed;

    let employeeId = coerceToString(req.query.employee_id, null);
    let departmentId = coerceToString(req.query.department_id, null);

    // derive department if needed from requester
    const requesterEmpId = findEmployeeIdInRequest(req);
    if (!departmentId && requesterEmpId) {
      const derived = await lookupDeptForEmployee(requesterEmpId);
      if (derived) {
        departmentId = derived;
        console.debug(
          "[reportReimbursementsHandler] derived department for requester:",
          departmentId
        );
      }
    }

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    if (typeof reportService.getReimbursementRows !== "function") {
      console.error(
        "[reportReimbursementsHandler] reportService.getReimbursementRows missing"
      );
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    const rawReimbursements = await reportService.getReimbursementRows(
      startDate,
      endDate,
      status,
      null,
      employeeId,
      departmentId
    );
    let rows = Array.isArray(rawReimbursements) ? rawReimbursements : [];

    // If service returns broad rows but scoping required, filter locally
    if ((employeeId || departmentId || requesterEmpId) && rows.length > 0) {
      rows = rows.filter((r) => {
        if (
          employeeId &&
          String(r.employee_id).trim() !== String(employeeId).trim()
        )
          return false;
        if (departmentId) {
          const rowDept =
            r.department_id ??
            r.pr_department_id ??
            r.department_id ??
            r.departmentName ??
            r.department_name ??
            "";
          if (!rowDept) return false;
          if (
            String(rowDept) !== String(departmentId) &&
            String(rowDept).toLowerCase() !== String(departmentId).toLowerCase()
          )
            return false;
        }
        return true;
      });
      console.debug(
        "[reportReimbursementsHandler] rows after local scoping:",
        rows.length
      );
    }

    if (isPreviewRequest(req)) {
      const msg =
        rows.length === 0
          ? "No reimbursement data for selected date range"
          : undefined;
      return sendPreviewResponse(req, res, rows, msg);
    }

    if (!Array.isArray(rows))
      return res
        .status(500)
        .json({ message: "Failed to fetch reimbursement data" });

    const statusCandidate = normalizeStatusForQuery(status);
    const filtered = rows.filter((r) =>
      statusMatches(statusCandidate, [
        r.status,
        r.payment_status,
        r.approval_status,
      ])
    );

    if (filtered.length === 0)
      return res
        .status(404)
        .json({ message: "No reimbursement data for selected date range" });

    const reimbursementsToExport = pickFields(filtered, fields);
    const meta = await buildMetaFromReqQuery(req.query || {});
    console.debug("[reportReimbursementsHandler] render meta:", meta);

    if (format === "xlsx") {
      if (typeof reportService.renderExcelBuffer !== "function")
        return res
          .status(500)
          .json({ message: "Excel renderer not available" });
      const buf = await reportService.renderExcelBuffer(
        reimbursementsToExport,
        null
      );
      const filename = safeFilename("reimbursements_report", "xlsx");
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
    } else if (format === "pdf") {
      if (typeof reportService.renderPdfBuffer !== "function")
        return res.status(500).json({ message: "PDF renderer not available" });
      const pdfBuf = await reportService.renderPdfBuffer(
        "Reimbursements Report",
        reimbursementsToExport,
        { meta }
      );
      const filename = safeFilename("reimbursements_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuf.length);
      return res.send(pdfBuf);
    } else return res.status(400).json({ message: "Invalid format" });
  } catch (err) {
    console.error(
      "[reportReimbursementsHandler] Error rendering Reimbursements report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    console.debug(
      "[reportReimbursementsHandler] finished in",
      Date.now() - startTs,
      "ms"
    );
  }
}

module.exports = { downloadReimbursementsReport };
