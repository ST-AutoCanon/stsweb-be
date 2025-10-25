// src/handlers/reportTasksHandler.js
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

const MAX_DOWNLOAD_FIELDS_TASKS = 13;

/**
 * Build normalized meta from query and try to resolve ids to names.
 * Returns { status?, department?, employeeName? }
 */
async function buildMetaFromReqQuery(query = {}) {
  const meta = {};

  const rawStatus =
    coerceToString(query.status, null) ||
    coerceToString(query.task_status, null);
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
          const svcRes = await reportService.searchEmployees({
            q: empId,
            limit: 1,
            departmentId: coerceToString(query.department_id, null),
          });
          let found = null;
          if (Array.isArray(svcRes) && svcRes.length) found = svcRes[0];
          else if (svcRes && Array.isArray(svcRes.results) && svcRes.results[0])
            found = svcRes.results[0];
          else if (svcRes && Array.isArray(svcRes.data) && svcRes.data[0])
            found = svcRes.data[0];
          meta.employeeName =
            (found &&
              (found.employee_name ||
                `${found.first_name || ""} ${found.last_name || ""}`.trim())) ||
            empId;
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
        } else {
          meta.employeeName = empId;
        }
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
                  String(d.department_id || d.departmentId || d.id) ===
                    String(deptId))
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

