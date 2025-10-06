// src/services/reportService.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require("util");
const child_process = require("child_process");
const execFile = util.promisify(child_process.execFile);
const spawnSync = child_process.spawnSync;

const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit"); // small fallback (kept)
const db = require("../config"); // expects db exported with .query(...)
/* eslint-disable no-console */
const queries = require("../constants/reportQueries");

/* ---------- Helpers ---------- */
// Treat "", "all", "null", "undefined" (any case) as no-filter (null)
function normalizeStatusForQuery(status) {
  if (status === undefined || status === null) return null;
  if (typeof status !== "string") return status;
  const s = status.trim();
  if (s === "") return null;
  const low = s.toLowerCase();
  if (low === "all" || low === "null" || low === "undefined") return null;
  return s;
}

// Replaces old buildDateStatusParams — returns params in the order your queries expect:
// [start, start, end, end, status, status, ...]
// Note: number of repeated status placeholders must match query's placeholders.
function buildDateStatusParams(startDate, endDate, status) {
  const s = startDate || null;
  const e = endDate || null;
  const st = normalizeStatusForQuery(status);
  // Generic 6-status repetition used by many queries — but reimbursement needs more.
  return [s, s, e, e, st, st];
}

/* ---------- DB helpers ---------- */
async function fetchRows(sql, params = []) {
  if (!db || typeof db.query !== "function") {
    throw new Error(
      "DB not available. Check ../config or ../config/db export."
    );
  }
  const [rows] = await db.query(sql, params);
  return rows;
}

/* ---------- Utility: filter rows to requested fields in desired order ---------- */
function keepOnlyFields(rows, requestedFields, defaultOrder) {
  if (!Array.isArray(rows)) return [];

  if (!requestedFields || requestedFields.length === 0) {
    return rows.map((r) => ({ ...r }));
  }

  const fieldsToReturn = [];
  const seen = new Set();
  for (const f of requestedFields) {
    const k = String(f || "").trim();
    if (!k) continue;
    if (!seen.has(k)) {
      fieldsToReturn.push(k);
      seen.add(k);
    }
  }

  const finalFields =
    fieldsToReturn.length > 0
      ? fieldsToReturn
      : defaultOrder || Object.keys(rows[0] || {});

  return rows.map((r) => {
    const obj = {};
    for (const f of finalFields) {
      if (Object.prototype.hasOwnProperty.call(r, f)) {
        obj[f] = r[f];
      } else {
        const lower = f.toLowerCase();
        const foundKey = Object.keys(r).find(
          (k) => String(k).toLowerCase() === lower
        );
        if (foundKey) obj[f] = r[foundKey];
        else obj[f] = "";
      }
    }
    return obj;
  });
}

/* ---------- Field normalization helpers for reimbursements ---------- */
function normalizeReimbursementRow(raw) {
  const r = Object.assign({}, raw);

  // approval_status: SQL already returns r.status AS approval_status; fall back to r.status if missing
  if (!Object.prototype.hasOwnProperty.call(r, "approval_status")) {
    r.approval_status =
      r.status !== undefined &&
      r.status !== null &&
      String(r.status).trim() !== ""
        ? r.status
        : "";
  }

  // payment_status
  if (
    !Object.prototype.hasOwnProperty.call(r, "payment_status") ||
    r.payment_status === null ||
    r.payment_status === undefined
  ) {
    if (
      Object.prototype.hasOwnProperty.call(r, "raw_payment_status") &&
      r.raw_payment_status !== null &&
      String(r.raw_payment_status).trim() !== ""
    ) {
      r.payment_status = r.raw_payment_status;
    } else {
      r.payment_status = r.approval_status || "";
    }
  }

  // id fallback
  if (
    !Object.prototype.hasOwnProperty.call(r, "id") &&
    Object.prototype.hasOwnProperty.call(r, "reimbursement_id")
  ) {
    r.id = r.reimbursement_id;
  }

  // employee_name fallback
  if (
    !Object.prototype.hasOwnProperty.call(r, "employee_name") &&
    (r.first_name || r.last_name)
  ) {
    r.employee_name = `${r.first_name || ""} ${r.last_name || ""}`.trim();
  }

  return r;
}

/* ---------- Public DB fetchers (use queries from constants and post-filter) ---------- */

