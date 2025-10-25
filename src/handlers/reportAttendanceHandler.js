// src/handlers/reportAttendanceHandler.js
const reportService = require("../services/reportIndex");
const {
  coerceToString,
  isPreviewRequest,
  sendPreviewResponse,
  safeFilename,
  parseDates,
  ensureTwoMonthWindow,
  applyEmployeeAndDepartmentFilters,
} = require("../services/reportFilters");

/* build meta helper */
async function buildMetaFromReqQuery(query = {}) {
  const meta = {};
  const rawStatus =
    coerceToString(query.status, null) ||
    coerceToString(query.punch_status, null);
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

async function downloadAttendanceReport(req, res) {
  console.log(
    "[reportAttendanceHandler] downloadAttendanceReport called - query:",
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
      employeeId,
      departmentId
    );
    rows = Array.isArray(rows) ? rows : [];

    if ((employeeId || departmentId) && rows.length > 0) {
      rows = await applyEmployeeAndDepartmentFilters(
        rows,
        employeeId,
        departmentId
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
