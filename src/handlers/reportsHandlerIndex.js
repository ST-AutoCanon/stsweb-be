// src/handlers/reportsHandlerIndex.js
// Central index that safely requires handler modules and provides
// fallback stubs for missing exports so routes don't throw on startup.

"use strict";

const path = require("path");
const fs = require("fs");

let reportsService = null;
try {
  reportsService = require("../services/reports");
} catch (e) {
  console.warn(
    "[reportsHandlerIndex] Could not require services/reports:",
    e && e.message
  );
  reportsService = null;
}

/**
 * Attempts to require a module relative to this file.
 * Returns null on failure (and logs a warning).
 * Accepts requests like "./reportAttendanceHandler"
 */
function safeRequire(relPath) {
  try {
    const absCandidate = path.join(__dirname, relPath);
    let abs = null;

    const variants = [
      absCandidate,
      absCandidate + ".js",
      absCandidate + ".json",
    ];
    for (const v of variants) {
      if (fs.existsSync(v)) {
        abs = v;
        break;
      }
    }

    if (!abs) {
      throw new Error(`File not found for require: ${relPath}`);
    }

    // require using absolute path
    const mod = require(abs);
    return mod;
  } catch (err) {
    console.warn(
      `[reportsHandlerIndex] Could not require '${relPath}': ${err.message}`
    );
    if (err && err.stack) console.debug(err.stack);
    return null;
  }
}

/**
 * Returns a middleware that responds 501 for missing handlers.
 * Matches Express handler signature (req, res, next) — next is optional.
 */
function fallbackHandler(name) {
  return function missingHandler(req, res /* next */) {
    console.error(
      `[reportsHandlerIndex] Handler '${name}' is missing. Returning 501.`
    );
    return res
      .status(501)
      .json({ message: `Handler '${name}' not implemented on server` });
  };
}

/**
 * Try to obtain a named export from a module. If module is a function
 * and matches the requested name, return it. Otherwise if export exists,
 * return it. Else return a fallback handler.
 */
function getExport(mod, name) {
  if (!mod) {
    console.warn(
      `[reportsHandlerIndex] Module for '${name}' is null/failed to load; using fallback.`
    );
    return fallbackHandler(name);
  }

  // If module itself is a function and name === 'default' or module.name matches, try that
  if (typeof mod === "function") {
    if (name === "default" || name === mod.name) {
      return mod;
    }
    console.warn(
      `[reportsHandlerIndex] Module is a function but does not expose '${name}'. Using fallback.`
    );
    return fallbackHandler(name);
  }

  // If module exports an object with the named property, return it
  if (
    Object.prototype.hasOwnProperty.call(mod, name) &&
    typeof mod[name] === "function"
  ) {
    return mod[name];
  }

  // Try default export forms
  if (mod.default) {
    if (
      typeof mod.default === "function" &&
      (name === "default" || mod.default.name === name)
    ) {
      return mod.default;
    }
    if (
      typeof mod.default === "object" &&
      typeof mod.default[name] === "function"
    ) {
      return mod.default[name];
    }
  }

  console.warn(
    `[reportsHandlerIndex] Export '${name}' not found in module; using fallback.`
  );
  return fallbackHandler(name);
}

/* --------- Attempt to require each handler module --------- */
const attendanceMod = safeRequire("./reportAttendanceHandler") || {};
const assetsMod = safeRequire("./reportAssetsHandler") || {};
const departmentsMod = safeRequire("./reportDepartmentsHandler") || {};
const employeesMod = safeRequire("./reportEmployeesHandler") || {};
const leavesMod = safeRequire("./reportLeavesHandler") || {};
const reimbursementsMod = safeRequire("./reportReimbursementsHandler") || {};
const tasksMod = safeRequire("./reportTasksHandler") || {};
const vendorsMod = safeRequire("./reportVendorsHandler") || {};

/* --------- Service-backed fallback handlers (when handlers are missing) --------- */

/**
 * Fallback for searchEmployees:
 * - Accepts q, limit, department_id in query
 * - Returns { results: [...], total: N } (or 501 if service not available)
 */
