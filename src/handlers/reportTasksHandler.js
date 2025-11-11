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

const db = require("../config");
const mysql = require("mysql2");

async function dbExec(sql, params = []) {
  try {
    if (!Array.isArray(params)) params = [params];
    const finalSql = mysql.format(sql, params);
    if (db && typeof db.query === "function") {
      return new Promise((resolve, reject) => {
        db.query(finalSql, (err, rows, fields) => {
          if (err) return reject(err);
          resolve([rows, fields]);
        });
      });
    } else if (db && typeof db.execute === "function") {
      return db.execute(finalSql);
    } else throw new Error("DB client has no query/execute");
  } catch (e) {
    console.error(
      "[reportTasksHandler][dbExec] error:",
      e && (e.stack || e.message)
    );
    throw e;
  }
}

const MAX_DOWNLOAD_FIELDS_TASKS = 13;

/**
 * Build report metadata (human-friendly) from query parameters.
 * It will prefer emp_status when present and add both normalized token (meta.status)
 * and original label (meta.statusLabel) so downstream renderers can show friendly text.
 */
async function buildMetaFromReqQuery(query = {}) {
  const meta = {};

  // Prefer emp_status (employee-driven) but fall back to status/task_status
  const rawEmpStatus =
    coerceToString(query.emp_status, null) ||
    coerceToString(query.empStatus, null) ||
    coerceToString(query.status, null) ||
    coerceToString(query.task_status, null);

  if (rawEmpStatus) {
    try {
      const normalized = normalizeStatusForQuery(rawEmpStatus);
      meta.status = normalized || rawEmpStatus;
      // Keep original label too for nicer PDF cover pages
      meta.statusLabel = rawEmpStatus;
    } catch (e) {
      meta.status = rawEmpStatus;
      meta.statusLabel = rawEmpStatus;
    }
  }

  const typedEmployeeName =
    coerceToString(query.employee_name, null) ||
    coerceToString(query.employeeName, null) ||
    coerceToString(query.employee, null);
  if (typedEmployeeName) meta.employeeName = typedEmployeeName;
  else {
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

/* --------------------------
   Supervisor-driven tasks
   (kept behaviour unchanged)
   -------------------------- */
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

    const rawTasks = await reportService.getTaskRows(
      startDate,
      endDate,
      status,
      fields,
      employeeId,
      departmentId
    );
    const rows = Array.isArray(rawTasks) ? rawTasks : [];

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

    const filtered = rows.filter((t) =>
      statusMatches(normalizeStatusForQuery(status), [t.status])
    );
    if (filtered.length === 0)
      return res
        .status(404)
        .json({ message: "No task data for selected date range" });

    const tasksForExcel = pickFields(filtered, fields);
    const tasksForPdf = filtered;

    const meta = await buildMetaFromReqQuery(req.query || {});
    console.debug("[reportTasksHandler] render meta (supervisor):", meta);

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
    } else return res.status(400).json({ message: "Invalid format" });
  } catch (err) {
    console.error(
      "[reportTasksHandler] Error rendering Tasks (Supervisor) report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

/* --------------------------
   Employee-driven weekly tasks
   - Only filter by emp_status (emp_status column)
   - Accepts emp_status (or empStatus) parameter from UI
   - UI options expected: "All", "Completed", "Not started", "Working"
   -------------------------- */
async function downloadTasksEmployeeReport(req, res) {
  console.log(
    "[reportTasksHandler] downloadTasksEmployeeReport called - query:",
    req.query
  );
  try {
    // parseDates will normalize "status" if provided under 'status'
    const parsed = parseDates(req.query);
    let { startDate, endDate, status: parsedStatus, format, fields } = parsed;

    // Prefer emp_status (employee-driven filter). Support emp_status or empStatus keys.
    const rawEmpStatus =
      coerceToString(req.query.emp_status, null) ||
      coerceToString(req.query.empStatus, null) ||
      // fall back to parsed status only if emp_status absent
      coerceToString(parsedStatus, null) ||
      null;

    // Normalize emp_status token to canonical form (or null if 'all' / empty)
    const normalizedEmpStatus = normalizeStatusForQuery(rawEmpStatus);

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

    let rawWeekly;
    try {
      // We pass parsedStatus to service (if service expects general status filtering).
      // We intentionally do NOT rely on service to apply emp_status filter — we apply it locally,
      // so that employee-driven `emp_status` behavior is consistent regardless of service internals.
      rawWeekly = await reportService.getWeeklyTaskRows(
        startDate,
        endDate,
        parsedStatus,
        fields,
        employeeId,
        departmentId
      );
    } catch (e) {
      console.error(
        "[reportTasksHandler] getWeeklyTaskRows failed:",
        e && (e.stack || e.message)
      );
      // Surface DB/service errors so they're visible in logs and client receives a meaningful message.
      const msg =
        e && e.message && typeof e.message === "string"
          ? `Service error: ${e.message}`
          : "Failed to fetch weekly task rows";
      return res.status(500).json({ message: msg });
    }

    const rows = Array.isArray(rawWeekly) ? rawWeekly : [];

    // IMPORTANT: filter only on emp_status (per your requirement).
    // If normalizedEmpStatus is null => treat as "All" (no filter).
    const filtered = rows.filter((w) =>
      statusMatches(normalizedEmpStatus, [w && w.emp_status])
    );

    if (isPreview) {
      const msg =
        filtered.length === 0
          ? "No weekly task data for selected date range"
          : undefined;

      // sendPreviewResponse builds some meta from req.query; it will not see emp_status in meta.status
      // unless emp_status is present in req.query (it usually is). sendPreviewResponse will still return rows.
      return sendPreviewResponse(req, res, filtered, msg);
    }

    if (filtered.length === 0)
      return res
        .status(404)
        .json({ message: "No weekly task data for selected date range" });

    const weeklyForExcel = pickFields(filtered, fields);
    const weeklyForPdf = filtered;
    const meta = await buildMetaFromReqQuery(req.query || {});
    // ensure meta.status reflects emp_status canonical token (if present)
    if (normalizedEmpStatus) meta.status = normalizedEmpStatus;
    // keep a friendly label if we had a raw label
    if (rawEmpStatus && !meta.statusLabel) meta.statusLabel = rawEmpStatus;
    console.debug("[reportTasksHandler] render meta (employee):", meta);

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
    } else return res.status(400).json({ message: "Invalid format" });
  } catch (err) {
    console.error(
      "[reportTasksHandler] Error rendering Tasks (Employee) report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { downloadTasksSupervisorReport, downloadTasksEmployeeReport };
