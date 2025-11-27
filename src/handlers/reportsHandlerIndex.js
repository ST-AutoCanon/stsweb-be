// src/handlers/reportsHandlerIndex.js
// Central export that wires up all report handlers and provides searchEmployees / getDepartments

const queries = require("../constants/reportQueries");
const reportUtils = require("../services/reportUtils");
const { fetchRows, coerceToString } = reportUtils;

const reportService = require("../services/reportIndex"); // used for rendering in employees/vendors

// import existing per-report handlers (your project files)
const leavesHandler = require("./reportLeavesHandler");
const attendanceHandler = require("./reportAttendanceHandler");
const tasksHandler = require("./reportTasksHandler");
const assetsHandler = require("./reportAssetsHandler");
const reimbursementsHandler = require("./reportReimbursementsHandler");

// ==================== deriveDepartmentForEmployee (robust + console logs) ====================
async function deriveDepartmentForEmployee(employeeId) {
  console.log("\n[deriveDepartmentForEmployee] START");
  console.log("[deriveDepartmentForEmployee] Received employeeId:", employeeId);

  try {
    if (!employeeId) {
      console.log(
        "[deriveDepartmentForEmployee] No employeeId provided -> returning null"
      );
      return null;
    }

    // Build candidate identifiers (preserve original, numeric-only, STS-stripped)
    const raw = String(employeeId).trim();
    const candidatesSet = new Set();
    if (raw) candidatesSet.add(raw);
    const numericOnly = raw.replace(/\D/g, "");
    if (numericOnly) candidatesSet.add(numericOnly);
    const stsStripped = raw.replace(/^STS/i, "");
    if (stsStripped && stsStripped !== raw) candidatesSet.add(stsStripped);
    const candidates = Array.from(candidatesSet);
    console.log("[deriveDepartmentForEmployee] Candidates:", candidates);

    // Helper to create placeholders
    const placeholders = (n) => (n > 0 ? Array(n).fill("?").join(", ") : "''");

    // Try 1: query employee_professional by employee_id (safe minimal columns)
    // NOTE: select only columns that are unlikely to be missing: department_id, role, position, supervisor_id
    let rows = [];
    try {
      const sql1 = `
        SELECT department_id, role, position, supervisor_id
        FROM employee_professional
        WHERE employee_id IN (${placeholders(candidates.length)})
        LIMIT 1
      `;
      const params1 = [...candidates];
      console.log("[deriveDepartmentForEmployee] Try1 SQL:", sql1.trim());
      console.log("[deriveDepartmentForEmployee] Try1 params:", params1);
      rows = await fetchRows(sql1, params1);
      console.log(
        "[deriveDepartmentForEmployee] Try1 rows:",
        rows && rows.length ? rows[0] : rows
      );
    } catch (err) {
      console.warn(
        "[deriveDepartmentForEmployee] Try1 failed:",
        err && err.message
      );
      rows = [];
    }

    // Try 2: if not found, query employees table (safe minimal columns) and left join professional if possible.
    if (!rows || !rows[0]) {
      try {
        // We'll attempt a minimal join but avoid selecting columns that previously failed (is_manager etc).
        const sql2 = `
          SELECT
            COALESCE(pr.department_id, e.department_id, e.dept_id) AS department_id,
            pr.role AS pr_role, pr.position AS pr_position,
            e.role AS e_role, e.position AS e_position, e.employee_code, e.employee_id AS emp_id
          FROM employees e
          LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
          WHERE e.employee_code IN (${placeholders(candidates.length)})
             OR e.employee_id IN (${placeholders(candidates.length)})
          LIMIT 1
        `;
        const params2 = [...candidates, ...candidates];
        console.log("[deriveDepartmentForEmployee] Try2 SQL:", sql2.trim());
        console.log("[deriveDepartmentForEmployee] Try2 params:", params2);
        const r2 = await fetchRows(sql2, params2);
        console.log(
          "[deriveDepartmentForEmployee] Try2 rows:",
          r2 && r2.length ? r2[0] : r2
        );
        if (Array.isArray(r2) && r2[0]) rows = r2;
      } catch (err2) {
        console.warn(
          "[deriveDepartmentForEmployee] Try2 failed:",
          err2 && err2.message
        );
        rows = rows || [];
      }
    }

    // Try 3: last-resort - attempt a simple employees lookup by provided id/code (very defensive)
    if (!rows || !rows[0]) {
      try {
        const sql3 = `
          SELECT employee_id AS emp_id, employee_code, department AS department_col, dept_id
          FROM employees
          WHERE employee_id IN (${placeholders(
            candidates.length
          )}) OR employee_code IN (${placeholders(candidates.length)})
          LIMIT 1
        `;
        const params3 = [...candidates, ...candidates];
        console.log("[deriveDepartmentForEmployee] Try3 SQL:", sql3.trim());
        console.log("[deriveDepartmentForEmployee] Try3 params:", params3);
        const r3 = await fetchRows(sql3, params3);
        console.log(
          "[deriveDepartmentForEmployee] Try3 rows:",
          r3 && r3.length ? r3[0] : r3
        );
        if (Array.isArray(r3) && r3[0]) rows = r3;
      } catch (err3) {
        console.warn(
          "[deriveDepartmentForEmployee] Try3 failed:",
          err3 && err3.message
        );
        rows = rows || [];
      }
    }

    if (!Array.isArray(rows) || !rows[0]) {
      console.log(
        "[deriveDepartmentForEmployee] No rows found in any query -> returning null"
      );
      return null;
    }

    const row = rows[0];
    console.log("[deriveDepartmentForEmployee] Selected row:", row);

    // Normalize department id - try several possible fields
    const dept =
      row.department_id ??
      row.department_col ??
      row.dept_id ??
      (row.department_id === 0 ? 0 : undefined);
    const deptStr =
      dept === null || typeof dept === "undefined" ? null : String(dept);

    console.log("[deriveDepartmentForEmployee] Normalized dept:", deptStr);

    // Determine whether the requester is manager-like.
    // Heuristics:
    //  - role/position text containing manager/lead/supervisor/head/team lead
    //  - presence of supervisor_id (not perfect) : if supervisor_id is null/empty, could be manager; but not reliable
    const roleCandidates = [
      row.role || row.pr_role || row.e_role || "",
      row.position || row.pr_position || row.e_position || "",
      row.designation || "",
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase())
      .join(" ");

    console.log(
      "[deriveDepartmentForEmployee] roleCandidates text:",
      roleCandidates
    );

    const looksLikeManager =
      /(^|[^a-z])(manager|lead|supervisor|head|team ?lead)($|[^a-z])/.test(
        roleCandidates
      );

    // If `supervisor_id` exists in employee_professional, use it carefully: absence of supervisor may indicate manager in some schemas.
    const hasSupervisorIdField = Object.prototype.hasOwnProperty.call(
      row,
      "supervisor_id"
    );
    const supervisorIdVal = hasSupervisorIdField ? row.supervisor_id : null;
    console.log(
      "[deriveDepartmentForEmployee] hasSupervisorIdField:",
      hasSupervisorIdField,
      "supervisorIdVal:",
      supervisorIdVal
    );

    // Decide
    const isLikelyManager =
      looksLikeManager ||
      (hasSupervisorIdField &&
        (supervisorIdVal === null ||
          supervisorIdVal === 0 ||
          supervisorIdVal === "0"));

    console.log(
      "[deriveDepartmentForEmployee] looksLikeManager:",
      looksLikeManager,
      "isLikelyManager:",
      isLikelyManager
    );

    if (isLikelyManager && deptStr) {
      console.log(
        "[deriveDepartmentForEmployee] ✅ Derived department:",
        deptStr
      );
      return deptStr;
    }

    console.log(
      "[deriveDepartmentForEmployee] ❌ Could not confidently derive manager department -> returning null"
    );
    return null;
  } catch (e) {
    console.error(
      "[deriveDepartmentForEmployee] ERROR:",
      e && e.stack ? e.stack : e.message
    );
    return null;
  } finally {
    console.log("[deriveDepartmentForEmployee] END\n");
  }
}

