// src/services/reportRenders.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require("util");
const child_process = require("child_process");
const execFile = util.promisify(child_process.execFile);
const spawnSync = child_process.spawnSync;

const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const PDFLib = require("pdf-lib");

function pruneEmptyColumnsFromData(rows, columns) {
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
  if (kept.length === 0) {
    return {
      columns: columns.slice(),
      keptIndexes: columns.map((_, i) => i),
    };
  }
  return { columns: kept, keptIndexes: keptIdx };
}

function computeAutoWidthForColumn(rows, key, header) {
  const minWidth = 5;
  const maxWidth = 80;
  let maxLen = String(header || "").length;
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i][key];
    if (v === null || v === undefined) continue;
    const s = String(v);
    if (s.length > maxLen) maxLen = s.length;
  }
  const width = Math.ceil(Math.min(maxWidth, Math.max(minWidth, maxLen * 1.1)));
  return width;
}

async function renderExcelBuffer(rows, headers) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  const safeRows = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
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
  const pruned = pruneEmptyColumnsFromData(safeRows, cols);
  const finalCols = pruned.columns.length > 0 ? pruned.columns : cols;
  finalCols.forEach((c) => {
    c.width = computeAutoWidthForColumn(safeRows, c.key, c.header);
  });
  sheet.columns = finalCols.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));
  for (const r of safeRows) {
    const rowObj = {};
    for (const c of finalCols) {
      rowObj[c.key] = Object.prototype.hasOwnProperty.call(r, c.key)
        ? r[c.key]
        : "";
    }
    sheet.addRow(rowObj);
  }
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

async function renderTasksExcelBuffer(tasksRows, weeklyRows) {
  const workbook = new ExcelJS.Workbook();
  function addSheet(name, rows, fallbackRows = []) {
    const safeRows = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
    let cols;
    if (safeRows.length > 0) {
      cols = Object.keys(safeRows[0]).map((k) => ({
        header: k,
        key: k,
        width: 20,
      }));
    } else {
      const fallbackSafe =
        Array.isArray(fallbackRows) && fallbackRows.length > 0
          ? fallbackRows.map((r) => ({ ...r }))
          : [];
      if (fallbackSafe.length > 0) {
        cols = Object.keys(fallbackSafe[0]).map((k) => ({
          header: k,
          key: k,
          width: 20,
        }));
      } else {
        cols = [{ header: "Message", key: "message", width: 50 }];
        safeRows.push({ message: "No data available for selected range" });
      }
    }
    const pruned = pruneEmptyColumnsFromData(safeRows, cols);
    const finalCols = pruned.columns.length > 0 ? pruned.columns : cols;
    finalCols.forEach((c) => {
      c.width = computeAutoWidthForColumn(safeRows, c.key, c.header);
    });
    const sheet = workbook.addWorksheet(name);
    sheet.columns = finalCols.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
    }));
    sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
    for (const r of safeRows) {
      const rowObj = {};
      for (const c of finalCols) {
        rowObj[c.key] = Object.prototype.hasOwnProperty.call(r, c.key)
          ? r[c.key]
          : "";
      }
      sheet.addRow(rowObj);
    }
  }
  addSheet("Tasks", tasksRows, weeklyRows);
  addSheet("Weekly Tasks", weeklyRows, tasksRows);
  const buf = await workbook.xlsx.writeBuffer();
  return buf;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function computeColumnPercents(rows) {
  if (!rows || rows.length === 0) return [];
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return [];
  const count = headers.length;
  const base = Math.max(6, Math.round((100 / count) * 10) / 10);
  const percents = headers.map(() => base);
  const sum = percents.reduce((s, v) => s + v, 0);
  const diff = Math.round((100 - sum) * 10) / 10;
  if (Math.abs(diff) >= 0.1) {
    percents[0] = Math.round((percents[0] + diff) * 10) / 10;
  }
  return percents;
}

/* ------------------ Timestamp / meta helpers (Asia/Kolkata) ------------------ */

/**
 * formatTimestampAsiaKolkata()
 * Returns timestamp string in "YYYY-MM-DD HH:mm:ss (Asia/Kolkata)".
 */
