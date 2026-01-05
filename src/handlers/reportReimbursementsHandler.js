// reportReimbursementsHandler.js
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

// Small wrapper to always return [rows, fields] (or [rows, null])
async function dbExecRaw(sql, params = []) {
  const res = await dbExec(sql, params);
  // Many mysql2 promise methods return [rows, fields]
  if (Array.isArray(res) && res.length >= 1) {
    // If it's already [rows, fields] return as-is
    if (
      res.length >= 2 &&
      (Array.isArray(res[0]) || typeof res[0] === "object")
    )
      return res;
    // else some drivers return rows as the single element; normalize
    return [res[0], res[1] || null];
  }
  return [res, null];
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
  const user =
    req.user || req.authUser || req.auth || (req.session && req.session.user);
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
    const [rows] = await dbExecRaw(sql, [employeeId]);
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

async function findDepartmentsManagedBy(managerEmpId) {
  if (!managerEmpId) return [];
  const out = [];

  try {
    const [cols] = await dbExecRaw("SHOW COLUMNS FROM departments");
    const colNames = Array.isArray(cols)
      ? cols
          .map((c) => {
            return String(
              c.Field || c.field || c.COLUMN_NAME || c.column_name || ""
            ).trim();
          })
          .filter(Boolean)
      : [];

    if (colNames.includes("manager_employee_id")) {
      try {
        const [rows] = await dbExecRaw(
          "SELECT id FROM departments WHERE manager_employee_id = ?",
          [managerEmpId]
        );
        if (Array.isArray(rows)) {
          for (const r of rows) if (r && r.id != null) out.push(String(r.id));
          if (out.length) return Array.from(new Set(out));
        }
      } catch (e) {
        console.warn(
          "[reportReimbursementsHandler] query on manager_employee_id failed:",
          e && e.message
        );
      }
    }

    if (colNames.includes("manager_id")) {
      try {
        const [rows] = await dbExecRaw(
          "SELECT id FROM departments WHERE manager_id = ?",
          [managerEmpId]
        );
        if (Array.isArray(rows)) {
          for (const r of rows) if (r && r.id != null) out.push(String(r.id));
          if (out.length) return Array.from(new Set(out));
        }
      } catch (e) {
        console.warn(
          "[reportReimbursementsHandler] query on manager_id failed:",
          e && e.message
        );
      }
    }
  } catch (e) {
    console.warn(
      "[reportReimbursementsHandler] SHOW COLUMNS failed:",
      e && e.message
    );
  }

  try {
    const [rows] = await dbExecRaw(
      "SELECT DISTINCT department_id AS id FROM employee_professional WHERE supervisor_id = ? AND department_id IS NOT NULL",
      [managerEmpId]
    );
    if (Array.isArray(rows) && rows.length) {
      for (const r of rows) {
        const id = r && (r.id ?? r.department_id);
        if (id != null) out.push(String(id));
      }
    }
  } catch (e) {
    console.warn(
      "[reportReimbursementsHandler] fallback department query failed:",
      e && e.message
    );
  }

  return Array.from(new Set(out));
}

// Helpers expected by the original code but not present
function normalizeToPlainString(v, _ctx = "") {
  if (v === null || typeof v === "undefined") return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s === "" ? null : s;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch (e) {
    return String(v);
  }
}

// Heuristic: treat value as an ID candidate when it's a single token (no spaces)
// or pure numeric. This mirrors common patterns where IDs have no spaces.
function tryParseCandidate(candidate) {
  if (candidate === null || typeof candidate === "undefined") return null;
  if (typeof candidate === "number") return String(candidate);
  if (typeof candidate !== "string") {
    try {
      return String(candidate);
    } catch (e) {
      return null;
    }
  }
  const s = candidate.trim();
  if (!s) return null;
  // If contains whitespace, treat as a name not an id
  if (/\s/.test(s)) return null;
  // Accept alphanumeric IDs (including dashes/underscores)
  if (/^[A-Za-z0-9_\-@.]{1,50}$/.test(s)) return s;
  return null;
}

function _extractFieldValue(row, possibleKeys = []) {
  if (!row || typeof row !== "object") return null;
  for (const k of possibleKeys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      const v = row[k];
      if (v !== undefined && v !== null) return v;
    }
    // case-insensitive search
    const foundKey = Object.keys(row).find(
      (rk) => String(rk).toLowerCase() === String(k).toLowerCase()
    );
    if (foundKey) {
      const v = row[foundKey];
      if (v !== undefined && v !== null) return v;
    }
  }
  return null;
}