/**
 * Wrap handler to inject department scoping for requester when req.query.department_id is not provided.
 */
function wrapHandlerWithDerivedDept(originalHandler) {
  if (typeof originalHandler !== "function") return originalHandler;
  return async function (req, res, next) {
    try {
      const hasDept =
        req.query &&
        (req.query.department_id ||
          req.query.departmentId ||
          req.query.department === 0 ||
          req.query.department === "0");
      if (!hasDept) {
        // check header x-employee-id to determine requester
        const headerEmp =
          (req.headers &&
            (req.headers["x-employee-id"] ||
              req.headers["x-employeeid"] ||
              req.headers["x-emp-id"] ||
              req.headers["x-employee"])) ||
          null;
        const empId = headerEmp ? String(headerEmp).trim() : null;

        // also check req.user object if present (common with auth middleware)
        const userEmp =
          (req.user && (req.user.employee_id || req.user.employeeId)) || null;
        const userEmpId = userEmp ? String(userEmp).trim() : null;

        const candidateEmpId = empId || userEmpId;

        console.debug(
          "[reportsHandlerIndex] wrapHandlerWithDerivedDept: header/x-user ids:",
          { headerEmp: empId, reqUserEmp: userEmpId }
        );

        if (candidateEmpId) {
          const derived = await deriveDepartmentForEmployee(candidateEmpId);
          console.debug(
            "[reportsHandlerIndex] wrapHandlerWithDerivedDept: derived dept:",
            derived
          );
          if (derived) {
            if (!req.query) req.query = {};
            req.query.department_id = derived;
            req.query.departmentId = derived;
            req._derived_department_for_report = derived;
          }
        }
      }
    } catch (e) {
      console.warn(
        "[reportsHandlerIndex] wrapHandlerWithDerivedDept error:",
        e && e.message
      );
    }
    // Call the original handler
    try {
      return originalHandler(req, res, next);
    } catch (err) {
      console.error(
        "[reportsHandlerIndex] wrapped handler threw:",
        err && (err.stack || err.message)
      );
      if (!res.headersSent)
        return res.status(500).json({ message: "Internal Server Error" });
    }
  };
}