async function getLeaveRows(startDate, endDate, status, fields) {
  const sql = queries.GET_LEAVE_REPORT;
  const params = buildDateStatusParams(startDate, endDate, status);

  let rows;
  try {
    rows = await fetchRows(sql, params);
  } catch (err) {
    console.error("[reportService] getLeaveRows SQL error:", err);
    throw err;
  }

  const defaultOrder = [
    "leave_id",
    "id",
    "employee_id",
    "employee_name",
    "department_name",
    "leave_type",
    "H_F_day",
    "start_date",
    "end_date",
    "status",
    "reason",
    "comments",
    "is_defaulted",
    "created_at",
  ];

  return keepOnlyFields(rows, fields, defaultOrder);
}

/**
 * getReimbursementRows
 */
async function getReimbursementRows(startDate, endDate, status, fields) {
  const sql = queries.GET_REIMBURSEMENT_REPORT;

  const s = startDate || null;
  const e = endDate || null;
  const st =
    status && String(status).trim().toLowerCase() !== "all" ? status : null;

  // NOTE: GET_REIMBURSEMENT_REPORT uses 7 status placeholders (plus 4 date placeholders).
  // Provide the status parameter repeated 7 times (or nulls) so placeholders align.
  const params = [s, s, e, e, st, st, st, st, st, st, st];

  let rawRows;
  try {
    rawRows = await fetchRows(sql, params);
  } catch (err) {
    console.error(
      "[reportService] getReimbursementRows SQL error:",
      err && (err.stack || err.message || err)
    );
    throw err;
  }

  const normalized = (Array.isArray(rawRows) ? rawRows : []).map((r) =>
    normalizeReimbursementRow(r)
  );

  const defaultOrder = [
    "id",
    "employee_id",
    "employee_name",
    "department_name",
    "claim_title",
    "claim_type",
    "date_range",
    "total_amount",
    "payment_status",
    "approval_status",
    "created_at",
  ];

  return keepOnlyFields(normalized, fields, defaultOrder);
}

async function getAttendanceRows(startDate, endDate, status, fields) {
  const sql = queries.GET_EMPLOYEE_ATTENDANCE_REPORT;
  const params = buildDateStatusParams(startDate, endDate, status);

  let rows;
  try {
    rows = await fetchRows(sql, params);
  } catch (err) {
    console.error("[reportService] getAttendanceRows SQL error:", err);
    throw err;
  }

  const defaultOrder = [
    "punch_id",
    "employee_id",
    "punch_status",
    "punchin_time",
    "punchin_device",
    "punchin_location",
    "punchout_time",
    "punchout_device",
    "punchout_location",
    "punchmode",
    "created_at",
  ];

  return keepOnlyFields(rows, fields, defaultOrder);
}

async function getEmployeeRows(startDate, endDate, status, fields) {
  const sql = queries.GET_EMPLOYEE_REPORT;
  const params = buildDateStatusParams(startDate, endDate, status);

  let rows;
  try {
    rows = await fetchRows(sql, params);
  } catch (err) {
    console.error("[reportService] getEmployeeRows SQL error:", err);
    throw err;
  }

  const defaultOrder = [
    "employee_id",
    "name",
    "first_name",
    "last_name",
    "email",
    "phone_number",
    "status",
    "address",
    "father_name",
    "mother_name",
    "gender",
    "marital_status",
    "dob",
    "spouse_dob",
    "aadhaar_number",
    "pan_number",
    "photo_url",
    "domain",
    "employee_type",
    "joining_date",
    "role",
    "position",
    "department_id",
    "department_name",
    "supervisor_id",
    "supervisor_name",
    "salary",
    "bank_name",
    "account_number",
    "ifsc_code",
    "bank_branch",
    "created_at",
  ];

  return keepOnlyFields(rows, fields, defaultOrder);
}

async function getVendorRows(startDate, endDate, status, fields) {
  const sql = queries.GET_VENDOR_REPORT;
  const params = buildDateStatusParams(startDate, endDate, status);

  let rows;
  try {
    rows = await fetchRows(sql, params);
  } catch (err) {
    console.error("[reportService] getVendorRows SQL error:", err);
    throw err;
  }

  const defaultOrder = [
    "vendor_id",
    "company_name",
    "registered_address",
    "city",
    "state",
    "pin_code",
    "gst_number",
    "pan_number",
    "company_type",
    "contact1_mobile",
    "contact1_email",
    "bank_name",
    "branch",
    "account_number",
    "product_category",
    "years_of_experience",
    "created_at",
  ];

  return keepOnlyFields(rows, fields, defaultOrder);
}