function formatTimestampAsiaKolkata(d = new Date()) {
  try {
    const s = d.toLocaleString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
    const parts = s.split(",").map((p) => p.trim());
    const datePart = parts[0];
    const timePart = parts[1] || "";
    const dp = datePart.split("/");
    if (dp.length === 3) {
      const [dd, mm, yyyy] = dp;
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(
        2,
        "0"
      )} ${timePart} (Asia/Kolkata)`;
    }
    return `${s} (Asia/Kolkata)`;
  } catch (e) {
    const iso = new Date().toISOString().slice(0, 19).replace("T", " ");
    return `${iso} (UTC)`;
  }
}

/**
 * generateMetaHeaderHtml(headerInfo)
 * headerInfo: { status?, department?, employeeName? }
 * Returns HTML snippet (string) that displays left meta items and right timestamp.
 *
 * Ordering rule:
 * - If status === "all" (case-insensitive), order: Employee, Department, Status
 * - Otherwise: Status, Department, Employee
 */
function generateMetaHeaderHtml(headerInfo) {
  const status =
    headerInfo && headerInfo.status ? String(headerInfo.status).trim() : "";
  const dept =
    headerInfo && headerInfo.department
      ? String(headerInfo.department).trim()
      : "";
  const employee =
    headerInfo && headerInfo.employeeName
      ? String(headerInfo.employeeName).trim()
      : "";

  const timestamp = escapeHtml(formatTimestampAsiaKolkata(new Date()));

  // determine ordering
  const isAllStatus =
    typeof status === "string" && status.trim().toLowerCase() === "all";

  const leftItems = [];
  if (isAllStatus) {
    if (employee)
      leftItems.push(
        `<div class="meta-item"><strong>Employee:</strong> ${escapeHtml(
          employee
        )}</div>`
      );
    if (dept)
      leftItems.push(
        `<div class="meta-item"><strong>Department:</strong> ${escapeHtml(
          dept
        )}</div>`
      );
    if (status)
      leftItems.push(
        `<div class="meta-item"><strong>Status:</strong> ${escapeHtml(
          status
        )}</div>`
      );
  } else {
    if (status)
      leftItems.push(
        `<div class="meta-item"><strong>Status:</strong> ${escapeHtml(
          status
        )}</div>`
      );
    if (dept)
      leftItems.push(
        `<div class="meta-item"><strong>Department:</strong> ${escapeHtml(
          dept
        )}</div>`
      );
    if (employee)
      leftItems.push(
        `<div class="meta-item"><strong>Employee:</strong> ${escapeHtml(
          employee
        )}</div>`
      );
  }

  const leftHtml = leftItems.length
    ? leftItems.join("")
    : `<div class="meta-item"><em>No filters</em></div>`;

  const html = `
    <div class="report-meta" style="margin: 8px 0 12px 0; font-family: Arial, Helvetica, sans-serif;">
      <style>
        .report-meta { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; box-sizing: border-box; }
        .report-meta .meta-left { display: flex; flex-direction: column; gap: 4px; }
        .report-meta .meta-item { font-size: 12px; color: #333; line-height: 1.2; }
        .report-meta .meta-right { text-align: right; min-width: 200px; }
        .report-meta .time { font-size: 11px; color: #666; font-family: monospace; }
        @media (max-width: 480px) {
          .report-meta { flex-direction: column; gap: 8px; align-items: stretch; }
          .report-meta .meta-right { text-align: left; min-width: auto; }
        }
      </style>

      <div class="meta-left">
        ${leftHtml}
      </div>

      <div class="meta-right">
        <div class="time"><strong>Generated:</strong><br>${timestamp}</div>
      </div>
    </div>
  `;
  return html;
}

/**
 * rowsToHtml
 *
 * Generates HTML used for LibreOffice conversion to PDF (and for HTML-based PDF generation).
 * - headers are centered
 * - print-friendly color palette is applied
 * - small-table behavior preserved
 *
 * This version supports an optional "special header row" convention:
 * If the first row in `rows` is an object with `_is_report_header: true`, it's removed
 * from the data and its `status`, `department`, and `employeeName` properties are
 * rendered in the left meta block above the table (instead of an in-table spanning header).
 */
function rowsToHtml(title, rows) {
  const inputRows = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
  let headerInfo = null;
  if (inputRows.length > 0 && inputRows[0] && inputRows[0]._is_report_header) {
    headerInfo = { ...inputRows.shift() };
    delete headerInfo._is_report_header;
  }

  const headerCols =
    inputRows && inputRows.length ? Object.keys(inputRows[0]) : [];
  const colCount = headerCols.length || 0;
  const colPercents = computeColumnPercents(inputRows);
  const smallTableMode = colCount > 0 && colCount <= 3;
  const treatAsSmall = colCount === 0 ? true : smallTableMode;
  const titleFontSizePx = 22;
  const thFontSizePx = 10;
  const tdFontSizePx = 10;
  const cellBorderPx = 1;
  const smallMode = colCount >= 8;
  const cellPadding = smallMode ? "2px" : "4px";
  const tableFont = "Arial, Helvetica, sans-serif";
  const colgroup = headerCols
    .map((h, i) => {
      if (treatAsSmall) return `<col>`;
      const pct = colPercents[i] != null ? `${colPercents[i]}%` : null;
      return pct ? `<col style="width:${pct}">` : `<col>`;
    })
    .join("");

  // === Color palette (edit these to change the colors) ===
  const colors = {
    titleColor: "#153243", // Title text color
    metaColor: "#4a5568", // Sub-meta color
    headerBg: "#2E86AB", // Header background (print-friendly blue)
    headerText: "#ffffff", // Header text color
    rowOddBg: "#ffffff", // Odd row background
    rowEvenBg: "#f7fbff", // Even row background (subtle)
    borderColor: "#d1d5db", // Light border color
    tableText: "#111827", // Main table text color
  };
  // =======================================================

  const thInlineBase = [
    `border:${cellBorderPx}px solid ${colors.borderColor}`,
    `padding:${cellPadding}`,
    `font-size:${thFontSizePx}px`,
    `vertical-align:middle`,
    `background:${colors.headerBg}`,
    `color:${colors.headerText}`,
    `-webkit-print-color-adjust:exact`,
    `text-align:center`, // center header labels
    `font-weight:600`,
  ].join("; ");

  const tdInlineBase = [
    `border:${cellBorderPx}px solid ${colors.borderColor}`,
    `padding:${cellPadding}`,
    `font-size:${tdFontSizePx}px`,
    `vertical-align:top`,
    `text-align:${treatAsSmall ? "center" : "left"}`, // keep body alignment as before
    `word-break:break-word`,
    `color:${colors.tableText}`,
  ].join("; ");

  const head = headerCols
    .map((h) => `<th style="${thInlineBase}">${escapeHtml(h)}</th>`)
    .join("");

  // build rows with alternating background colors to improve readability
  const body =
    inputRows && inputRows.length
      ? inputRows
          .map((r, rowIndex) => {
            const bg = rowIndex % 2 === 0 ? colors.rowOddBg : colors.rowEvenBg;
            const tds = headerCols
              .map((c) => {
                const cell = r[c] == null ? "" : String(r[c]);
                return `<td style="${tdInlineBase}; background:${bg}">${escapeHtml(
                  cell
                )}</td>`;
              })
              .join("");
            return `<tr>${tds}</tr>`;
          })
          .join("")
      : `<tr><td colspan="${
          headerCols.length || 1
        }" style="${tdInlineBase}; text-align:center; background:${
          colors.rowOddBg
        }">No data available</td></tr>`;

  const tableInlineStyle = treatAsSmall
    ? `border:${cellBorderPx}px solid ${colors.borderColor}; border-collapse:collapse; margin:0 auto; table-layout:auto;`
    : `border:${cellBorderPx}px solid ${colors.borderColor}; border-collapse:collapse; width:100%; table-layout:fixed;`;

  const css = `
    @page { size: A4 ${
      colCount >= 6 ? "landscape" : "portrait"
    }; margin: 12mm; }
    html, body { height: 100%; margin: 0; padding: 0; }
    body { font-family: ${tableFont}; color:${
    colors.tableText
  }; margin:0; padding:0; -webkit-print-color-adjust: exact; }
    .wrap { box-sizing: border-box; width: 100%; padding: 6px; margin: 0; overflow: visible; }
    .meta { margin-bottom:8px; font-size:9px; color:${
      colors.metaColor
    }; text-align: ${treatAsSmall ? "center" : "left"}; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
    th { text-transform: none; }
  `;

  const h2Inline = `font-size:${titleFontSizePx}px; font-weight:700; margin:0 0 10px 0; text-align:center; color:${colors.titleColor}`;

  // NOTE: intentionally do NOT render headerInfoRowHtml inside the table.
  // The headerInfo (if present) will be used only to render the meta block above the table.

  // generate meta header snippet (left meta items + right timestamp)
  const metaHeaderHtml = generateMetaHeaderHtml(headerInfo);

  // build thead (without the in-table header info)
  const theadHtml = `<thead><tr>${
    head || `<th style="${thInlineBase}">Data</th>`
  }</tr></thead>`;

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
      ${metaHeaderHtml}
      <table style="${tableInlineStyle}">
        <colgroup>${colgroup}</colgroup>
        ${theadHtml}
        <tbody>${body}</tbody>
      </table>
    </div>
  </body>
</html>`;
}

function findLibreOfficeBinary() {
  const candidates = [];
  if (process.env.LIBREOFFICE_PATH)
    candidates.push(process.env.LIBREOFFICE_PATH);
  candidates.push("soffice", "libreoffice", "soffice.exe", "libreoffice.exe");
  for (const bin of candidates) {
    if (!bin) continue;
    try {
      const res = spawnSync(bin, ["--version"], { stdio: "ignore" });
      if (res && typeof res.status === "number" && res.status === 0) {
        return bin;
      }
    } catch (e) {}
  }
  try {
    const which = spawnSync("which", ["soffice"], { encoding: "utf8" });
    if (which && which.status === 0 && which.stdout) {
      const p = which.stdout.trim().split("\n")[0];
      if (p) return p;
    }
  } catch (e) {}
  return null;
}

async function renderHtmlStringToPdfBuffer(htmlString) {
  if (!htmlString || htmlString.length === 0) {
    throw new Error("Empty HTML passed to HTML->PDF converter");
  }
  const tmpBase = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "report-html-")
  );
  const htmlFilename = `report_${Date.now()}.html`;
  const htmlPath = path.join(tmpBase, htmlFilename);
  try {
    await fs.promises.writeFile(htmlPath, htmlString, "utf8");
  } catch (writeErr) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw writeErr;
  }
  const soffice = findLibreOfficeBinary();
  if (!soffice) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw new Error(
      "LibreOffice binary not found. Install LibreOffice and ensure 'soffice' in PATH or set LIBREOFFICE_PATH."
    );
  }
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
    try {
      const debugFiles = await fs.promises.readdir(tmpBase);
      console.error(
        "[reportRenders] LibreOffice conversion error, tmp files:",
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
  const pdfPath = path.join(
    tmpBase,
    path.basename(htmlPath, path.extname(htmlPath)) + ".pdf"
  );
  const maxWait = 5000;
  const step = 200;
  let waited = 0;
  while (waited < maxWait && !fs.existsSync(pdfPath)) {
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
  try {
    await fs.promises.rm(tmpBase, { recursive: true, force: true });
  } catch (e) {
    console.warn("[reportRenders] failed to cleanup tmp dir:", e && e.message);
  }
  if (!Buffer.isBuffer(pdfBuf) || pdfBuf.length === 0) {
    throw new Error("Converted PDF is empty");
  }
  return pdfBuf;
}

async function renderXlsxBufferToPdfBuffer(xlsxBuffer, title, meta) {
  const tmpBase = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "report-xlsx-")
  );
  const xlsxFilename = `report_${Date.now()}.xlsx`;
  const xlsxPath = path.join(tmpBase, xlsxFilename);
  try {
    await fs.promises.writeFile(xlsxPath, xlsxBuffer);
  } catch (writeErr) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw writeErr;
  }
  const soffice = findLibreOfficeBinary();
  if (!soffice) {
    try {
      await fs.promises.rm(tmpBase, { recursive: true, force: true });
    } catch (e) {}
    throw new Error(
      "LibreOffice/soffice not found. Install LibreOffice and ensure 'soffice' in PATH or set LIBREOFFICE_PATH."
    );
  }
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
        "[reportRenders] LibreOffice conversion error, tmp files:",
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
  const pdfPath = path.join(
    tmpBase,
    path.basename(xlsxPath, path.extname(xlsxPath)) + ".pdf"
  );
  const maxWait = 5000;
  const step = 200;
  let waited = 0;
  while (waited < maxWait && !fs.existsSync(pdfPath)) {
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
  try {
    await fs.promises.rm(tmpBase, { recursive: true, force: true });
  } catch (e) {
    console.warn("[reportRenders] failed to cleanup tmp dir:", e && e.message);
  }
  if (!Buffer.isBuffer(pdfBuf) || pdfBuf.length === 0) {
    throw new Error("Converted PDF is empty");
  }

  // If no meta provided, return the converted PDF as-is
  if (!meta || Object.keys(meta).length === 0) {
    return pdfBuf;
  }

  // Otherwise create a small HTML cover page containing the meta and merge it in front
  try {
    const headerRow = [{ _is_report_header: true, ...meta }];
    const coverHtml = rowsToHtml(title || "Report", headerRow);
    const coverPdf = await renderHtmlStringToPdfBuffer(coverHtml);
    const merged = await mergePdfBuffers([coverPdf, pdfBuf]);
    return merged;
  } catch (e) {
    // If merging fails, return the original PDF but log error
    console.error(
      "[reportRenders] failed to attach meta cover page:",
      e && e.message
    );
    return pdfBuf;
  }
}

async function mergePdfBuffers(buffers) {
  if (!buffers || !Array.isArray(buffers) || buffers.length === 0)
    return Buffer.from([]);
  const mergedPdf = await PDFLib.PDFDocument.create();
  for (const b of buffers) {
    try {
      const src = await PDFLib.PDFDocument.load(b);
      const copied = await mergedPdf.copyPages(src, src.getPageIndices());
      copied.forEach((p) => mergedPdf.addPage(p));
    } catch (e) {
      console.warn(
        "[reportRenders] skipping invalid PDF while merging:",
        e && e.message
      );
    }
  }
  const mergedBytes = await mergedPdf.save();
  return Buffer.from(mergedBytes);
}

async function renderPdfBuffer(title, rows, meta) {
  // if meta provided, use special header row convention so rowsToHtml renders it (as left meta, not table header)
  const rowsCopy = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
  if (meta && Object.keys(meta).length > 0) {
    rowsCopy.unshift({ _is_report_header: true, ...meta });
  }
  const html = rowsToHtml(title || "Report", rowsCopy);
  if (!html || html.length === 0) {
    throw new Error("Empty HTML passed to PDF generator");
  }
  const pdfBuf = await renderHtmlStringToPdfBuffer(html);
  return pdfBuf;
}

async function renderExcelToPdfBuffer(rows, headers, title, meta) {
  const xlsxBuffer = await renderExcelBuffer(rows, headers);
  const pdfBuf = await renderXlsxBufferToPdfBuffer(xlsxBuffer, title, meta);
  return pdfBuf;
}

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

async function renderTasksPdfBufferUsingHtml(tasksRows, weeklyRows, meta) {
  // If meta provided, ensure both sections display the meta on their own cover rows
  const tasksRowsCopy = Array.isArray(tasksRows)
    ? tasksRows.map((r) => ({ ...r }))
    : [];
  const weeklyRowsCopy = Array.isArray(weeklyRows)
    ? weeklyRows.map((r) => ({ ...r }))
    : [];
  if (meta && Object.keys(meta).length > 0) {
    tasksRowsCopy.unshift({ _is_report_header: true, ...meta });
    weeklyRowsCopy.unshift({ _is_report_header: true, ...meta });
  }
  const tasksHtml = rowsToHtml("Tasks", tasksRowsCopy);
  const weeklyHtml = rowsToHtml("Weekly Tasks", weeklyRowsCopy);
  const tasksPdf = await renderHtmlStringToPdfBuffer(tasksHtml);
  const weeklyPdf = await renderHtmlStringToPdfBuffer(weeklyHtml);
  return Buffer.concat([tasksPdf, weeklyPdf]);
}

async function renderTasksPdfBufferFromXlsx(tasksRows, weeklyRows) {
  const xlsxBuffer = await renderTasksExcelBuffer(tasksRows, weeklyRows);
  const pdfBuf = await renderXlsxBufferToPdfBuffer(xlsxBuffer);
  return pdfBuf;
}

async function renderTasksPdfBuffer(tasksRows, weeklyRows) {
  return await renderTasksPdfBufferUsingHtml(tasksRows, weeklyRows);
}

module.exports = {
  renderExcelBuffer,
  renderTasksExcelBuffer,
  renderPdfBuffer,
  renderExcelToPdfBuffer,
  renderHtmlStringToPdfBuffer,
  renderXlsxBufferToPdfBuffer,
  renderTasksPdfBuffer,
  renderTasksPdfBufferUsingHtml,
  renderTasksPdfBufferFromXlsx,
  createPdfFromPng,
  findLibreOfficeBinary,
};