// Helper to parse `fields` param (CSV or array) into array or null
function parseFieldsParam(fieldsRaw) {
  if (!fieldsRaw) return null;
  if (Array.isArray(fieldsRaw)) {
    const arr = fieldsRaw.map((f) => String(f).trim()).filter(Boolean);
    return arr.length ? arr : null;
  }
  const s = String(fieldsRaw || "").trim();
  if (!s) return null;
  // allow both comma-separated and space-separated lists, prefer comma
  const parts = s.includes(",") ? s.split(",") : s.split(/\s+/);
  const arr = parts.map((p) => p.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

/**
 * SEARCH EMPLOYEES
 */
async function searchEmployees(req, res) {
  try {
    console.log("➡️ [searchEmployees] Incoming query params:", req.query);

    const qParam =
      req.query && typeof req.query.q === "string" ? req.query.q.trim() : "";
    console.log("🔍 [searchEmployees] Search query (qParam):", qParam);

    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit || "10", 10) || 10)
    );
    console.log("🔢 [searchEmployees] Limit:", limit);

    let dept =
      req.query && (req.query.department_id ?? req.query.departmentId)
        ? req.query.department_id ?? req.query.departmentId
        : null;

    if (typeof dept === "string") {
      const tr = dept.trim();
      if (!tr || tr.toLowerCase() === "null") dept = null;
    }
    console.log("🏢 [searchEmployees] Department ID:", dept);

    const pattern = qParam.length ? `%${qParam}%` : `%`;
    console.log("📋 [searchEmployees] Search pattern:", pattern);

    const params = [pattern, pattern, pattern, dept, dept, limit];
    console.log("🧩 [searchEmployees] Query parameters:", params);

    const rows = await fetchRows(queries.SEARCH_EMPLOYEES, params);
    console.log("✅ [searchEmployees] Rows fetched:", rows?.length || 0);
    if (rows?.length) console.log("🗂️ Sample row:", rows[0]);

    return res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error("❌ [searchEmployees] Failed:", e && (e.stack || e.message));
    return res.status(500).json({ message: "Failed to search employees" });
  }
}

async function getDepartments(req, res) {
  try {
    const rows = await fetchRows(queries.GET_DEPARTMENTS, []);
    return res.json(Array.isArray(rows) ? rows : []);
  } catch (e) {
    console.error(
      "[reportsHandlerIndex] getDepartments failed:",
      e && (e.stack || e.message)
    );
    return res.status(500).json({ message: "Failed to fetch departments" });
  }
}

/**
 * Small helper to normalize status param for queries:
 * Treat 'all' / '' as null (no filtering).
 */
