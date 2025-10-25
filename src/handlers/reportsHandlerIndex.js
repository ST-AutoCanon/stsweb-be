// src/handlers/reportsHandlerIndex.js
// Central index that safely requires handler modules and provides
// fallback stubs for missing exports so routes don't throw on startup.

"use strict";

const path = require("path");
const fs = require("fs");

/**
 * Attempts to require a module relative to this file.
 * Returns null on failure (and logs a warning).
 * Accepts requests like "./reportAttendanceHandler"
 */
function safeRequire(relPath) {
  try {
    // resolve an absolute file path (allow providing with or without .js)
    const absCandidate = path.join(__dirname, relPath);
    let abs = null;

    // Try common file variants
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

    // Use the absolute path to require to avoid relative-resolve issues
    const mod = require(abs);

    // If module exports a function directly, return it as-is (caller will handle)
    return mod;
  } catch (err) {
    // Print full stack for debugging, but keep server running
    console.warn(
      `[reportsHandlerIndex] Could not require '${relPath}': ${err.message}`
    );
    if (err && err.stack) {
      // show stack at debug level so you can investigate startup requires
      console.debug(err.stack);
    }
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
    // If requested name is "default" accept the function, otherwise warn and fallback.
    if (name === "default" || name === mod.name) {
      return mod;
    }
    // no named export available
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

  // Some modules export the handler directly on `module.exports = { downloadSomething }`
  // but could be nested under `.default` when transpiled. Try `.default[name]` and `.default`.
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

// adjust these file names if your actual handler files have different names/casing
const attendanceMod = safeRequire("./reportAttendanceHandler") || {};
const assetsMod = safeRequire("./reportAssetsHandler") || {};
const departmentsMod = safeRequire("./reportDepartmentsHandler") || {};
const employeesMod = safeRequire("./reportEmployeesHandler") || {};
const leavesMod = safeRequire("./reportLeavesHandler") || {};
const reimbursementsMod = safeRequire("./reportReimbursementsHandler") || {};
const tasksMod = safeRequire("./reportTasksHandler") || {};
const vendorsMod = safeRequire("./reportVendorsHandler") || {};

/* --------- Exports expected by your routes --------- */

module.exports = {
  // Attendance
  downloadAttendanceReport: getExport(
    attendanceMod,
    "downloadAttendanceReport"
  ),

  // Assets
  downloadAssetsReport: getExport(assetsMod, "downloadAssetsReport"),

  // Departments & Employees
  getDepartments: getExport(departmentsMod, "getDepartments"),
  searchEmployees: getExport(employeesMod, "searchEmployees"),

  // Employees download
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
