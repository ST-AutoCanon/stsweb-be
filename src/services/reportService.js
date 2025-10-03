// src/services/reportService.js
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const puppeteer = require("puppeteer");
const PDFDocument = require("pdfkit");
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
// [start, start, end, end, status, status]
function buildDateStatusParams(startDate, endDate, status) {
  const s = startDate || null;
  const e = endDate || null;
  const st = normalizeStatusForQuery(status);
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

  // payment_status: your SQL returns COALESCE(NULLIF(r.payment_status, ''), NULLIF(r.status, '')) AS payment_status
  // keep raw_payment_status (the original r.payment_status) available, but ensure unified column exists
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

  // Make sure `id` is present
  if (
    !Object.prototype.hasOwnProperty.call(r, "id") &&
    Object.prototype.hasOwnProperty.call(r, "reimbursement_id")
  ) {
    r.id = r.reimbursement_id;
  }

  // Make sure employee_name exists
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
 * getReimbursementRows:
 * Matches your provided GET_REIMBURSEMENT_REPORT SQL which expects 9 placeholders in order:
 *  [startDate, startDate, endDate, endDate, status, status, status, status, status]
 *
 * The SQL implements:
 *  - date filter based on COALESCE(approved_date, created_at)
 *  - a compound status filter that supports: paid / unpaid / pending|approved|rejected
 */
async function getReimbursementRows(startDate, endDate, status, fields) {
  const sql = queries.GET_REIMBURSEMENT_REPORT;

  const s = startDate || null;
  const e = endDate || null;
  // If the frontend sends "All" we should disable status filter by passing null
  const st =
    status && String(status).trim().toLowerCase() !== "all" ? status : null;

  // Build params to match the 9 placeholders in your SQL
  // order: start, start, end, end, st, st, st, st, st
  const params = [s, s, e, e, st, st, st, st, st];

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
    "attachments",
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
    "vendor_name",
    "contact_person",
    "phone",
    "email",
    "city",
    "gst_number",
    "pan_number",
    "status",
    "created_at",
  ];

  return keepOnlyFields(rows, fields, defaultOrder);
}

async function getAssetRows(startDate, endDate, status, fields) {
  const sql = queries.GET_ASSET_REPORT;
  const params = buildDateStatusParams(startDate, endDate, status);

  let rows;
  try {
    rows = await fetchRows(sql, params);
  } catch (err) {
    console.error("[reportService] getAssetRows SQL error:", err);
    throw err;
  }

  const defaultOrder = [
    "asset_id",
    "asset_tag",
    "asset_name",
    "category",
    "sub_category",
    "assigned_to_employee_id",
    "assigned_to_name",
    "location",
    "purchase_date",
    "value",
    "status",
    "created_at",
  ];

  return keepOnlyFields(rows, fields, defaultOrder);
}

/* ---------- Excel (XLSX) builder ---------- */
async function renderExcelBuffer(rows, headers) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  if (Array.isArray(headers) && headers.length > 0) {
    sheet.columns = headers.map((h) => ({
      header: h.header || h,
      key: h.key || h.header || h,
      width: h.width || 20,
    }));
    rows.forEach((r) => sheet.addRow(r));
  } else if (rows.length > 0) {
    const cols = Object.keys(rows[0]).map((k) => ({
      header: k,
      key: k,
      width: 20,
    }));
    sheet.columns = cols;
    rows.forEach((r) => sheet.addRow(r));
  } else {
    sheet.columns = [{ header: "Message", key: "message", width: 50 }];
    sheet.addRow({ message: "No data available for selected range" });
  }

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
 */
function computeColumnPercents(rows) {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return [];

  const equal = Math.round((100 / headers.length) * 10) / 10;
  const percents = headers.map(() => equal);

  const sum = percents.reduce((s, v) => s + v, 0);
  const diff = Math.round((100 - sum) * 10) / 10;
  if (Math.abs(diff) >= 0.1) {
    percents[0] = Math.round((percents[0] + diff) * 10) / 10;
  }
  return percents;
}

/**
 * rowsToHtml: print-friendly HTML with colgroup to stabilize widths
 */