function normalizeStatusForQuery(statusRaw) {
  if (statusRaw === null || typeof statusRaw === "undefined") return null;
  const s = String(statusRaw).trim();
  if (!s) return null;
  if (s.toLowerCase() === "all") return null;
  return s;
}
// Replace downloadEmployeesReport with this version
async function downloadEmployeesReport(req, res) {
  console.log(
    "[reportsHandlerIndex] downloadEmployeesReport called - query:",
    req.query || {}
  );

  try {
    const startDate = req.query.startDate ?? req.query.start_date ?? null;
    const endDate = req.query.endDate ?? req.query.end_date ?? null;

    // Normalize status: treat "All" (case-ins) and empty as null (no filter)
    let status = coerceToString(req.query.status ?? null, null);
    if (
      status &&
      typeof status === "string" &&
      status.trim().toLowerCase() === "all"
    ) {
      status = null;
    }

    let dept = coerceToString(
      req.query.department_id ?? req.query.departmentId ?? null,
      null
    );
    if (dept && dept.toLowerCase && dept.toLowerCase() === "null") dept = null;

    const params = [
      startDate,
      startDate,
      endDate,
      endDate,
      status,
      status,
      dept,
      dept,
    ];

    // Try primary (full) query first
    let rows;
    try {
      console.log(
        "[reportsHandlerIndex] Executing GET_EMPLOYEE_REPORT with params:",
        params
      );
      rows = await fetchRows(queries.GET_EMPLOYEE_REPORT, params);
      console.log(
        "[reportsHandlerIndex] GET_EMPLOYEE_REPORT returned rows:",
        Array.isArray(rows) ? rows.length : typeof rows
      );
    } catch (primaryErr) {
      console.error(
        "[reportsHandlerIndex] GET_EMPLOYEE_REPORT failed — will try compact fallback. Error:",
        primaryErr && (primaryErr.stack || primaryErr.message)
      );

      // Build a compact fallback query that does NOT assume e.department_id exists.
      // Use COALESCE over known possible columns (pr.department_id, e.dept_id, e.department).
      const compactQuery =
        queries.GET_EMPLOYEE_REPORT_COMPACT ||
        `
        SELECT
          e.employee_id,
          e.first_name,
          e.last_name,
          CONCAT(COALESCE(e.first_name,''), ' ', COALESCE(e.last_name,'')) AS employee_name,
          e.email,
          e.phone_number,
          e.status,
          COALESCE(pr.department_id, e.dept_id, e.department) AS department_id
        FROM employees e
        LEFT JOIN employee_professional pr ON e.employee_id = pr.employee_id
        WHERE ( ? IS NULL OR (e.created_at >= ? ) )
          AND ( ? IS NULL OR (e.created_at < DATE_ADD(?, INTERVAL 1 DAY) ) )
          AND ( ? IS NULL OR LOWER(e.status) = LOWER(?) )
          AND ( ? IS NULL OR COALESCE(pr.department_id, e.dept_id, e.department) = ? )
        ORDER BY e.created_at DESC
        `;

      try {
        console.log(
          "[reportsHandlerIndex] Executing compact fallback with params:",
          params
        );
        rows = await fetchRows(compactQuery, params);
        console.log(
          "[reportsHandlerIndex] Compact fallback returned rows:",
          Array.isArray(rows) ? rows.length : typeof rows
        );
      } catch (fallbackErr) {
        console.error(
          "[reportsHandlerIndex] Compact fallback also failed:",
          fallbackErr && (fallbackErr.stack || fallbackErr.message)
        );
        // Return controlled error to client; full details are in server logs
        return res.status(500).json({
          message:
            "SQL error while fetching employee report (see server logs).",
        });
      }
    }

    const rowsArr = Array.isArray(rows) ? rows : [];

    // If preview requested, just return JSON (no fields transform)
    if (
      req.query &&
      (req.query.preview === "true" || req.query.preview === true)
    ) {
      console.log(
        "[reportsHandlerIndex] Returning preview rows:",
        rowsArr.length
      );
      return res.json(rowsArr);
    }

    // Fields support (optional)
    const fields = parseFieldsParam(req.query.fields);
    let toExport = rowsArr;
    if (fields && typeof reportService.pickFields === "function") {
      try {
        toExport = reportService.pickFields(rowsArr, fields);
      } catch (e) {
        console.warn(
          "[reportsHandlerIndex] pickFields failed for employees:",
          e && e.message
        );
      }
    }

    const format = String(req.query.format || "").toLowerCase();
    if (format === "xlsx") {
      if (typeof reportService.renderExcelBuffer !== "function")
        return res
          .status(500)
          .json({ message: "Excel renderer not available" });
      const buf = await reportService.renderExcelBuffer(toExport, null);
      const filename = "employees_report.xlsx";
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
        "Employees Report",
        toExport,
        { meta: {} }
      );
      const filename = "employees_report.pdf";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuf.length);
      return res.send(pdfBuf);
    } else {
      // default: return JSON
      return res.json(rowsArr);
    }
  } catch (e) {
    console.error(
      "[reportsHandlerIndex] downloadEmployeesReport failed:",
      e && (e.stack || e.message)
    );
    return res.status(500).json({ message: "Failed to fetch employee report" });
  }
}