async function svc_searchEmployees(req, res) {
  try {
    console.debug(
      "[reportsHandlerIndex] svc_searchEmployees called - query:",
      req.query || {}
    );
    const q = (req.query.q || req.query.query || "").toString().trim();
    const limitRaw = req.query.limit || req.query.limit || req.query.l || 10;
    let limit = Number(limitRaw);
    if (!Number.isFinite(limit) || limit <= 0) limit = 10;
    const departmentId =
      req.query.department_id ||
      req.query.departmentId ||
      req.query.dept ||
      null;

    if (
      !reportsService ||
      typeof reportsService.searchEmployees !== "function"
    ) {
      console.error(
        "[reportsHandlerIndex] reportsService.searchEmployees not available - cannot serve searchEmployees"
      );
      return res.status(501).json({
        message: "Handler 'searchEmployees' not implemented on server",
      });
    }

    // If no query provided, be tolerant — return empty results
    if (!q) {
      return res.json({ results: [], total: 0 });
    }

    // reportsService.searchEmployees supports string or object style
    const svcArg = { q, limit, departmentId };
    const svcResult = await reportsService.searchEmployees(svcArg);

    if (Array.isArray(svcResult)) {
      return res.json({ results: svcResult, total: svcResult.length });
    }
    if (svcResult && typeof svcResult === "object") {
      const results = Array.isArray(svcResult.results) ? svcResult.results : [];
      const total = Number.isFinite(Number(svcResult.total))
        ? Number(svcResult.total)
        : results.length;
      return res.json({ results, total });
    }

    // Unexpected shape
    return res.json({ results: [], total: 0 });
  } catch (err) {
    console.error(
      "[reportsHandlerIndex] svc_searchEmployees error:",
      err && (err.stack || err.message)
    );
    return res.status(500).json({
      message: err && err.message ? err.message : "Internal Server Error",
    });
  }
}

/**
 * Fallback for getDepartments:
 * - Calls reportsService.getDepartments() when handler missing.
 */
async function svc_getDepartments(req, res) {
  try {
    console.debug("[reportsHandlerIndex] svc_getDepartments called");
    if (
      !reportsService ||
      typeof reportsService.getDepartments !== "function"
    ) {
      console.error(
        "[reportsHandlerIndex] reportsService.getDepartments not available - cannot serve getDepartments"
      );
      return res.status(501).json({
        message: "Handler 'getDepartments' not implemented on server",
      });
    }
    const rows = await reportsService.getDepartments();
    return res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error(
      "[reportsHandlerIndex] svc_getDepartments error:",
      err && (err.stack || err.message)
    );
    return res.status(500).json({
      message: err && err.message ? err.message : "Internal Server Error",
    });
  }
}

/* --------- Build exports: prefer handler modules; if missing, provide sensible service fallbacks where possible --------- */

const exportObj = {
  // Attendance
  downloadAttendanceReport: getExport(
    attendanceMod,
    "downloadAttendanceReport"
  ),

  // Assets
  downloadAssetsReport: getExport(assetsMod, "downloadAssetsReport"),

  // Departments & Employees
  // Prefer department handler's getDepartments if present; otherwise fallback to service wrapper
  getDepartments:
    departmentsMod && typeof departmentsMod.getDepartments === "function"
      ? getExport(departmentsMod, "getDepartments")
      : svc_getDepartments,

  // Employee search: prefer employeesMod.searchEmployees else fallback to service wrapper
  searchEmployees:
    employeesMod && typeof employeesMod.searchEmployees === "function"
      ? getExport(employeesMod, "searchEmployees")
      : svc_searchEmployees,

  // Employees download (prefer handler; fallback to generic 501 handler if not present)
  downloadEmployeesReport: getExport(employeesMod, "downloadEmployeesReport"),

  // Leaves
  downloadLeavesReport: getExport(leavesMod, "downloadLeavesReport"),

  // Reimbursements
  downloadReimbursementsReport: getExport(
    reimbursementsMod,
    "downloadReimbursementsReport"
  ),

  // Tasks
  downloadTasksSupervisorReport: getExport(
    tasksMod,
    "downloadTasksSupervisorReport"
  ),
  downloadTasksEmployeeReport: getExport(
    tasksMod,
    "downloadTasksEmployeeReport"
  ),

  // Vendors
  downloadVendorsReport: getExport(vendorsMod, "downloadVendorsReport"),
};

module.exports = exportObj;
