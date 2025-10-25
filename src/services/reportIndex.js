// src/services/reportIndex.js
const utils = require("./reportUtils");
const filters = require("./reportFilters");
const reports = require("./reports");
const renders = require("./reportRenders");
const reportMeta = require("./reportMeta");

/**
 * Note on wrappers:
 * - Many render functions in reportRenders accept meta/title for metadata injection.
 * - To keep callers simple, the wrappers below accept `options` as the last argument.
 *   options = { title?: string, meta?: { status?, department?, departmentName?, employeeName?, employee? }, req?: ExpressRequest, query?: {} }
 *
 * The normalizeMetaForRender helper will try to pick meta from:
 *   1) options.meta
 *   2) options.query (or options.req.query)
 *   3) top-level options keys (status, department_id, employee_name, etc)
 *
 * It returns an object shaped { status?, department?, employeeName? } which the renderers expect.
 */

function withDefaultOptions(opts) {
  return opts && typeof opts === "object" ? opts : {};
}

/**
 * Extracts a possibly nested value (query/status) from a variety of places.
 * Accepts rawMeta which may be:
 *  - an object with { meta: {...} }
 *  - a request-like object { query: {...} }
 *  - a plain object with keys on top-level
 */
function normalizeMetaForRender(raw) {
  const out = {};

  if (!raw || typeof raw !== "object") return out;

  // accept either raw.meta or raw directly
  const source =
    raw.meta && typeof raw.meta === "object"
      ? raw.meta
      : raw.query && typeof raw.query === "object"
      ? raw.query
      : raw.req && raw.req.query && typeof raw.req.query === "object"
      ? raw.req.query
      : raw;

  // helper to coerce val to trimmed string or null
  const norm = (v) => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  };

  // STATUS
  // Accept many variations, take raw value (we don't re-normalize tokens here)
  const statusCandidate =
    norm(source.status) ||
    norm(source.approval_status) ||
    norm(source.payment_status) ||
    norm(source.state) ||
    null;
  if (statusCandidate) out.status = statusCandidate;

  // DEPARTMENT
  // Prefer departmentName > department > department_name > departmentId (id may remain an id)
  const deptNameCandidate =
    norm(source.departmentName) ||
    norm(source.department) ||
    norm(source.department_name) ||
    norm(source.department_name_display) ||
    null;
  if (deptNameCandidate) {
    out.department = deptNameCandidate;
  } else {
    // fallback to id if provided
    const deptIdCandidate =
      norm(source.departmentId) || norm(source.department_id);
    if (deptIdCandidate) out.department = deptIdCandidate;
  }

  // EMPLOYEE NAME
  // Prefer employeeName > employee_name > employee > employeeId (id fallback)
  const empNameCandidate =
    norm(source.employeeName) ||
    norm(source.employee_name) ||
    norm(source.employee) ||
    null;
  if (empNameCandidate) {
    out.employeeName = empNameCandidate;
  } else {
    const empIdCandidate = norm(source.employeeId) || norm(source.employee_id);
    if (empIdCandidate) out.employeeName = empIdCandidate;
  }

  return out;
}