function normalizeRowsInPlace(rows) {
  if (!Array.isArray(rows)) return rows;
  // if reportService exposes a canonicalizer, use it
  if (
    reportService &&
    typeof reportService.normalizeReimbursementRow === "function"
  ) {
    return rows.map((r) => reportService.normalizeReimbursementRow(r || {}));
  }

  // fallback normalization
  return rows.map((raw) => {
    const r = Object.assign({}, raw || {});
    // id mapping
    if (!Object.prototype.hasOwnProperty.call(r, "id")) {
      const alt = _extractFieldValue(r, ["reimbursement_id", "id", "claim_id"]);
      if (alt != null) r.id = alt;
    }
    // employee_name derivation
    if (!Object.prototype.hasOwnProperty.call(r, "employee_name")) {
      const fn = _extractFieldValue(r, ["first_name"]);
      const ln = _extractFieldValue(r, ["last_name"]);
      if (fn || ln) r.employee_name = `${fn || ""} ${ln || ""}`.trim();
    }
    // total mapping - prefer aggregated_total, but map to both names for compatibility
    const agg = _extractFieldValue(r, [
      "aggregated_total",
      "aggregatedAmount",
      "aggregated",
    ]);
    const tot = _extractFieldValue(r, ["total_amount", "total", "totalAmount"]);
    if (agg != null) {
      r.aggregated_total = agg;
      if (!Object.prototype.hasOwnProperty.call(r, "total_amount"))
        r.total_amount = agg;
    } else if (tot != null) {
      r.total_amount = tot;
      if (!Object.prototype.hasOwnProperty.call(r, "aggregated_total"))
        r.aggregated_total = tot;
    } else {
      r.aggregated_total = r.aggregated_total || 0;
      r.total_amount = r.total_amount || r.aggregated_total || 0;
    }

    // status/payment normalization fallbacks
    r.approval_status =
      _extractFieldValue(r, ["approval_status", "status"]) ||
      r.approval_status ||
      "";
    r.payment_status =
      _extractFieldValue(r, [
        "payment_status",
        "raw_payment_status",
        "approval_status",
        "status",
      ]) ||
      r.payment_status ||
      r.approval_status ||
      "";

    // ensure strings trimmed
    for (const key of ["approval_status", "payment_status", "status"]) {
      if (r[key] === null || r[key] === undefined) r[key] = "";
      else if (typeof r[key] === "string") r[key] = r[key].trim();
    }

    return r;
  });
}

