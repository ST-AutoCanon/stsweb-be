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

/**
 * Helper: build meta object from req.query and optionally resolve ids to names.
 * Returns { status?, department?, employeeName? }
 */
async function buildMetaFromReqQuery(query = {}) {
  const meta = {};

  // Normalize status (use reportFilters helper to canonicalize if possible)
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

  // Employee: prefer explicit employee_name then try resolve employee_id -> name
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
      // Try resolving via reportService.searchEmployees/getEmployeeRows if available
      try {
        if (typeof reportService.searchEmployees === "function") {
          // searchEmployees may accept id or partial name — adapt if necessary
          const found = await reportService.searchEmployees(empId);
          if (Array.isArray(found) && found[0]) {
            meta.employeeName =
              found[0].employee_name ||
              `${(found[0].first_name || "").trim()} ${(
                found[0].last_name || ""
              ).trim()}`.trim() ||
              empId;
          } else {
            meta.employeeName = empId;
          }
        } else if (typeof reportService.getEmployeeRows === "function") {
          const er = await reportService.getEmployeeRows(empId);
          if (Array.isArray(er) && er[0]) {
            meta.employeeName =
              er[0].employee_name ||
              `${(er[0].first_name || "").trim()} ${(
                er[0].last_name || ""
              ).trim()}`.trim() ||
              empId;
          } else {
            meta.employeeName = empId;
          }
        } else {
          meta.employeeName = empId;
        }
      } catch (e) {
        // resolution failed - fall back to id
        meta.employeeName = empId;
      }
    }
  }

  // Department: prefer explicit department_name then try resolve department_id -> name
  const typedDeptName =
    coerceToString(query.department_name, null) ||
    coerceToString(query.departmentName, null) ||
    coerceToString(query.department, null);

  if (typedDeptName) {
    meta.department = typedDeptName;
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
                  String(
                    d.department_id || d.departmentId || d.department_id || d.id
                  ) === String(deptId) ||
                  String(d.name || d.department_name || d.department) ===
                    String(deptId))
            );
            meta.department =
              (found &&
                (found.name || found.department_name || found.department)) ||
              deptId;
          } else {
            meta.department = deptId;
          }
        } else if (
          typeof reportService.getDepartments === "undefined" &&
          typeof reportService.getDepartments === "function"
        ) {
          // defensive - unlikely to happen, fallback to id
          meta.department = deptId;
        } else {
          // no departments helper - fallback to id
          meta.department = deptId;
        }
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
  try {
    const parsed = parseDates(req.query || {});
    let { startDate, endDate, status, format, fields } = parsed;

    const employeeId = coerceToString(req.query.employee_id, null);
    const departmentId = coerceToString(req.query.department_id, null);

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    if (typeof reportService.getReimbursementRows !== "function")
      return res.status(500).json({ message: "Server misconfiguration" });

    const rawReimbursements = await reportService.getReimbursementRows(
      startDate,
      endDate,
      status,
      null,
      employeeId,
      departmentId
    );
    const rows = Array.isArray(rawReimbursements) ? rawReimbursements : [];

    if (isPreviewRequest(req)) {
      const msg =
        rows.length === 0
          ? "No reimbursement data for selected date range"
          : undefined;
      return sendPreviewResponse(req, res, rows, msg);
    }

    if (!Array.isArray(rawReimbursements))
      return res
        .status(500)
        .json({ message: "Failed to fetch reimbursement data" });

    const statusCandidate = normalizeStatusForQuery(status);
    const filtered = rawReimbursements.filter((r) =>
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

    // Build meta and ensure we pass it to renderers (so header shows filters)
    const meta = await buildMetaFromReqQuery(req.query || {});
    // Debug log so you can verify meta contents in server logs
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

      // IMPORTANT: pass meta explicitly as third parameter (renderPdfBuffer(title, rows, options))
      const pdfBuf = await reportService.renderPdfBuffer(
        "Reimbursements Report",
        reimbursementsToExport,
        { meta } // <<-- pass normalized meta here
      );
      const filename = safeFilename("reimbursements_report", "pdf");
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
      "[reportReimbursementsHandler] Error rendering Reimbursements report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { downloadReimbursementsReport };
