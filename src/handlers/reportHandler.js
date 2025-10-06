const reportService = require("../services/reportService");

/**
 * Helper: normalize status safely.
 * If reportService exposes a custom normalizer, use it (useful for component-specific logic).
 * Otherwise coerce empty/"All" to null and trim strings.
 */
function normalizeStatusForQuery(status) {
  if (
    reportService &&
    typeof reportService.normalizeStatusForQuery === "function"
  ) {
    return reportService.normalizeStatusForQuery(status);
  }

  if (status === undefined || status === null) return null;
  if (typeof status === "string") {
    const s = status.trim();
    if (s === "" || s.toLowerCase() === "all") return null;
    return s;
  }
  // fallback: return as-is
  return status;
}

/**
 * parseDates(req.query)
 * - coerce repeated params (array) to a single value (last occurrence)
 * - normalize format, status, fields
 */
function parseDates(q) {
  // safe helper to coerce param to single string (pick last item if array)
  function coerceToString(val, fallback = null) {
    if (val === undefined || val === null) return fallback;
    if (Array.isArray(val)) {
      // pick the last occurrence (frontend might send duplicates)
      val = val[val.length - 1];
    }
    try {
      const s = String(val);
      return s.length ? s : fallback;
    } catch (e) {
      return fallback;
    }
  }

  const rawFormat = coerceToString(q.format, "xlsx");
  const format = (rawFormat || "xlsx").toLowerCase();

  const rawStatus = coerceToString(q.status, null);
  // normalize "All" -> null, trim otherwise
  const statusCandidate =
    rawStatus && String(rawStatus).trim().toLowerCase() === "all"
      ? null
      : rawStatus;

  const status = normalizeStatusForQuery(statusCandidate);

  const startDate = coerceToString(q.startDate, null);
  const endDate = coerceToString(q.endDate, null);

  const rawFields = coerceToString(q.fields, null);
  const fields = rawFields
    ? String(rawFields)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  return {
    startDate: startDate || null,
    endDate: endDate || null,
    status: status || null,
    format,
    fields,
  };
}

/**
 * Decide whether this request is a preview request.
 * We accept explicit `preview=true` or an Accept header of application/json.
 * (Frontend should set Accept to the correct binary mime when requesting downloads.)
 */
function isPreviewRequest(req) {
  const q = req.query && req.query.preview;
  const accept = req.headers && req.headers.accept;
  return (
    String(q).toLowerCase() === "true" ||
    (accept && accept.includes("application/json"))
  );
}

/**
 * Send preview JSON response. Supports optional previewLimit from query.
 * Always returns JSON: { rows: [...], totalRows }
 */
function sendPreviewResponse(req, res, rows) {
  const limitRaw = req.query && req.query.previewLimit;
  let previewLimit = null;
  if (limitRaw != null) {
    const n = parseInt(limitRaw, 10);
    previewLimit = Number.isFinite(n) && n > 0 ? n : null;
  }
  const totalRows = Array.isArray(rows) ? rows.length : 0;
  const outRows = Array.isArray(rows)
    ? previewLimit && previewLimit > 0
      ? rows.slice(0, previewLimit)
      : rows
    : [];

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({ rows: outRows, totalRows });
}

function safeFilename(base, ext) {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  return `${base}_${now}.${ext}`;
}

/* ---------- Range enforcement helpers (2-month limit) ---------- */
const MAX_RANGE_DAYS = 62; // roughly two months (adjust if you prefer 60/61)

// parse YYYY-MM-DD into a UTC Date (returns null for invalid)
function parseDateISO(d) {
  if (!d) return null;
  if (typeof d !== "string") return null;
  const parts = d.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day))
    return null;
  // Use UTC to avoid timezone shift issues
  return new Date(Date.UTC(y, m, day));
}