async function buildMetaFromReqQuery(query = {}) {
  const meta = {
    filters: [],
    status: null,
    employee: null,
    department: null,
  };

  try {
    const startDate =
      coerceToString(query.startDate, null) ||
      coerceToString(query.start_date, null) ||
      coerceToString(query.from, null) ||
      coerceToString(query.fromDate, null);
    const endDate =
      coerceToString(query.endDate, null) ||
      coerceToString(query.end_date, null) ||
      coerceToString(query.to, null) ||
      coerceToString(query.toDate, null);
    if (startDate || endDate) {
      if (startDate && endDate)
        meta.filters.push(`Date: ${startDate} → ${endDate}`);
      else if (startDate) meta.filters.push(`From: ${startDate}`);
      else meta.filters.push(`To: ${endDate}`);
    }

    const rawStatus =
      coerceToString(query.status, null) ||
      coerceToString(query.approval_status, null) ||
      coerceToString(query.state, null);
    if (rawStatus) {
      // use the provided normalizeStatusForQuery to make a displayable token
      meta.status = normalizeToPlainString(rawStatus, "status");
      meta.filters.push(`Status: ${meta.status}`);
    }

    let empCandidate =
      query.employee_id ?? query.employeeId ?? query.employee ?? null;
    if (typeof empCandidate === "string" && empCandidate.trim() === "")
      empCandidate = null;

    if (empCandidate) {
      const idCandidate = tryParseCandidate(empCandidate);
      if (idCandidate) {
        try {
          const [rows] = await dbExecRaw(
            "SELECT employee_id, first_name, last_name, email FROM employees WHERE employee_id = ? LIMIT 1",
            [idCandidate]
          );
          const er = Array.isArray(rows) && rows[0] ? rows[0] : null;
          if (er) {
            const name =
              `${(er.first_name || "").trim()} ${(
                er.last_name || ""
              ).trim()}`.trim() ||
              er.email ||
              er.employee_id;
            meta.employee = `${name} (${er.employee_id})`;
            meta.filters.push(`Employee: ${meta.employee}`);
          } else {
            meta.employee = normalizeToPlainString(empCandidate, "employee");
            meta.filters.push(`Employee: ${meta.employee}`);
          }
        } catch (e) {
          meta.employee = normalizeToPlainString(empCandidate, "employee");
          meta.filters.push(`Employee: ${meta.employee}`);
        }
      } else {
        meta.employee = normalizeToPlainString(empCandidate, "employee");
        meta.filters.push(`Employee: ${meta.employee}`);
      }
    }

    let deptCandidate =
      query.department_id ?? query.departmentId ?? query.department ?? null;
    if (typeof deptCandidate === "string" && deptCandidate.trim() === "")
      deptCandidate = null;

    if (deptCandidate) {
      const deptIdStr = coerceToString(deptCandidate, null);
      if (deptIdStr && /^\d+$/.test(String(deptIdStr))) {
        try {
          const [drows] = await dbExecRaw(
            "SELECT id, name FROM departments WHERE id = ? LIMIT 1",
            [deptIdStr]
          );
          const dr = Array.isArray(drows) && drows[0] ? drows[0] : null;
          if (dr) {
            meta.department = `${dr.name}`;
            meta.filters.push(`Department: ${meta.department}`);
          } else {
            meta.department = normalizeToPlainString(
              deptCandidate,
              "department"
            );
            meta.filters.push(`Department: ${meta.department}`);
          }
        } catch (e) {
          meta.department = normalizeToPlainString(deptCandidate, "department");
          meta.filters.push(`Department: ${meta.department}`);
        }
      } else {
        meta.department = normalizeToPlainString(deptCandidate, "department");
        meta.filters.push(`Department: ${meta.department}`);
      }
    }

    if (meta.filters.length === 0) meta.filters.push("No explicit filters");
  } catch (e) {
    console.warn(
      "[reportReimbursementsHandler] buildMetaFromReqQuery failed:",
      e && e.message
    );
    if (meta.filters.length === 0)
      meta.filters.push("No explicit filters (meta build failed)");
  }
  return meta;
}