async function getAssetRows(startDate, endDate, status, fields) {
  const sql = queries.GET_ASSET_REPORT;

  const s = startDate || null;
  const e = endDate || null;
  // normalize: treat 'all', '', null, undefined as no-filter (null)
  const st =
    status && String(status).trim().toLowerCase() !== "all" ? status : null;

  // Provide status repeated 7 times to match the 7 status placeholders in SQL
  const params = [s, s, e, e, st, st, st, st, st, st, st];

  let rows;
  try {
    rows = await fetchRows(sql, params);
  } catch (err) {
    console.error("[reportService] getAssetRows SQL error:", err);
    throw err;
  }

  const defaultOrder = [
    "asset_id",
    "asset_code",
    "asset_name",
    "configuration",
    "category",
    "sub_category",
    "assigned_to",
    "document_path",
    "valuation_date",
    "status",
    "count",
    "created_at",
  ];

  return keepOnlyFields(rows, fields, defaultOrder);
}

/* ---------- Excel (XLSX) builder ---------- */
/**
 * Helper: remove columns whose every cell is empty ("", null, undefined)
 * Returns {columns, keptIndexes} where columns is array of {header,key,width}
 */
function pruneEmptyColumnsFromData(rows, columns) {
  // columns: array of {header, key}
  if (!Array.isArray(columns) || columns.length === 0)
    return { columns: [], keptIndexes: [] };
  const kept = [];
  const keptIdx = [];
  for (let i = 0; i < columns.length; i++) {
    const key = columns[i].key;
    let hasNonEmpty = false;
    for (let r = 0; r < rows.length; r++) {
      const val = rows[r][key];
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        hasNonEmpty = true;
        break;
      }
    }
    if (hasNonEmpty) {
      kept.push(columns[i]);
      keptIdx.push(i);
    }
  }
  return { columns: kept, keptIndexes: keptIdx };
}

/**
 * Heuristic auto-width (Excel character width units).
 * clamps width between minWidth and maxWidth.
 */
function computeAutoWidthForColumn(rows, key, header) {
  const minWidth = 5;
  const maxWidth = 80; // avoid absurdly large widths
  let maxLen = String(header || "").length;
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i][key];
    if (v === null || v === undefined) continue;
    const s = String(v);
    if (s.length > maxLen) maxLen = s.length;
  }
  // convert char count to Excel approx width: small adjustment factor
  const width = Math.ceil(Math.min(maxWidth, Math.max(minWidth, maxLen * 1.1)));
  return width;
}

async function renderExcelBuffer(rows, headers) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  // Normalize rows
  const safeRows = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];

  // If headers provided (handler-specific), convert to uniform objects
  let cols;
  if (Array.isArray(headers) && headers.length > 0) {
    cols = headers.map((h) => {
      if (typeof h === "string") return { header: h, key: h, width: 20 };
      return {
        header: h.header || h.key || h,
        key: h.key || h.header || h,
        width: h.width || 20,
      };
    });
  } else if (safeRows.length > 0) {
    cols = Object.keys(safeRows[0]).map((k) => ({
      header: k,
      key: k,
      width: 20,
    }));
  } else {
    cols = [{ header: "Message", key: "message", width: 50 }];
    safeRows.push({ message: "No data available for selected range" });
  }

  // Remove columns that are entirely empty (this addresses your empty column issue)
  const pruned = pruneEmptyColumnsFromData(safeRows, cols);
  const finalCols = pruned.columns.length > 0 ? pruned.columns : cols; // if all pruned, keep original to show headed message

  // Compute auto widths
  finalCols.forEach((c) => {
    c.width = computeAutoWidthForColumn(safeRows, c.key, c.header);
  });

  sheet.columns = finalCols.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  // Add rows ensuring keys match sheet columns order (ExcelJS will ignore unknown keys)
  for (const r of safeRows) {
    const rowObj = {};
    for (const c of finalCols) {
      rowObj[c.key] = Object.prototype.hasOwnProperty.call(r, c.key)
        ? r[c.key]
        : "";
    }
    sheet.addRow(rowObj);
  }

  // Optional: freeze header row
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/* ---------- HTML -> PDF helpers (layout & purpose column boost) ---------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Compute equal column widths (keeps layout stable for printing).
 * Slight tweak: if there are many columns, produce smaller percentages so table fits.
 */