// ----------------- exports -----------------
module.exports = {
  // utils
  fetchRows: utils.fetchRows,
  coerceToString: utils.coerceToString,

  // filters / normalizers
  normalizeStatusForQuery: filters.normalizeStatusForQuery,
  buildDateStatusParams: filters.buildDateStatusParams,
  keepOnlyFields: filters.keepOnlyFields,
  normalizeReimbursementRow: filters.normalizeReimbursementRow,
  applyEmployeeAndDepartmentFilters: filters.applyEmployeeAndDepartmentFilters,
  normalizeForCompare: filters.normalizeForCompare,
  statusMatches: filters.statusMatches,
  pickFields: filters.pickFields,

  // report fetchers
  getLeaveRows: reports.getLeaveRows,
  getReimbursementRows: reports.getReimbursementRows,
  getEmployeeRows: reports.getEmployeeRows,
  getVendorRows: reports.getVendorRows,
  getAssetRows: reports.getAssetRows,
  getAttendanceRows: reports.getAttendanceRows,
  getTaskRows: reports.getTaskRows,
  getWeeklyTaskRows: reports.getWeeklyTaskRows,
  getDepartments: reports.getDepartments,
  searchEmployees: reports.searchEmployees,

  // ----------------- renderers (wrappers) -----------------

  // Excel / generic
  renderExcelBuffer: renders.renderExcelBuffer,
  renderTasksExcelBuffer: renders.renderTasksExcelBuffer,

  /**
   * HTML -> PDF
   * Usage:
   *   renderPdfBuffer(title, rows, { meta: { status, departmentName, employeeName } })
   *
   * This wrapper will accept meta in several shapes so handlers don't need to always build opts.meta.
   */
  renderPdfBuffer: async (title, rows, options) => {
    const opts = withDefaultOptions(options);
    const meta = normalizeMetaForRender(opts);
    // debug: if meta empty, also try options.req?.query and options.query explicitly
    if (
      !meta.status &&
      !meta.department &&
      !meta.employeeName &&
      opts.req &&
      opts.req.query
    ) {
      const metaFromReq = normalizeMetaForRender({ query: opts.req.query });
      if (
        metaFromReq.status ||
        metaFromReq.department ||
        metaFromReq.employeeName
      ) {
        Object.assign(meta, metaFromReq);
      }
    }
    // If still empty, try top-level options keys (some callers pass keys directly)
    if (!meta.status && !meta.department && !meta.employeeName) {
      const metaFromTop = normalizeMetaForRender(opts);
      if (
        metaFromTop.status ||
        metaFromTop.department ||
        metaFromTop.employeeName
      ) {
        Object.assign(meta, metaFromTop);
      }
    }

    // small debug help (no-op in production; you can remove or replace with proper logger)
    if (!meta.status && !meta.department && !meta.employeeName) {
      try {
        // eslint-disable-next-line no-console
        console.debug(
          "[reportIndex] renderPdfBuffer called without meta or query-derived filters."
        );
      } catch (e) {}
    }

    // renderPdfBuffer in renders expects (title, rows, meta)
    return await renders.renderPdfBuffer(title, rows, meta);
  },

  /**
   * Excel -> PDF (via LibreOffice)
   * Usage:
   *   renderExcelToPdfBuffer(rows, headers, { title: 'Title', meta: { status, departmentName } })
   */
  renderExcelToPdfBuffer: async (rows, headers, options) => {
    const opts = withDefaultOptions(options);
    const meta = normalizeMetaForRender(opts);
    // also try req.query fallback
    if (
      !meta.status &&
      !meta.department &&
      !meta.employeeName &&
      opts.req &&
      opts.req.query
    ) {
      Object.assign(meta, normalizeMetaForRender({ query: opts.req.query }));
    }
    return await renders.renderExcelToPdfBuffer(
      rows,
      headers,
      opts.title,
      meta
    );
  },

  /**
   * Raw HTML string -> PDF buffer
   * Usage:
   *   renderHtmlStringToPdfBuffer(htmlString)
   */
  renderHtmlStringToPdfBuffer: renders.renderHtmlStringToPdfBuffer,

  /**
   * If you already have an XLSX buffer and want to attach meta:
   *   renderXlsxBufferToPdfBuffer(xlsxBuffer, { title: 'Title', meta: {...} })
   */
  renderXlsxBufferToPdfBuffer: async (xlsxBuffer, options) => {
    const opts = withDefaultOptions(options);
    const meta = normalizeMetaForRender(opts);
    if (
      !meta.status &&
      !meta.department &&
      !meta.employeeName &&
      opts.req &&
      opts.req.query
    ) {
      Object.assign(meta, normalizeMetaForRender({ query: opts.req.query }));
    }
    return await renders.renderXlsxBufferToPdfBuffer(
      xlsxBuffer,
      opts.title,
      meta
    );
  },

  // Tasks-specific flows
  renderTasksPdfBuffer: async (tasksRows, weeklyRows, options) => {
    const opts = withDefaultOptions(options);
    const meta = normalizeMetaForRender(opts);
    if (
      !meta.status &&
      !meta.department &&
      !meta.employeeName &&
      opts.req &&
      opts.req.query
    ) {
      Object.assign(meta, normalizeMetaForRender({ query: opts.req.query }));
    }
    return await renders.renderTasksPdfBuffer(tasksRows, weeklyRows, meta);
  },

  renderTasksPdfBufferUsingHtml: async (tasksRows, weeklyRows, options) => {
    const opts = withDefaultOptions(options);
    const meta = normalizeMetaForRender(opts);
    if (
      !meta.status &&
      !meta.department &&
      !meta.employeeName &&
      opts.req &&
      opts.req.query
    ) {
      Object.assign(meta, normalizeMetaForRender({ query: opts.req.query }));
    }
    return await renders.renderTasksPdfBufferUsingHtml(
      tasksRows,
      weeklyRows,
      meta
    );
  },

  renderTasksPdfBufferFromXlsx: renders.renderTasksPdfBufferFromXlsx,

  // utilities
  createPdfFromPng: renders.createPdfFromPng,
  findLibreOfficeBinary: renders.findLibreOfficeBinary,
};