function daysBetweenInclusive(startIso, endIso) {
  const s = parseDateISO(startIso);
  const e = parseDateISO(endIso);
  if (!s || !e) return Infinity;
  const diffMs = e.getTime() - s.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

// Ensure both start & end are present or default to last 2 months.
// Returns { ok: true, startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
// or { ok: false, message }
function ensureTwoMonthWindow(startDate, endDate) {
  const now = new Date();

  // If both missing -> default: start = today - 2 months, end = today
  if (!startDate && !endDate) {
    const end = now;
    const start = new Date(now);
    start.setMonth(start.getMonth() - 2);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { ok: true, startDate: fmt(start), endDate: fmt(end) };
  }

  // if only one provided -> error
  if (!startDate || !endDate) {
    return {
      ok: false,
      message:
        "Please provide both startDate and endDate, or leave both empty to use the default last 2 months range.",
    };
  }

  // validate format and order
  const s = parseDateISO(startDate);
  const e = parseDateISO(endDate);
  if (!s || !e) {
    return { ok: false, message: "Invalid date format. Use YYYY-MM-DD." };
  }
  if (s > e) {
    return { ok: false, message: "Start date cannot be after End date." };
  }

  const numDays = daysBetweenInclusive(startDate, endDate);
  if (numDays > MAX_RANGE_DAYS) {
    return {
      ok: false,
      message: `Requested range is too large: ${numDays} days. Maximum allowed range is ${MAX_RANGE_DAYS} days (≈ 2 months).`,
    };
  }

  return { ok: true, startDate, endDate };
}

/* ---------- Handlers (download + preview support) ---------- */

async function downloadLeavesReport(req, res, next) {
  console.log(
    "[reportHandler] downloadLeavesReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query);
    let { startDate, endDate, status, format, fields } = parsed;

    // enforce/default 2-month constraint
    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    const rows = await reportService.getLeaveRows(
      startDate,
      endDate,
      status,
      fields
    );

    // preview -> return JSON (no 404)
    if (isPreviewRequest(req)) {
      return sendPreviewResponse(req, res, rows);
    }

    if (!Array.isArray(rows)) {
      return res.status(500).json({ message: "Failed to fetch leave data" });
    }
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No leave data for selected date range" });
    }

    if (format === "pdf") {
      const buffer = await reportService.renderPdfBuffer("Leaves Report", rows);
      const filename = safeFilename("leaves_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } else if (format === "xlsx") {
      const headers = [
        { header: "Leave ID", key: "leave_id" },
        { header: "Employee ID", key: "employee_id" },
        { header: "Employee Name", key: "employee_name" },
        { header: "Department", key: "department_name" },
        { header: "Leave type", key: "leave_type" },
        { header: "Start Date", key: "start_date" },
        { header: "End Date", key: "end_date" },
        { header: "Status", key: "status" },
        { header: "Comments", key: "comments" },
        { header: "Reason", key: "reason" },
        { header: "Created at", key: "created_at" },
      ];
      const buf = await reportService.renderExcelBuffer(rows, headers);
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
    } else {
      return res.status(400).json({ message: "Invalid format" });
    }
  } catch (err) {
    console.error(
      "[reportHandler] Error rendering Leaves report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function downloadReimbursementsReport(req, res, next) {
  console.log(
    "[reportHandler] downloadReimbursementsReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query);
    let { startDate, endDate, status, format, fields } = parsed;

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    // For reimbursements, the backend query (GET_REIMBURSEMENT_REPORT) expects the
    // status param to match either r.status (approval) or r.payment_status (payment).
    // We already normalized status above; pass it through.
    const rows = await reportService.getReimbursementRows(
      startDate,
      endDate,
      status,
      fields
    );

    if (isPreviewRequest(req)) {
      return sendPreviewResponse(req, res, rows);
    }

    if (!Array.isArray(rows)) {
      return res
        .status(500)
        .json({ message: "Failed to fetch reimbursement data" });
    }
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No reimbursement data for selected date range" });
    }

    if (format === "pdf") {
      const buffer = await reportService.renderPdfBuffer(
        "Reimbursements Report",
        rows
      );
      const filename = safeFilename("reimbursements_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } else if (format === "xlsx") {
      const headers = [
        { header: "Reimbursement ID", key: "id" },
        { header: "Employee ID", key: "employee_id" },
        { header: "Employee Name", key: "employee_name" },
        { header: "Department", key: "department_name" },
        { header: "Title", key: "claim_title" },
        { header: "Description", key: "claim_type" },
        { header: "Date", key: "created_at" },
        { header: "Total Amount", key: "total_amount" },
        { header: "Approval Status", key: "approval_status" },
        { header: "Payment Status", key: "payment_status" },
      ];
      const buf = await reportService.renderExcelBuffer(rows, headers);
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
    } else {
      return res.status(400).json({ message: "Invalid format" });
    }
  } catch (err) {
    console.error(
      "[reportHandler] Error rendering Reimbursement report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

/* Employees / Vendors / Assets / Attendance handlers use same pattern */

async function downloadEmployeesReport(req, res, next) {
  console.log(
    "[reportHandler] downloadEmployeesReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query);
    let { startDate, endDate, status, format, fields } = parsed;

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    const rows = await reportService.getEmployeeRows(
      startDate,
      endDate,
      status,
      fields
    );

    if (isPreviewRequest(req)) {
      return sendPreviewResponse(req, res, rows);
    }

    if (!Array.isArray(rows))
      return res.status(500).json({ message: "Failed to fetch employee data" });
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "No employee data for selected date range" });

    if (format === "pdf") {
      const buffer = await reportService.renderPdfBuffer(
        "Employees Report",
        rows
      );
      const filename = safeFilename("employees_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } else if (format === "xlsx") {
      const headers = [
        { header: "Employee ID", key: "employee_id" },
        { header: "Name", key: "name" },
        { header: "First Name", key: "first_name" },
        { header: "Last Name", key: "last_name" },
        { header: "Email", key: "email" },
        { header: "Phone", key: "phone_number" },
        { header: "Status", key: "status" },
        { header: "Department", key: "department_name" },
        { header: "Role", key: "role" },
        { header: "Position", key: "position" },
        { header: "Joining Date", key: "joining_date" },
        { header: "Salary", key: "salary" },
        { header: "Bank Name", key: "bank_name" },
        { header: "Account Number", key: "account_number" },
        { header: "IFSC", key: "ifsc_code" },
        { header: "Bank Branch", key: "bank_branch" },
        { header: "Address", key: "address" },
        { header: "Father Name", key: "father_name" },
        { header: "Mother Name", key: "mother_name" },
        { header: "DOB", key: "dob" },
        { header: "Created At", key: "created_at" },
      ];
      const buf = await reportService.renderExcelBuffer(rows, headers);
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
    } else {
      return res.status(400).json({ message: "Invalid format" });
    }
  } catch (err) {
    console.error(
      "[reportHandler] Error rendering Employees report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function downloadVendorsReport(req, res, next) {
  console.log(
    "[reportHandler] downloadVendorsReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query);
    let { startDate, endDate, status, format, fields } = parsed;

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    const rows = await reportService.getVendorRows(
      startDate,
      endDate,
      status,
      fields
    );

    if (isPreviewRequest(req)) {
      return sendPreviewResponse(req, res, rows);
    }

    if (!Array.isArray(rows))
      return res.status(500).json({ message: "Failed to fetch vendor data" });
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "No vendor data for selected date range" });

    if (format === "pdf") {
      const buffer = await reportService.renderPdfBuffer(
        "Vendors Report",
        rows
      );
      const filename = safeFilename("vendors_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } else if (format === "xlsx") {
      const headers = [
        { header: "vendor_id", key: "vendor_id" },
        { header: "company_name", key: "company_name" },
        { header: "registered_address", key: "registered_address" },
        { header: "city", key: "city" },
        { header: "state", key: "state" },
        { header: "pin_code", key: "pin_code" },
        { header: "gst_number", key: "gst_number" },
        { header: "pan_number", key: "pan_number" },
        { header: "company_type", key: "company_type" },
        { header: "contact1_name", key: "contact1_name" },
        { header: "contact1_designation", key: "contact1_designation" },
        { header: "contact1_mobile", key: "contact1_mobile" },
        { header: "contact1_email", key: "contact1_email" },
        { header: "bank_name", key: "bank_name" },
        { header: "branch", key: "branch" },
        { header: "branch_address", key: "branch_address" },
        { header: "account_number", key: "account_number" },
        { header: "ifsc_code", key: "ifsc_code" },
        { header: "nature_of_business", key: "nature_of_business" },
        { header: "product_category", key: "product_category" },
        { header: "years_of_experience", key: "years_of_experience" },
        { header: "cancelled_cheque", key: "cancelled_cheque" },
        { header: "msme_status", key: "msme_status" },
        { header: "created_at", key: "created_at" },
      ];

      const buf = await reportService.renderExcelBuffer(rows, headers);
      const filename = safeFilename("vendors_report", "xlsx");
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
    } else {
      return res.status(400).json({ message: "Invalid format" });
    }
  } catch (err) {
    console.error(
      "[reportHandler] Error rendering Vendors report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function downloadAssetsReport(req, res, next) {
  console.log(
    "[reportHandler] downloadAssetsReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query);
    let { startDate, endDate, status, format, fields } = parsed;

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    const rows = await reportService.getAssetRows(
      startDate,
      endDate,
      status,
      fields
    );

    if (isPreviewRequest(req)) {
      return sendPreviewResponse(req, res, rows);
    }

    if (!Array.isArray(rows))
      return res.status(500).json({ message: "Failed to fetch asset data" });
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "No asset data for selected date range" });

    if (format === "pdf") {
      const buffer = await reportService.renderPdfBuffer("Assets Report", rows);
      const filename = safeFilename("assets_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } else if (format === "xlsx") {
      const headers = [
        { header: "asset_id", key: "asset_id" },
        { header: "asset_code", key: "asset_code" },
        { header: "asset_name", key: "asset_name" },
        { header: "configuration", key: "configuration" },
        { header: "category", key: "category" },
        { header: "sub_category", key: "sub_category" },
        { header: "assigned_to", key: "assigned_to" },
        { header: "document_path", key: "document_path" },
        { header: "valuation_date", key: "valuation_date" },
        { header: "status", key: "status" },
        { header: "count", key: "count" },
        { header: "created_at", key: "created_at" },
      ];

      const buf = await reportService.renderExcelBuffer(rows, headers);
      const filename = safeFilename("assets_report", "xlsx");
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
    } else {
      return res.status(400).json({ message: "Invalid format" });
    }
  } catch (err) {
    console.error(
      "[reportHandler] Error rendering Assets report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function downloadAttendanceReport(req, res, next) {
  console.log(
    "[reportHandler] downloadAttendanceReport called - query:",
    req.query
  );
  try {
    const parsed = parseDates(req.query);
    let { startDate, endDate, status, format, fields } = parsed;

    const ensured = ensureTwoMonthWindow(startDate, endDate);
    if (!ensured.ok) return res.status(400).json({ message: ensured.message });
    startDate = ensured.startDate;
    endDate = ensured.endDate;

    const rows = await reportService.getAttendanceRows(
      startDate,
      endDate,
      status,
      fields
    );

    if (isPreviewRequest(req)) {
      return sendPreviewResponse(req, res, rows);
    }

    if (!Array.isArray(rows))
      return res
        .status(500)
        .json({ message: "Failed to fetch attendance data" });
    if (rows.length === 0)
      return res
        .status(404)
        .json({ message: "No attendance data for selected date range" });

    if (format === "pdf") {
      const buffer = await reportService.renderPdfBuffer(
        "Attendance Report",
        rows
      );
      const filename = safeFilename("attendance_report", "pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    } else if (format === "xlsx") {
      const headers = [
        { header: "Punch ID", key: "punch_id" },
        { header: "Employee ID", key: "employee_id" },
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
    } else {
      return res.status(400).json({ message: "Invalid format" });
    }
  } catch (err) {
    console.error(
      "[reportHandler] Error rendering Attendance report:",
      err && (err.stack || err)
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = {
  downloadLeavesReport,
  downloadReimbursementsReport,
  downloadEmployeesReport,
  downloadVendorsReport,
  downloadAssetsReport,
  downloadAttendanceReport,
};