function rowsToHtml(title, rows) {
  const headerCols = rows && rows.length ? Object.keys(rows[0]) : [];
  const colPercents = computeColumnPercents(rows);

  const colgroup = headerCols
    .map((h, i) => {
      const pct = colPercents[i] != null ? `${colPercents[i]}%` : null;
      return pct ? `<col style="width:${pct}">` : `<col>`;
    })
    .join("");

  const head = headerCols.map((h) => `<th>${escapeHtml(h)}</th>`).join("");

  const body =
    rows && rows.length
      ? rows
          .map(
            (r) =>
              `<tr>${headerCols
                .map((c) => {
                  const cell = r[c] == null ? "" : String(r[c]);
                  return `<td>${escapeHtml(cell)}</td>`;
                })
                .join("")}</tr>`
          )
          .join("")
      : `<tr><td colspan="${
          headerCols.length || 1
        }" style="text-align:center;padding:12px">No data available</td></tr>`;

  const css = `
    @page { size: A4; margin: 10mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size:10px; color:#111; margin:0; padding:0; }
    .wrap { padding:8px; box-sizing:border-box; width:100%; }
    h2 { margin:0 0 6px 0; font-size:12px; }
    .meta { margin-bottom:6px; font-size:10px; color:#444; }
    table { border-collapse: collapse; width:100%; table-layout: fixed; font-size:10px; }
    col { vertical-align: top; }
    thead th { background:#f6f8fa; padding:6px; text-align:left; vertical-align:top; font-weight:600; font-size:10px; }
    th, td { border:1px solid #ddd; padding:6px 6px; vertical-align:top; word-break:break-word; overflow-wrap:break-word; white-space:normal; }
    td { font-size:10px; }
    tr { page-break-inside: avoid; }
    @media print {
      thead th, td { padding:4px 6px; font-size:9px; }
      h2 { font-size:11px; }
    }
  `;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${css}</style>
  </head>
  <body>
    <div class="wrap">
      <h2>${escapeHtml(title)}</h2>
      <div class="meta">Generated: ${new Date().toISOString()}</div>
      <table>
        <colgroup>${colgroup}</colgroup>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </body>
</html>`;
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

/* ---------- PDF renderer using puppeteer (robust) ---------- */
async function renderPdfBuffer(title, rows) {
  const html = rowsToHtml(title, rows);
  console.log(
    "[reportService] renderPdfBuffer html length:",
    html ? html.length : 0
  );

  if (!html || html.length === 0) {
    throw new Error("Empty HTML passed to Puppeteer");
  }

  const cols = rows && rows.length ? Object.keys(rows[0]).length : 0;
  const useLandscape = cols >= 6;
  const viewportWidth = useLandscape ? 1200 : 1000;
  const viewportHeight = 900;

  const maxRetries = 2;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    let browser;
    let page;
    try {
      const launchOpts = {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-background-networking",
        ],
        headless: process.env.PUPPETEER_HEADLESS || "new",
        defaultViewport: { width: viewportWidth, height: viewportHeight },
        dumpio: !!process.env.DEBUG_PUPPETEER_DUMPIO,
      };

      if (process.env.CHROME_PATH)
        launchOpts.executablePath = process.env.CHROME_PATH;
      if (process.env.PUPPETEER_EXEC_PATH)
        launchOpts.executablePath = process.env.PUPPETEER_EXEC_PATH;

      browser = await puppeteer.launch(launchOpts);

      try {
        console.log(
          "[reportService] Puppeteer browser version:",
          await browser.version()
        );
      } catch (vErr) {
        console.warn(
          "[reportService] browser.version() failed:",
          vErr && vErr.message
        );
      }

      page = await browser.newPage();

      page.on("console", (msg) => {
        try {
          console.log(
            `[reportService][page.console] ${msg.type()}: ${msg.text()}`
          );
        } catch (e) {}
      });
      page.on("pageerror", (err) => {
        console.error(
          "[reportService][pageerror]",
          err && (err.stack || err.message || err)
        );
      });
      page.on("error", (err) => {
        console.error(
          "[reportService][page error event]",
          err && (err.stack || err.message || err)
        );
      });

      try {
        await page.emulateMediaType("screen");
      } catch (e) {}

      await page.setViewport({ width: viewportWidth, height: viewportHeight });
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      try {
        await page.waitForSelector("table", { timeout: 7000 });
      } catch (selErr) {
        console.warn(
          "[reportService] table selector not found/timed out:",
          selErr.message
        );
      }

      try {
        const ready = await page
          .evaluate(() => document.readyState)
          .catch(() => "evaluate-failed");
        console.log("[reportService] document.readyState:", ready);
      } catch (e) {
        console.warn(
          "[reportService] evaluate readyState failed:",
          e && e.message
        );
      }

      const pdfPromise = page.pdf({
        format: "A4",
        landscape: useLandscape,
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "8mm", right: "8mm" },
        preferCSSPageSize: true,
        scale: 1.0,
      });

      const timeoutMs = 45000;
      const buffer = await Promise.race([
        pdfPromise,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("pdf-generation-timeout")), timeoutMs)
        ),
      ]);

      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new Error("Puppeteer returned empty PDF buffer");
      }

      try {
        if (browser) await browser.close();
      } catch (e) {
        console.warn(
          "[reportService] Error closing browser after success:",
          e && e.message
        );
      }
      return buffer;
    } catch (err) {
      lastErr = err;
      const isTargetClose =
        err &&
        (err.name === "TargetCloseError" ||
          (err.message && err.message.includes("Target closed")));
      console.error(
        `[reportService] renderPdfBuffer error (attempt ${attempt}):`,
        err && (err.stack || err.message || err)
      );

      // save debug artifacts
      try {
        const debugDir = path.join(process.cwd(), "tmp", "report_debug");
        fs.mkdirSync(debugDir, { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const htmlPath = path.join(
          debugDir,
          `report_${ts}_attempt${attempt}.html`
        );
        const pngPath = path.join(
          debugDir,
          `report_${ts}_attempt${attempt}.png`
        );
        fs.writeFileSync(htmlPath, html, "utf8");

        if (page && typeof page.screenshot === "function") {
          try {
            await page.screenshot({ path: pngPath, fullPage: true });
            console.error(
              `[reportService] Saved debug files: ${htmlPath} ${pngPath}`
            );
          } catch (ssErr) {
            console.warn(
              "[reportService] screenshot failed:",
              ssErr && ssErr.message
            );
            console.error(
              `[reportService] Saved debug HTML: ${htmlPath} (screenshot skipped)`
            );
          }
        } else {
          console.error(
            `[reportService] Saved debug HTML: ${htmlPath} (page not available for screenshot)`
          );
        }

        const pngExists = fs.existsSync(pngPath);
        if (pngExists) {
          try {
            const fallback = await createPdfFromPng(pngPath);
            console.log(
              "[reportService] Returning fallback PDF created from screenshot PNG"
            );
            try {
              if (browser) await browser.close();
            } catch (e) {}
            return fallback;
          } catch (fallbackErr) {
            console.warn(
              "[reportService] fallback PNG→PDF failed:",
              fallbackErr && fallbackErr.message
            );
          }
        }
      } catch (fsErr) {
        console.error(
          "[reportService] failed to write debug files:",
          fsErr && fsErr.message
        );
      }

      try {
        if (browser) await browser.close();
      } catch (closeErr) {
        console.warn(
          "[reportService] error closing browser after failure:",
          closeErr && closeErr.message
        );
      }

      if (
        (isTargetClose ||
          (err &&
            err.message &&
            (err.message.includes("pdf-generation-timeout") ||
              err.message.includes("Target closed")))) &&
        attempt <= maxRetries
      ) {
        console.warn(
          `[reportService] transient error detected — retrying (attempt ${
            attempt + 1
          }/${maxRetries + 1})`
        );
        await new Promise((res) => setTimeout(res, 1000 * attempt));
        continue;
      }

      break;
    }
  }

  console.error(
    "[reportService] All PDF attempts failed. Last error:",
    lastErr && (lastErr.stack || lastErr.message || lastErr)
  );
  throw lastErr || new Error("Failed to generate PDF");
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
};
