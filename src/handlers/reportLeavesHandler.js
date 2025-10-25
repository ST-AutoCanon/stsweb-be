// src/handlers/reportLeavesHandler.js
const reportService = require("../services/reportIndex");
const {
  coerceToString,
  isPreviewRequest,
  sendPreviewResponse,
  safeFilename,
  parseDates,
  ensureTwoMonthWindow,
  pickFields,
  normalizeStatusForQuery,
  statusMatches,
} = require("../services/reportFilters");

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
  if (typedDept) {
    meta.department = typedDept;
  } else {
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

async function downloadLeavesReport(req, res) {
  console.log(
    "[reportLeavesHandler] downloadLeavesReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query || {});
    let { startDate, endDate, status, format, fields } = parsed;
    const employeeId = coerceToString(req.query.employee_id, null);
    const departmentId = coerceToString(req.query.department_id, null);

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    if (typeof reportService.getLeaveRows !== "function")
      return res.status(500).json({ message: "Server misconfiguration" });

    const rawLeaves = await reportService.getLeaveRows(
      startDate,
      endDate,
      status,
      null,
      employeeId,
      departmentId
    );
    if (!Array.isArray(rawLeaves))
      return res.status(500).json({ message: "Failed to fetch leave data" });

    const statusCandidate = normalizeStatusForQuery(status);
    const filtered = rawLeaves.filter((l) =>
      statusMatches(statusCandidate, [l.status])
    );

    // Preview handling — always 200 JSON, include friendly message if no rows
    if (isPreviewRequest(req)) {
      const rows = Array.isArray(filtered) ? filtered : [];
      const msg =
        rows.length === 0 ? "No leave data for selected date range" : undefined;
      return sendPreviewResponse(req, res, rows, msg);
    }

    // Non-preview downloads: preserve existing behavior (404 when empty)
    if (filtered.length === 0)
      return res
        .status(404)
        .json({ message: "No leave data for selected date range" });

    const leavesToExport = pickFields(filtered, fields);

    // build meta
    const meta = await buildMetaFromReqQuery(req.query || {});
    console.debug("[reportLeavesHandler] render meta:", meta);

    if (format === "xlsx") {
      if (typeof reportService.renderExcelBuffer !== "function")
        return res
          .status(500)
          .json({ message: "Excel renderer not available" });
      const buf = await reportService.renderExcelBuffer(leavesToExport, null);
      const filename = safeFilename("leaves_report", "xlsx");
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
        "Leaves Report",
        leavesToExport,
        { meta }
      );
      const filename = safeFilename("leaves_report", "pdf");
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
      "[reportLeavesHandler] Error rendering Leaves report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { downloadLeavesReport };