/**
 * VENDORS export / preview
 */
async function downloadVendorsReport(req, res) {
  console.log(
    "[reportsHandlerIndex] downloadVendorsReport called - query:",
    req.query || {}
  );
  try {
    const startDate = req.query.startDate ?? req.query.start_date ?? null;
    const endDate = req.query.endDate ?? req.query.end_date ?? null;
    const params = [startDate, startDate, endDate, endDate];
    const rows = await fetchRows(queries.GET_VENDOR_REPORT, params);
    const rowsArr = Array.isArray(rows) ? rows : [];

    if (
      req.query &&
      (req.query.preview === "true" || req.query.preview === true)
    ) {
      return res.json(rowsArr);
    }

    // fields support (optional) - apply pickFields if available
    const fields = parseFieldsParam(req.query.fields);
    let toExport = rowsArr;
    if (fields && typeof reportService.pickFields === "function") {
      try {
        toExport = reportService.pickFields(rowsArr, fields);
      } catch (e) {
        console.warn(
          "[reportsHandlerIndex] pickFields failed for vendors:",
          e && e.message
        );
      }
    }

    const format = String(req.query.format || "").toLowerCase();
    if (format === "xlsx") {
      if (typeof reportService.renderExcelBuffer !== "function")
        return res
          .status(500)
          .json({ message: "Excel renderer not available" });
      const buf = await reportService.renderExcelBuffer(toExport, null);
      const filename = "vendors_report.xlsx";
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
        "Vendors Report",
        toExport,
        { meta: {} }
      );
      const filename = "vendors_report.pdf";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuf.length);
      return res.send(pdfBuf);
    } else {
      return res.json(rowsArr);
    }
  } catch (e) {
    console.error(
      "[reportsHandlerIndex] downloadVendorsReport failed:",
      e && (e.stack || e.message)
    );
    return res.status(500).json({ message: "Failed to fetch vendors report" });
  }
}

// ensureExport helper (keeps original behavior if handler missing)
function ensureExport(fn, fallbackName) {
  if (typeof fn === "function") return fn;
  return (req, res) => {
    console.error(`[reportsHandlerIndex] Handler "${fallbackName}" missing.`);
    return res
      .status(501)
      .json({ message: `${fallbackName} not implemented here.` });
  };
}

module.exports = {
  downloadAttendanceReport: wrapHandlerWithDerivedDept(
    ensureExport(
      attendanceHandler.downloadAttendanceReport,
      "downloadAttendanceReport"
    )
  ),
  downloadLeavesReport: wrapHandlerWithDerivedDept(
    ensureExport(leavesHandler.downloadLeavesReport, "downloadLeavesReport")
  ),
  downloadTasksSupervisorReport: wrapHandlerWithDerivedDept(
    ensureExport(
      tasksHandler.downloadTasksSupervisorReport,
      "downloadTasksSupervisorReport"
    )
  ),
  downloadTasksEmployeeReport: wrapHandlerWithDerivedDept(
    ensureExport(
      tasksHandler.downloadTasksEmployeeReport,
      "downloadTasksEmployeeReport"
    )
  ),
  downloadAssetsReport: ensureExport(
    assetsHandler.downloadAssetsReport,
    "downloadAssetsReport"
  ),
  downloadReimbursementsReport: wrapHandlerWithDerivedDept(
    ensureExport(
      reimbursementsHandler.downloadReimbursementsReport,
      "downloadReimbursementsReport"
    )
  ),

  // wrap searchEmployees so manager requesters are scoped to their department
  searchEmployees: wrapHandlerWithDerivedDept(searchEmployees),

  // implemented small endpoints here
  getDepartments,
  downloadEmployeesReport: wrapHandlerWithDerivedDept(downloadEmployeesReport),

  downloadVendorsReport,
};