function computeColumnPercents(rows) {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return [];

  const count = headers.length;
  // When very many columns, cap per-column percent small to avoid overflow in some renderers
  const base = Math.max(6, Math.round((100 / count) * 10) / 10);
  const percents = headers.map(() => base);
  // normalize sum to 100
  const sum = percents.reduce((s, v) => s + v, 0);
  const diff = Math.round((100 - sum) * 10) / 10;
  if (Math.abs(diff) >= 0.1) {
    percents[0] = Math.round((percents[0] + diff) * 10) / 10;
  }
  return percents;
}

function rowsToHtml(title, rows) {
  const headerCols = rows && rows.length ? Object.keys(rows[0]) : [];
  const colCount = headerCols.length || 0;
  const colPercents = computeColumnPercents(rows);

  // Modes
  const smallTableMode = colCount > 0 && colCount <= 3;
  const treatAsSmall = colCount === 0 ? true : smallTableMode;

  // ---------- FONT SIZES (edit these values) ----------
  // Title above the table (the yellow-marked text in your screenshot)
  const titleFontSizePx = 22; // change this to e.g. 20, 24, 26 etc.

  // Table header (<th>) font size
  const thFontSizePx = 10; // change this independently

  // Table data (<td>) font size
  const tdFontSizePx = 10; // change this independently
  // ----------------------------------------------------

  // Border and spacing
  const cellBorderPx = 1;
  const smallMode = colCount >= 8;
  const cellPadding = smallMode ? "2px" : "4px";
  const tableFont = "Arial, Helvetica, sans-serif";

  // Build colgroup
  const colgroup = headerCols
    .map((h, i) => {
      if (treatAsSmall) return `<col>`;
      const pct = colPercents[i] != null ? `${colPercents[i]}%` : null;
      return pct ? `<col style="width:${pct}">` : `<col>`;
    })
    .join("");

  // Inline styles for th and td (inline is most reliable for conversion)
  const thInlineBase = [
    `border:${cellBorderPx}px solid #000`,
    `padding:${cellPadding}`,
    `font-size:${thFontSizePx}px`,
    `vertical-align:top`,
    `background:#f6f8fa`,
    `-webkit-print-color-adjust:exact`,
    `text-align:${treatAsSmall ? "center" : "left"}`,
  ].join("; ");

  const tdInlineBase = [
    `border:${cellBorderPx}px solid #000`,
    `padding:${cellPadding}`,
    `font-size:${tdFontSizePx}px`,
    `vertical-align:top`,
    `text-align:${treatAsSmall ? "center" : "left"}`,
    `word-break:break-word`,
  ].join("; ");

  // Build table head and body using inline styles
  const head = headerCols
    .map((h) => `<th style="${thInlineBase}">${escapeHtml(h)}</th>`)
    .join("");

  const body =
    rows && rows.length
      ? rows
          .map(
            (r) =>
              `<tr>${headerCols
                .map((c) => {
                  const cell = r[c] == null ? "" : String(r[c]);
                  return `<td style="${tdInlineBase}">${escapeHtml(cell)}</td>`;
                })
                .join("")}</tr>`
          )
          .join("")
      : `<tr><td colspan="${
          headerCols.length || 1
        }" style="${tdInlineBase}; text-align:center">No data available</td></tr>`;

  // Table inline style (auto-size for small tables; full width for others)
  const tableInlineStyle = treatAsSmall
    ? `border:${cellBorderPx}px solid #000; border-collapse:collapse; margin:0 auto; table-layout:auto;`
    : `border:${cellBorderPx}px solid #000; border-collapse:collapse; width:100%; table-layout:fixed;`;

  // Minimal CSS – headers repeat, no global font sizing to avoid impacting title
  const css = `
    @page { size: A4 ${
      colCount >= 6 ? "landscape" : "portrait"
    }; margin: 12mm; }
    html, body { height: 100%; margin: 0; padding: 0; }
    body { font-family: ${tableFont}; color:#111; margin:0; padding:0; -webkit-print-color-adjust: exact; }
    .wrap { box-sizing: border-box; width: 100%; padding: 6px; margin: 0; overflow: visible; }
    .meta { margin-bottom:8px; font-size:9px; color:#444; text-align: ${
      treatAsSmall ? "center" : "left"
    }; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
  `;

  // Inline style for the H2 title (separate and independent)
  const h2Inline = `font-size:${titleFontSizePx}px; font-weight:700; margin:0 0 10px 0; text-align:${
    treatAsSmall ? "center" : "left"
  }`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${css}</style>
  </head>
  <body>
    <div class="wrap">
      <h2 style="${h2Inline}">${escapeHtml(title)}</h2>
      <div class="meta">Auto Generated: ${new Date().toISOString()}</div>
      <table style="${tableInlineStyle}">
        <colgroup>${colgroup}</colgroup>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </body>
</html>`;
}

/* ---------- Find LibreOffice binary ---------- */
function findLibreOfficeBinary() {
  const candidates = [];
  if (process.env.LIBREOFFICE_PATH)
    candidates.push(process.env.LIBREOFFICE_PATH);
  candidates.push("soffice", "libreoffice", "soffice.exe", "libreoffice.exe");

  for (const bin of candidates) {
    if (!bin) continue;
    try {
      // spawnSync --version is portable; suppress output
      const res = spawnSync(bin, ["--version"], { stdio: "ignore" });
      if (res && typeof res.status === "number" && res.status === 0) {
        return bin;
      }
    } catch (e) {
      // ignore
    }
  }

  // fallback: attempt which / where
  try {
    const which = spawnSync("which", ["soffice"], { encoding: "utf8" });
    if (which && which.status === 0 && which.stdout) {
      const p = which.stdout.trim().split("\n")[0];
      if (p) return p;
    }
  } catch (e) {}

  return null;
}

/* ---------- Convert HTML -> PDF using LibreOffice CLI ---------- */
async function renderPdfBuffer(title, rows) {
  const html = rowsToHtml(title, rows);
  console.log(
    "[reportService] renderPdfBuffer html length:",
    html ? html.length : 0
  );

  if (!html || html.length === 0) {
    throw new Error("Empty HTML passed to PDF generator");
  }

  // create temporary directory & files
  const tmpBase = await fs.promises.mkdtemp(path.join(os.tmpdir(), "report-"));
  const htmlFilename = `report_${Date.now()}.html`;
  const htmlPath = path.join(tmpBase, htmlFilename);

  try {
    await fs.promises.writeFile(htmlPath, html, "utf8");
  } catch (writeErr) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw writeErr;
  }

  // find libreoffice
  const soffice = findLibreOfficeBinary();
  if (!soffice) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw new Error(
      "LibreOffice binary not found. Install LibreOffice and ensure 'soffice' is in PATH or set LIBREOFFICE_PATH env var."
    );
  }

  // Conversion args
  const args = [
    "--headless",
    "--convert-to",
    "pdf:writer_pdf_Export",
    htmlPath,
    "--outdir",
    tmpBase,
  ];

  const timeoutMs = 30000;
  try {
    await execFile(soffice, args, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (convErr) {
    console.error(
      "[reportService] LibreOffice conversion error:",
      convErr && (convErr.message || convErr)
    );
    try {
      const debugFiles = await fs.promises.readdir(tmpBase);
      console.error("[reportService] debug files in tmp:", debugFiles);
    } catch (e) {}
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw new Error(
      `LibreOffice conversion failed: ${
        convErr && convErr.message ? convErr.message : String(convErr)
      }`
    );
  }

  // expected generated PDF path
  const pdfBasename =
    path.basename(htmlFilename, path.extname(htmlFilename)) + ".pdf";
  const pdfPath = path.join(tmpBase, pdfBasename);

  // Wait for the file to exist (small loop)
  let pdfBuf;
  const maxWait = 5000;
  const step = 200;
  let waited = 0;
  while (waited < maxWait) {
    if (fs.existsSync(pdfPath)) break;
    // sleep step
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, step));
    waited += step;
  }

  try {
    pdfBuf = await fs.promises.readFile(pdfPath);
  } catch (readErr) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw new Error(
      "PDF conversion seemed to succeed but output file couldn't be read: " +
        (readErr && readErr.message)
    );
  }

  // cleanup temporary files
  try {
    await fs.promises.rm(tmpBase, { recursive: true, force: true });
  } catch (e) {
    console.warn("[reportService] failed to cleanup tmp dir:", e && e.message);
  }

  if (!Buffer.isBuffer(pdfBuf) || pdfBuf.length === 0) {
    throw new Error("LibreOffice produced empty PDF buffer");
  }

  return pdfBuf;
}

/* ---------- XLSX -> PDF wrapper (prefer this for very wide tables) ---------- */
/**
 * renderExcelToPdfBuffer(rows, headers)
 * - Generate .xlsx (via renderExcelBuffer)
 * - Convert .xlsx -> .pdf using LibreOffice (soffice)
 * - Return PDF Buffer
 */
async function renderExcelToPdfBuffer(rows, headers) {
  // 1) create xlsx buffer using existing helper
  const xlsxBuffer = await renderExcelBuffer(rows, headers);

  // 2) create temp dir and write xlsx file
  const tmpBase = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "report-xlsx-")
  );
  const xlsxFilename = `report_${Date.now()}.xlsx`;
  const xlsxPath = path.join(tmpBase, xlsxFilename);
  await fs.promises.writeFile(xlsxPath, xlsxBuffer);

  // 3) find LibreOffice binary
  const soffice = findLibreOfficeBinary();
  if (!soffice) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw new Error(
      "LibreOffice binary not found. Install LibreOffice and ensure 'soffice' is in PATH or set LIBREOFFICE_PATH."
    );
  }

  // 4) exec conversion
  const args = [
    "--headless",
    "--convert-to",
    "pdf:writer_pdf_Export",
    xlsxPath,
    "--outdir",
    tmpBase,
  ];
  const timeoutMs = 30000;
  try {
    await execFile(soffice, args, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (convErr) {
    try {
      const debugFiles = await fs.promises.readdir(tmpBase);
      console.error(
        "[reportService] LibreOffice conversion error, tmp files:",
        debugFiles
      );
    } catch (e) {}
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw new Error(
      "LibreOffice conversion failed: " +
        (convErr && convErr.message ? convErr.message : String(convErr))
    );
  }

  // 5) read resulting pdf
  const pdfPath = path.join(
    tmpBase,
    path.basename(xlsxPath, path.extname(xlsxPath)) + ".pdf"
  );
  const maxWait = 5000;
  const step = 200;
  let waited = 0;
  while (waited < maxWait && !fs.existsSync(pdfPath)) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, step));
    waited += step;
  }

  let pdfBuf;
  try {
    pdfBuf = await fs.promises.readFile(pdfPath);
  } catch (readErr) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw new Error(
      "Converted PDF missing or unreadable: " +
        (readErr && readErr.message ? readErr.message : String(readErr))
    );
  }

  // 6) cleanup temp files
  try {
    await fs.promises.rm(tmpBase, { recursive: true, force: true });
  } catch (e) {
    console.warn("[reportService] failed to cleanup tmp dir:", e && e.message);
  }

  if (!Buffer.isBuffer(pdfBuf) || pdfBuf.length === 0) {
    throw new Error("LibreOffice conversion produced empty PDF");
  }

  return pdfBuf;
}

/* ---------- PNG -> PDF fallback using pdfkit ---------- */
function createPdfFromPng(pngPath) {
  return new Promise((resolve, reject) => {
    try {
      const tmpOut = pngPath.replace(/\.png$/i, `.fallback.pdf`);
      const stream = fs.createWriteStream(tmpOut);
      stream.on("error", (err) => reject(err));
      stream.on("finish", () => {
        try {
          const pdfBuf = fs.readFileSync(tmpOut);
          try {
            fs.unlinkSync(tmpOut);
          } catch (e) {}
          resolve(pdfBuf);
        } catch (e) {
          reject(e);
        }
      });

      const doc = new PDFDocument({ size: "A4", margin: 20 });
      doc.pipe(stream);
      const imgBuffer = fs.readFileSync(pngPath);
      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const pageHeight =
        doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
      doc.image(imgBuffer, {
        fit: [pageWidth, pageHeight],
        align: "center",
        valign: "center",
      });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/* ---------- exports ---------- */
module.exports = {
  normalizeStatusForQuery,
  buildDateStatusParams,
  getLeaveRows,
  getReimbursementRows,
  getEmployeeRows,
  getVendorRows,
  getAssetRows,
  renderExcelBuffer,
  getAttendanceRows,
  renderPdfBuffer,
  renderExcelToPdfBuffer,
};