async function downloadReimbursementsReport(req, res) {
  const startTs = Date.now();
  try {
    const parsed = parseDates(req.query || {});
    let { startDate, endDate, status, format, fields } = parsed;

    let employeeId = coerceToString(req.query.employee_id, null);
    let departmentId = coerceToString(req.query.department_id, null);

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

    let managerEmpId = null;
    if (!departmentId && requesterEmpId) {
      const u = req.user || req.authUser || (req.session && req.session.user);
      const isAdmin =
        !!(u && (u.is_admin || u.isAdmin || u.role === "admin")) || false;
      const isManagerRole = !!(
        u &&
        u.role &&
        /manager|supervisor|lead/i.test(String(u.role))
      );
      const explicitManager = String(
        (req.headers && req.headers["x-force-manager-scope"]) ||
          (req.query &&
            (req.query.forceManager ||
              req.query.manager_scope ||
              req.query.managerScope)) ||
          ""
      ).toLowerCase();
      const wantsMgrScope =
        explicitManager === "1" || explicitManager === "true" || isManagerRole;

      if (!isAdmin && wantsMgrScope) {
        managerEmpId = requesterEmpId;
        console.debug(
          "[reportReimbursementsHandler] manager scoping enabled for:",
          managerEmpId
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

    // Helper to fetch rows from reportService with stable signature
    async function fetchRowsForScope(empId, deptId) {
      try {
        // many reportService implementations take (startDate, endDate, status, fields, employeeId, departmentId)
        // keep using that signature for backward compatibility
        const raw = await reportService.getReimbursementRows(
          startDate,
          endDate,
          status,
          null,
          empId,
          deptId
        );
        const arr = Array.isArray(raw) ? raw : [];
        return normalizeRowsInPlace(arr);
      } catch (e) {
        console.warn(
          "[reportReimbursementsHandler] fetchRowsForScope failed:",
          e && e.message
        );
        return [];
      }
    }

    // If explicit employee or department provided - fetch and return directly
    if (employeeId || departmentId) {
      let rows = await fetchRowsForScope(employeeId, departmentId);

      // robust server-side enforcement of explicit ids (in case service ignored params)
      if (departmentId) {
        rows = rows.filter((r) => {
          const rid =
            r &&
            (r.department_id ??
              r.departmentId ??
              r.department ??
              r.dept_id ??
              _extractFieldValue(r, [
                "department_id",
                "departmentId",
                "department",
              ]));
          return rid != null && String(rid) === String(departmentId);
        });
      }
      if (employeeId) {
        rows = rows.filter((r) => {
          const eid =
            r &&
            (r.employee_id ??
              r.employeeId ??
              r.emp_id ??
              r.empId ??
              _extractFieldValue(r, ["employee_id", "employeeId", "emp_id"]));
          return eid != null && String(eid) === String(employeeId);
        });
      }

      if (isPreviewRequest(req)) {
        const msg =
          rows.length === 0
            ? "No reimbursement data for selected date range"
            : undefined;
        return sendPreviewResponse(req, res, rows, msg);
      }

      // perform status filtering using normalized tokens
      const statusCandidate = normalizeStatusForQuery(status);
      const filtered = rows.filter((r) =>
        statusMatches(statusCandidate, [
          r.status,
          r.payment_status,
          r.approval_status,
        ])
      );

      if (!filtered.length)
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
          return res
            .status(500)
            .json({ message: "PDF renderer not available" });
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
    }

    // Manager-scoped path: collect departments managed and fetch per-department
    let rows = [];
    if (managerEmpId) {
      let managedDeptIds = [];
      try {
        managedDeptIds = await findDepartmentsManagedBy(managerEmpId);
      } catch (e) {
        console.warn(
          "[reportReimbursementsHandler] findDepartmentsManagedBy attempt failed:",
          e && e.message
        );
      }

      if (managedDeptIds.length > 0) {
        const merged = [];
        for (const d of managedDeptIds) {
          try {
            const part = await fetchRowsForScope(null, d);
            if (Array.isArray(part) && part.length) merged.push(...part);
          } catch (e) {
            console.warn(
              "[reportReimbursementsHandler] per-dept fetch failed for dept",
              d,
              e && e.message
            );
          }
        }
        // dedupe by id
        const map = new Map();
        for (const p of merged) {
          const key = String(p.id ?? p.reimbursement_id ?? p.claim_id ?? "");
          if (key) map.set(key, p);
        }
        rows = Array.from(map.values());
      } else {
        // fallback: fetch all reimbursements and filter by supervisor relationship
        try {
          const all = await fetchRowsForScope(null, null);
          const allArr = Array.isArray(all) ? all : [];
          const empIds = Array.from(
            new Set(allArr.map((x) => x.employee_id).filter(Boolean))
          );
          if (empIds.length) {
            const placeholders = empIds.map(() => "?").join(",");
            const [profRows] = await dbExec(
              `SELECT employee_id, supervisor_id FROM employee_professional WHERE employee_id IN (${placeholders})`,
              empIds
            );
            const supMap = {};
            for (const pr of Array.isArray(profRows) ? profRows : []) {
              if (pr && pr.employee_id)
                supMap[String(pr.employee_id)] = pr.supervisor_id;
            }
            rows = allArr.filter((r) => {
              const id = r.employee_id ? String(r.employee_id) : null;
              const sup = id ? supMap[id] : null;
              return sup != null && String(sup) === String(managerEmpId);
            });
          } else rows = [];
        } catch (e) {
          console.error(
            "[reportReimbursementsHandler] fallback JS filtering failed:",
            e && e.message
          );
          rows = [];
        }
      }
    } else {
      // Normal full-scope fetch
      const rawReimbursements = await fetchRowsForScope(null, null);
      rows = Array.isArray(rawReimbursements) ? rawReimbursements : [];
    }

    // Honor explicit query filters if present
    const explicitDept = coerceToString(
      req.query && (req.query.department_id ?? req.query.departmentId),
      null
    );
    const explicitEmp = coerceToString(
      req.query && (req.query.employee_id ?? req.query.employeeId),
      null
    );
    if (explicitDept) {
      rows = rows.filter((r) => {
        const rid =
          r && (r.department_id ?? r.departmentId ?? r.department ?? r.dept_id);
        return rid != null && String(rid) === String(explicitDept);
      });
    }
    if (explicitEmp) {
      rows = rows.filter((r) => {
        const eid = r && (r.employee_id ?? r.employeeId ?? r.emp_id ?? r.empId);
        return eid != null && String(eid) === String(explicitEmp);
      });
    }

    if (isPreviewRequest(req)) {
      const msg =
        rows.length === 0
          ? "No reimbursement data for selected date range"
          : undefined;
      return sendPreviewResponse(req, res, rows, msg);
    }

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