async function downloadTasksSupervisorReport(req, res) {
  console.log(
    "[reportTasksHandler] downloadTasksSupervisorReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query);
    let { startDate, endDate, status, format, fields } = parsed;
    const employeeId = coerceToString(req.query.employee_id, null);
    const departmentId = coerceToString(req.query.department_id, null);

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    if (fields && fields.length > MAX_DOWNLOAD_FIELDS_TASKS) {
      return res.status(400).json({
        message: `Too many fields selected for download. Maximum allowed is ${MAX_DOWNLOAD_FIELDS_TASKS}.`,
      });
    }

    if (typeof reportService.getTaskRows !== "function")
      return res.status(500).json({ message: "Server misconfiguration" });

    // IMPORTANT: pass status and fields into service so SQL-level filtering works
    const rawTasks = await reportService.getTaskRows(
      startDate,
      endDate,
      status, // parsed status (may be null for 'All')
      fields, // requested fields
      employeeId,
      departmentId
    );
    const rows = Array.isArray(rawTasks) ? rawTasks : [];

    // preview support (returns JSON preview matching UI)
    if (isPreviewRequest(req)) {
      const filteredPreview = rows.filter((t) =>
        statusMatches(normalizeStatusForQuery(status), [t.status])
      );
      const msg =
        filteredPreview.length === 0
          ? "No task data for selected date range"
          : undefined;
      return sendPreviewResponse(req, res, filteredPreview, msg);
    }

    // For actual download: filter similarly (status matching)
    const filtered = rows.filter((t) =>
      statusMatches(normalizeStatusForQuery(status), [t.status])
    );

    if (filtered.length === 0)
      return res
        .status(404)
        .json({ message: "No task data for selected date range" });

    // For Excel use pickFields (honor requested fields)
    const tasksForExcel = pickFields(filtered, fields);

    // For PDF render, use the full filtered rows (not pickFields) so HTML table has proper headers & rows
    const tasksForPdf = filtered;

    const meta = await buildMetaFromReqQuery(req.query || {});
    console.debug("[reportTasksHandler] render meta (supervisor):", meta);

    // --- NEW: diagnostics just before rendering ---
    console.debug(
      "[reportTasksHandler] supervisor PDF render - rows count:",
      tasksForPdf.length
    );
    if (tasksForPdf.length > 0) {
      try {
        console.debug(
          "[reportTasksHandler] supervisor PDF render - sample row keys:",
          Object.keys(tasksForPdf[0]).slice(0, 12)
        );
        const sample = Object.fromEntries(
          Object.entries(tasksForPdf[0]).map(([k, v]) => [
            k,
            v && String(v).length > 200
              ? String(v).slice(0, 200) + "…(truncated)"
              : v,
          ])
        );
        console.debug(
          "[reportTasksHandler] supervisor PDF render - sample row:",
          sample
        );
      } catch (e) {
        console.debug(
          "[reportTasksHandler] error printing sample row:",
          e && e.message
        );
      }
    }

    if (format === "xlsx") {
      const buf =
        typeof reportService.renderTasksExcelBuffer === "function"
          ? await reportService.renderTasksExcelBuffer(tasksForExcel, [])
          : await reportService.renderExcelBuffer(tasksForExcel, null);
      const filename = safeFilename("tasks_supervisor_report", "xlsx");
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
      // NOTE: use generic renderPdfBuffer to avoid custom renderers that might mis-handle supervisor tasks
      let pdfBuf;
      try {
        pdfBuf = await reportService.renderPdfBuffer(
          "Tasks (Supervisor) Report",
          tasksForPdf,
          { meta }
        );
      } catch (e) {
        console.error(
          "[reportTasksHandler] renderPdfBuffer failed for supervisor tasks:",
          e && (e.stack || e)
        );
        return res.status(500).json({ message: "Failed to render PDF" });
      }

      if (!pdfBuf || !Buffer.isBuffer(pdfBuf) || pdfBuf.length === 0) {
        console.error(
          "[reportTasksHandler] renderPdfBuffer returned empty buffer for supervisor tasks."
        );
        return res
          .status(500)
          .json({ message: "Failed to render PDF (empty)" });
      }

      const filename = safeFilename("tasks_supervisor_report", "pdf");
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
      "[reportTasksHandler] Error rendering Tasks (Supervisor) report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function downloadTasksEmployeeReport(req, res) {
  console.log(
    "[reportTasksHandler] downloadTasksEmployeeReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query);
    let { startDate, endDate, status, format, fields } = parsed;
    const employeeId = coerceToString(req.query.employee_id, null);
    const departmentId = coerceToString(req.query.department_id, null);

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    const isPreview = isPreviewRequest(req);
    if (!isPreview && fields && fields.length > MAX_DOWNLOAD_FIELDS_TASKS) {
      return res.status(400).json({
        message: `Too many fields selected for download. Maximum allowed is ${MAX_DOWNLOAD_FIELDS_TASKS}.`,
      });
    }

    if (typeof reportService.getWeeklyTaskRows !== "function")
      return res.status(500).json({ message: "Server misconfiguration" });

    const rawWeekly = await reportService.getWeeklyTaskRows(
      startDate,
      endDate,
      status, // pass parsed status
      fields, // pass requested fields to service
      employeeId,
      departmentId
    );

    const rows = Array.isArray(rawWeekly) ? rawWeekly : [];

    const statusCandidate = normalizeStatusForQuery(status);
    const filtered = rows.filter((w) =>
      statusMatches(statusCandidate, [
        w.emp_status,
        w.sup_status,
        w.sup_review_status,
        w.status,
      ])
    );

    if (isPreview) {
      const msg =
        filtered.length === 0
          ? "No weekly task data for selected date range"
          : undefined;
      return sendPreviewResponse(req, res, filtered, msg);
    }

    if (filtered.length === 0)
      return res
        .status(404)
        .json({ message: "No weekly task data for selected date range" });

    const weeklyForExcel = pickFields(filtered, fields);
    const weeklyForPdf = filtered;

    const meta = await buildMetaFromReqQuery(req.query || {});
    console.debug("[reportTasksHandler] render meta (employee):", meta);

    // diagnostics
    console.debug(
      "[reportTasksHandler] employee PDF render - rows count:",
      weeklyForPdf.length
    );
    if (weeklyForPdf.length > 0) {
      try {
        console.debug(
          "[reportTasksHandler] employee PDF render - sample keys:",
          Object.keys(weeklyForPdf[0]).slice(0, 12)
        );
      } catch (e) {}
    }

    if (format === "xlsx") {
      const buf =
        typeof reportService.renderTasksExcelBuffer === "function"
          ? await reportService.renderTasksExcelBuffer([], weeklyForExcel)
          : await reportService.renderExcelBuffer(weeklyForExcel, null);
      const filename = safeFilename("tasks_employee_report", "xlsx");
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
      let pdfBuf;
      try {
        pdfBuf = await reportService.renderPdfBuffer(
          "Tasks (Employee) Report",
          weeklyForPdf,
          { meta }
        );
      } catch (e) {
        console.error(
          "[reportTasksHandler] renderPdfBuffer failed for employee tasks:",
          e && (e.stack || e)
        );
        return res.status(500).json({ message: "Failed to render PDF" });
      }

      if (!pdfBuf || !Buffer.isBuffer(pdfBuf) || pdfBuf.length === 0) {
        console.error(
          "[reportTasksHandler] renderPdfBuffer returned empty buffer for employee tasks."
        );
        return res
          .status(500)
          .json({ message: "Failed to render PDF (empty)" });
      }

      const filename = safeFilename("tasks_employee_report", "pdf");
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
      "[reportTasksHandler] Error rendering Tasks (Employee) report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { downloadTasksSupervisorReport, downloadTasksEmployeeReport };
