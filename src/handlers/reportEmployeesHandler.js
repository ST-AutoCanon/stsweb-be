// src/handlers/reportEmployeesHandler.js
const reportService = require("../services/reportIndex");
const {
  coerceToString,
  parseDates,
  ensureTwoMonthWindow,
  isPreviewRequest,
  sendPreviewResponse,
  safeFilename,
  pickFields,
  normalizeStatusForQuery,
  statusMatches,
} = require("../services/reportFilters");

const db = require("../config"); // DB fallback

async function buildMetaFromReqQuery(query = {}) {
  const meta = {};
  const rawStatus =
    coerceToString(query.status, null) ||
    coerceToString(query.approval_status, null);
  if (rawStatus) {
    try {
      meta.status =
        typeof reportService.normalizeStatusForQuery === "function"
          ? reportService.normalizeStatusForQuery(rawStatus) || rawStatus
          : rawStatus;
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
    const empId = coerceToString(query.employee_id ?? query.employeeId, null);
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
  if (typedDept) {
    meta.department = typedDept;
  } else {
    const deptId = coerceToString(
      query.department_id ?? query.departmentId,
      null
    );
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

async function downloadEmployeesReport(req, res) {
  console.log(
    "[reportEmployeesHandler] downloadEmployeesReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query || {});
    let { startDate, endDate, status, format, fields } = parsed;

    const employeeId = coerceToString(
      req.query.employee_id ?? req.query.employeeId,
      null
    );
    const departmentId = coerceToString(
      req.query.department_id ?? req.query.departmentId,
      null
    );

    // ensure date window rules
    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) {
      return res.status(400).json({ message: ensured.message });
    }
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    if (typeof reportService.getEmployeeRows !== "function") {
      console.error(
        "[reportEmployeesHandler] reportService.getEmployeeRows missing"
      );
      return res.status(500).json({ message: "Server misconfiguration" });
    }

    const rawRows = await reportService.getEmployeeRows(
      startDate,
      endDate,
      status,
      null,
      employeeId,
      departmentId
    );
    const rows = Array.isArray(rawRows) ? rawRows : [];

    // preview: send friendly message when empty
    if (isPreviewRequest(req)) {
      const msg =
        rows.length === 0
          ? "No employee data for selected date range"
          : undefined;
      return sendPreviewResponse(req, res, rows, msg);
    }

    if (!Array.isArray(rawRows)) {
      return res.status(500).json({ message: "Failed to fetch employee data" });
    }

    // apply status filtering (if frontend sent status)
    const statusCandidate = normalizeStatusForQuery(status);
    const filtered = rawRows.filter((r) =>
      statusMatches(statusCandidate, [
        r.status,
        r.emp_status,
        r.approval_status,
      ])
    );

    if (filtered.length === 0) {
      return res
        .status(404)
        .json({ message: "No employee data for selected date range" });
    }

    // pick only requested fields (if any)
    const rowsToExport = pickFields(filtered, fields);

    // build meta
    const meta = await buildMetaFromReqQuery(req.query || {});
    console.debug("[reportEmployeesHandler] render meta:", meta);

    if (format === "xlsx") {
      if (typeof reportService.renderExcelBuffer !== "function") {
        return res
          .status(500)
          .json({ message: "Excel renderer not available" });
      }
      const buf = await reportService.renderExcelBuffer(rowsToExport, null);
      const filename = safeFilename("employees_report", "xlsx");
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
      if (typeof reportService.renderPdfBuffer !== "function") {
        return res.status(500).json({ message: "PDF renderer not available" });
      }
      const pdfBuf = await reportService.renderPdfBuffer(
        "Employees Report",
        rowsToExport,
        { meta }
      );
      const filename = safeFilename("employees_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuf.length);
      return res.send(pdfBuf);
    } else {
      return res.status(400).json({ message: "Invalid format" });
    }
  } catch (err) {
    console.error(
      "[reportEmployeesHandler] Error rendering Employees report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * searchEmployees - typeahead endpoint
 */
async function searchEmployees(req, res) {
  try {
    const qRaw = coerceToString(req.query.q, "");
    const q = qRaw.trim();
    const rawLimit = parseInt(req.query.limit || "10", 10);
    const limit = Math.min(Number.isNaN(rawLimit) ? 10 : rawLimit, 500);
    const departmentId = coerceToString(
      req.query.department_id ?? req.query.departmentId,
      null
    );

    if (!q) {
      return res.json({ results: [], total: 0 });
    }

    if (reportService && typeof reportService.searchEmployees === "function") {
      try {
        const svcRes = await reportService.searchEmployees({
          q,
          limit,
          departmentId,
          req,
        });
        if (!svcRes) return res.json({ results: [], total: 0 });

        if (Array.isArray(svcRes)) {
          return res.json({ results: svcRes, total: svcRes.length });
        }
        if (Array.isArray(svcRes.results)) {
          return res.json({
            results: svcRes.results,
            total: Number.isFinite(Number(svcRes.total))
              ? Number(svcRes.total)
              : svcRes.results.length,
          });
        }
        if (Array.isArray(svcRes.data)) {
          return res.json({
            results: svcRes.data,
            total: Number.isFinite(Number(svcRes.total))
              ? Number(svcRes.total)
              : svcRes.data.length,
          });
        }
        return res.json({ results: [svcRes], total: 1 });
      } catch (svcErr) {
        console.error(
          "[reportEmployeesHandler] reportService.searchEmployees error:",
          svcErr && (svcErr.stack || svcErr)
        );
      }
    }

    if (!db || typeof db.execute !== "function") {
      console.error(
        "[reportEmployeesHandler] No DB available for search fallback"
      );
      return res
        .status(501)
        .json({ message: "Search not implemented on server" });
    }

    const safe = q.replace(/%/g, "\\%");
    const wildcard = `%${safe}%`;
    const sql = `
      SELECT
        e.employee_id AS employee_id,
        CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name,
        e.email AS email,
        ep.department_id AS department_id,
        COALESCE(d.name, '') AS department_name
      FROM employees e
      INNER JOIN employee_professional ep ON e.employee_id = ep.employee_id
      LEFT JOIN departments d ON ep.department_id = d.id
      WHERE (CONCAT_WS(' ', e.first_name, e.last_name) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
      ${departmentId ? " AND ep.department_id = ?" : ""}
      ORDER BY employee_name ASC
      LIMIT ?
    `;
    const params = [wildcard, wildcard, wildcard];
    if (departmentId) params.push(departmentId);
    params.push(limit);

    let rows = [];
    try {
      const [resultRows] = await db.execute(sql, params);
      rows = Array.isArray(resultRows) ? resultRows : [];
    } catch (mainErr) {
      console.warn(
        "[reportEmployeesHandler] Search main query failed, trying fallback (without departments):",
        mainErr && mainErr.message
      );
      const altSql = `
        SELECT
          e.employee_id AS employee_id,
          CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name,
          e.email AS email,
          ep.department_id AS department_id,
          '' AS department_name
        FROM employees e
        INNER JOIN employee_professional ep ON e.employee_id = ep.employee_id
        WHERE (CONCAT_WS(' ', e.first_name, e.last_name) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
        ${departmentId ? " AND ep.department_id = ?" : ""}
        ORDER BY employee_name ASC
        LIMIT ?
      `;
      const altParams = [wildcard, wildcard, wildcard];
      if (departmentId) altParams.push(departmentId);
      altParams.push(limit);
      const [altRows] = await db.execute(altSql, altParams);
      rows = Array.isArray(altRows) ? altRows : [];
    }

    let total = rows.length;
    if (rows.length === limit) {
      try {
        let countSql = `
          SELECT COUNT(*) AS cnt
          FROM employees e
          INNER JOIN employee_professional ep ON e.employee_id = ep.employee_id
          WHERE (CONCAT_WS(' ', e.first_name, e.last_name) LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)
        `;
        const countParams = [wildcard, wildcard, wildcard];
        if (departmentId) {
          countSql += " AND ep.department_id = ?";
          countParams.push(departmentId);
        }
        const [cntRows] = await db.execute(countSql, countParams);
        if (
          Array.isArray(cntRows) &&
          cntRows[0] &&
          typeof cntRows[0].cnt !== "undefined"
        ) {
          total = Number(cntRows[0].cnt);
        }
      } catch (cntErr) {
        console.warn(
          "[reportEmployeesHandler] search count query failed:",
          cntErr && cntErr.message
        );
      }
    }

    const results = rows.map((r) => ({
      employee_id: r.employee_id ?? null,
      employee_name: r.employee_name ?? "",
      email: r.email ?? "",
      department_id: r.department_id ?? null,
      department_name: r.department_name ?? "",
    }));

    return res.json({ results, total });
  } catch (err) {
    console.error(
      "[reportEmployeesHandler] searchEmployees error:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Search failed" });
  }
}

module.exports = { downloadEmployeesReport, searchEmployees };
