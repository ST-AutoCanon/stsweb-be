const multer = require("multer");
const path = require("path");
const fs = require("fs");
const upload = require("../utils/multerConfig");
const employeeService = require("../services/employeeService");
const ErrorHandler = require("../utils/errorHandler");
const xlsx = require("xlsx");
const db = require("../config");
const queries = require("../constants/empDetailsQueries");

const getWebPath = (fullPath) => {
  const relPath = fullPath.split("EmployeeDetails").pop().replace(/\\/g, "/");
  return path.posix.join("/EmployeeDetails", relPath);
};

/**
 * Bulk add employees from an Excel file (concurrent processing).
 * Expects the Excel file to be uploaded via req.file (using multer).
 */
exports.bulkAddEmployees = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json(
        ErrorHandler.generateErrorResponse(
          400,
          "Excel file is required for bulk upload."
        )
      );
  }

  try {
    // Parse the Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const employeesData = xlsx.utils.sheet_to_json(worksheet);
    // Excel epoch: day 1 = 1900‑01‑01 (but Excel mistakenly treats 1900 as leap year, so we adjust by 1)
    function excelSerialToJSDate(serial) {
      const utc_days = serial - 25569; // days since 1970‑01‑01
      const ms = utc_days * 86400 * 1000;
      return new Date(ms).toISOString().slice(0, 10); // "YYYY-MM-DD"
    }

    for (let row of employeesData) {
      if (typeof row.dob === "number") {
        row.dob = excelSerialToJSDate(row.dob);
      }
    }
    console.log(employeesData);

    // Remove temp file
    fs.unlink(req.file.path, (err) => {
      if (err) console.warn("Temp file removal failed:", err);
    });

    const results = [];
    const errors = [];

    // Kick off all addEmployee calls concurrently
    const promises = employeesData.map((employeeData) => {
      return employeeService
        .addFullEmployee(employeeData)
        .then(() => {
          results.push({ email: employeeData.email, status: "success" });
        })
        .catch((err) => {
          console.error(
            `Error adding employee (${employeeData.email}):`,
            err.message || err
          );
          errors.push({
            email: employeeData.email,
            error: err.message || "Error adding employee",
          });
        });
    });

    // Wait for all to finish
    await Promise.all(promises);

    return res
      .status(207)
      .json(
        ErrorHandler.generateSuccessResponse(
          207,
          "Bulk employee process completed.",
          { added: results, errors }
        )
      );
  } catch (error) {
    console.error("Bulk employee addition error:", error);
    return res
      .status(500)
      .json(
        ErrorHandler.generateErrorResponse(
          500,
          "Failed to add employees in bulk."
        )
      );
  }
};

exports.createFullEmployee = async (req, res) => {
  console.log("[createFullEmployee] ⇒ start");
  try {
    // 1) flat-copy body
    const data = { ...req.body };
    console.log(data);
    const raw = req.body;
    const additionalCerts = [];

    for (let key of Object.keys(raw)) {
      const m = key.match(
        /^additional_certs\[(\d+)\]\[(name|year|institution)\]$/
      );
      if (!m) continue;
      const idx = Number(m[1]);
      const field = m[2];
      additionalCerts[idx] = additionalCerts[idx] || {};
      additionalCerts[idx][field] = raw[key];
    }

    data.additional_certs = additionalCerts.filter((c) => c);

    // 1) email uniqueness
    const [emailRows] = await db.execute(queries.CHECK_EMAIL, [data.email]);
    if (emailRows.length) {
      return res
        .status(400)
        .json(
          ErrorHandler.generateErrorResponse(
            400,
            "Email already exists. Please use another."
          )
        );
    }

    // 2) aadhar / pan uniqueness
    const [persRows] = await db.execute(queries.CHECK_PERSONAL_DUP, [
      data.aadhaar_number,
      data.pan_number,
    ]);
    if (persRows.length) {
      // determine which
      const dup = persRows[0];
      const field =
        dup.aadhaar_number === data.aadhaar_number ? "Aadhaar" : "PAN";
      return res
        .status(400)
        .json(
          ErrorHandler.generateErrorResponse(
            400,
            `Aadhaar/PAN number already exists.`
          )
        );
    }

    // 2) reorganize files into a map by fieldname
    let filesByField = {};

    if (Array.isArray(req.files)) {
      // upload.any() case
      for (let f of req.files) {
        filesByField[f.fieldname] = filesByField[f.fieldname] || [];
        filesByField[f.fieldname].push(f);
      }
    } else if (typeof req.files === "object") {
      // upload.fields() case: req.files = { photo: [File], aadhaar_doc: [File], … }
      for (let [fieldname, fileArray] of Object.entries(req.files)) {
        filesByField[fieldname] = fileArray;
      }
    }

    // 3) derive base URL folder
    const safeEmail = data.email.replace(/[^a-zA-Z0-9.@_-]/g, "_");

    // 4) list of your 1‑to‑1 fields + their target data keys
    const simpleMap = {
      photo: "photo_url",
      aadhaar_doc: "aadhaar_doc_url",
      pan_doc: "pan_doc_url",
      passport_doc: "passport_doc_url",
      driving_license_doc: "driving_license_doc_url",
      voter_id_doc: "voter_id_doc_url",
      tenth_cert: "tenth_cert_url",
      twelfth_cert: "twelfth_cert_url",
      ug_cert: "ug_cert_url",
      pg_cert: "pg_cert_url",
      resume: "resume_url",
      other_docs: "other_docs_urls",
    };

    for (let [field, dataKey] of Object.entries(simpleMap)) {
      const files = filesByField[field] || [];
      if (!files.length) continue;

      if (field === "other_docs") {
        data[dataKey] = files.map((f) => getWebPath(f.path));
      } else {
        data[dataKey] = getWebPath(files[0].path);
      }
    }

    // 5) additional_certs
    if (Array.isArray(data.additional_certs)) {
      data.additional_certs = data.additional_certs.map((cert, idx) => {
        const key = `additional_certs[${idx}][file]`;
        const files = filesByField[key] || [];
        cert.file_urls = files.map((f) => getWebPath(f.path));
        return cert;
      });
    }

    // 6) experience
    if (Array.isArray(data.experience)) {
      data.experience = data.experience.map((exp, idx) => {
        const key = `experience[${idx}][doc]`;
        const files = filesByField[key] || [];
        exp.doc_urls = files.map((f) => getWebPath(f.path));
        return exp;
      });
    }

    // 7) family docs
    for (let side of [
      "father",
      "mother",
      "spouse",
      "child1",
      "child2",
      "child3",
    ]) {
      const field = `${side}_gov_doc`;
      const urlKey = `${side}_gov_doc_url`;
      const files = filesByField[field] || [];
      data[urlKey] = files.map((f) => getWebPath(f.path));
    }

    // 8) call service
    console.log("[createFullEmployee] calling service.addFullEmployee");
    const { employee_id } = await employeeService.addFullEmployee(data);
    console.log("[createFullEmployee] ⇒ success", employee_id);

    return res.status(201).json(
      ErrorHandler.generateSuccessResponse(201, "Employee created.", {
        employee_id,
      })
    );
  } catch (err) {
    console.error("[createFullEmployee] error:", err);
    return res
      .status(500)
      .json(
        ErrorHandler.generateErrorResponse(
          500,
          err.message || "Failed to create employee."
        )
      );
  } finally {
    console.log("[createFullEmployee] ⇒ end");
  }
};

exports.updateFullEmployee = async (req, res) => {
  console.log("[updateFullEmployee] ⇒ start");
  try {
    // 1) pull in path param + body
    const data = { employee_id: req.params.employeeId, ...req.body };
    console.log("[updateFullEmployee] raw data:", data);
    console.log("👉 RAW req.files:", JSON.stringify(req.files, null, 2));

    [
      "dob",
      "father_dob",
      "mother_dob",
      "spouse_dob",
      "child1_dob",
      "child2_dob",
      "child3_dob",
      "marriage_date",
      "joining_date",
    ].forEach((k) => {
      if (data[k] && typeof data[k] === "string" && data[k].includes("T")) {
        data[k] = data[k].split("T")[0];
      }
    });

    const [emailRows] = await db.execute(queries.CHECK_EMAIL_UPDATE, [
      data.email,
      data.employee_id,
    ]);
    if (emailRows.length) {
      return res
        .status(400)
        .json(
          ErrorHandler.generateErrorResponse(
            400,
            "Email already in use by another employee."
          )
        );
    }

    // 2) aadhar / pan uniqueness (excluding self)
    const [persRows] = await db.execute(queries.CHECK_PERSONAL_DUP_UPDATE, [
      data.aadhaar_number,
      data.pan_number,
      data.employee_id,
    ]);
    if (persRows.length) {
      const field =
        persRows[0].aadhaar_number === data.aadhaar_number ? "Aadhaar" : "PAN";
      return res
        .status(400)
        .json(
          ErrorHandler.generateErrorResponse(
            400,
            `${field} number already in use by another employee.`
          )
        );
    }

    console.log("👉 RAW req.files:", JSON.stringify(req.files, null, 2));

    let filesByField = {};
    if (Array.isArray(req.files)) {
      // upload.any()
      for (let f of req.files) {
        filesByField[f.fieldname] = filesByField[f.fieldname] || [];
        filesByField[f.fieldname].push(f);
      }
    } else if (typeof req.files === "object") {
      // upload.fields()
      for (let [field, arr] of Object.entries(req.files)) {
        filesByField[field] = arr;
      }
    }

    const safeEmail = data.email;

    // 4) your 1‑to‑1 file fields → target keys
    const simpleMap = {
      photo: "photo_url",
      aadhaar_doc: "aadhaar_doc_url",
      pan_doc: "pan_doc_url",
      passport_doc: "passport_doc_url",
      driving_license_doc: "driving_license_doc_url",
      voter_id_doc: "voter_id_doc_url",
      tenth_cert: "tenth_cert_url",
      twelfth_cert: "twelfth_cert_url",
      ug_cert: "ug_cert_url",
      pg_cert: "pg_cert_url",
      resume: "resume_url",
      other_docs: "other_docs_urls",
    };

    for (let [field, dataKey] of Object.entries(simpleMap)) {
      const files = filesByField[field] || [];
      if (!files.length) continue;

      if (field === "other_docs") {
        data[dataKey] = files.map((f) => getWebPath(f.path));
      } else {
        data[dataKey] = getWebPath(files[0].path);
      }
    }

    // 5) additional_certs
    if (Array.isArray(data.additional_certs)) {
      data.additional_certs = data.additional_certs.map((cert, idx) => {
        const key = `additional_certs[${idx}][file]`;
        const files = filesByField[key] || [];
        cert.file_urls = files.map((f) => getWebPath(f.path));
        return cert;
      });
    }

    // 6) experience
    if (Array.isArray(data.experience)) {
      data.experience = data.experience.map((exp, idx) => {
        const key = `experience[${idx}][doc]`;
        const files = filesByField[key] || [];
        exp.doc_urls = files.map((f) => getWebPath(f.path));
        return exp;
      });
    }

    // 7) family docs
    for (let side of [
      "father",
      "mother",
      "spouse",
      "child1",
      "child2",
      "child3",
    ]) {
      const field = `${side}_gov_doc`;
      const urlKey = `${side}_gov_doc_url`;
      const files = filesByField[field] || [];
      data[urlKey] = files.map((f) => getWebPath(f.path));
    }
    // 8) call your service
    console.log("[updateFullEmployee] calling service.editFullEmployee");
    await employeeService.editFullEmployee(data);

    console.log("[updateFullEmployee] ⇒ success");
    return res
      .status(200)
      .json(ErrorHandler.generateSuccessResponse(200, "Employee updated."));
  } catch (err) {
    console.error("[updateFullEmployee] error:", err);
    return res
      .status(500)
      .json(
        ErrorHandler.generateErrorResponse(
          500,
          err.message || "Failed to update employee."
        )
      );
  } finally {
    console.log("[updateFullEmployee] ⇒ end");
  }
};

/**
 * Fetch an employee's full profile (all steps).
 */
exports.getFullEmployee = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const profile = await employeeService.getFullEmployee(employeeId);
    return res
      .status(200)
      .json(
        ErrorHandler.generateSuccessResponse(200, "Employee fetched.", profile)
      );
  } catch (err) {
    console.error("getFullEmployee error:", err);
    return res
      .status(404)
      .json(
        ErrorHandler.generateErrorResponse(
          404,
          err.message || "Employee not found."
        )
      );
  }
};

/**
 * List all supervisors (for dropdowns).
 */
exports.listSupervisors = async (req, res) => {
  try {
    const supervisors = await employeeService.listSupervisors();
    return res
      .status(200)
      .json(
        ErrorHandler.generateSuccessResponse(
          200,
          "Supervisors fetched.",
          supervisors
        )
      );
  } catch (err) {
    console.error("listSupervisors error:", err);
    return res
      .status(500)
      .json(
        ErrorHandler.generateErrorResponse(500, "Failed to fetch supervisors.")
      );
  }
};

/**
 * Handler to fetch all employees or search employees based on the search query and date filters.
 */
exports.searchEmployees = async (req, res) => {
  try {
    const { search, fromDate, toDate } = req.query;

    const employees = await employeeService.searchEmployees(
      search,
      fromDate,
      toDate
    );

    return res
      .status(200)
      .json(ErrorHandler.generateSuccessResponse(200, { data: employees }));
  } catch (error) {
    console.error("Error fetching employees:", error);

    return res
      .status(500)
      .json(
        ErrorHandler.generateErrorResponse(500, "Failed to fetch employees")
      );
  }
};

const BASE_UPLOADS = path.join(__dirname, "../../../EmployeeDetails");

exports.serveEmployeeFile = async (req, res) => {
  try {
    const relativePath = req.params[0];
    console.log("[serveEmployeeFile] relativePath:", relativePath);

    const sanitizedPath = relativePath.replace(/\.\./g, "");
    console.log("[serveEmployeeFile] sanitizedPath:", sanitizedPath);

    const fullPath = path.join(
      BASE_UPLOADS,
      sanitizedPath.replace(/^EmployeeDetails[\\/]/, "")
    );
    console.log("[serveEmployeeFile] fullPath:", fullPath);

    if (!fs.existsSync(fullPath)) {
      console.warn("[serveEmployeeFile] file does not exist:", fullPath);
      return res
        .status(404)
        .json({ status: "error", message: "File not found" });
    }

    console.log("[serveEmployeeFile] sending file:", fullPath);
    return res.sendFile(fullPath);
  } catch (err) {
    console.error("[serveEmployeeFile] error:", err);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to serve file." });
  }
};

/**
 * Handler to deactivate an employee.
 */
exports.deactivateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    await employeeService.deactivateEmployee(employeeId);
    return res
      .status(200)
      .json(
        ErrorHandler.generateSuccessResponse(
          200,
          "Employee deactivated successfully"
        )
      );
  } catch (error) {
    return res
      .status(400)
      .json(
        ErrorHandler.generateErrorResponse(400, "Failed to deactivate employee")
      );
  }
};

/**
 * GET /api/user_roles
 * Returns [{ id, name }, …]
 */
exports.listUserRoles = async (req, res) => {
  try {
    const roles = await employeeService.getUserRoles();
    return res.status(200).json({ status: "success", data: roles });
  } catch (err) {
    console.error("listUserRoles error:", err);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to fetch roles" });
  }
};

/**
 * GET /api/positions?role=Manager&department_id=23
 */
exports.listPositions = async (req, res) => {
  try {
    const { role, department_id } = req.query;
    const positions = await employeeService.getPositions(role, department_id);
    return res.status(200).json({ status: "success", data: positions });
  } catch (err) {
    console.error("listPositions error:", err);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to fetch positions" });
  }
};

/**
 * GET /api/positions/supervisors?position=Engineer&department_id=23
 */
exports.listSupervisorsByPosition = async (req, res) => {
  try {
    const { position, department_id } = req.query;
    const supervisors = await employeeService.getSupervisorsByPosition(
      position,
      department_id
    );
    return res.status(200).json({ status: "success", data: supervisors });
  } catch (err) {
    console.error("listSupervisorsByPosition error:", err);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to fetch supervisors" });
  }
};

exports.assignSupervisor = async (req, res, next) => {
  try {
    const { employeeId, supervisorId, startDate } = req.body;
    if (!employeeId || !supervisorId || !startDate) {
      return res
        .status(400)
        .json(
          ErrorHandler.generateErrorResponse(
            400,
            "employeeId, supervisorId and startDate are required."
          )
        );
    }
    const result = await employeeService.assignSupervisor(
      employeeId,
      supervisorId,
      startDate
    );
    return res.json(
      ErrorHandler.generateSuccessResponse(200, "Supervisor assigned.", result)
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/supervisor/history/:employeeId
exports.getSupervisorHistory = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId;
    const history = await employeeService.getSupervisorHistory(employeeId);
    return res.json(
      ErrorHandler.generateSuccessResponse(200, "History fetched.", { history })
    );
  } catch (err) {
    next(err);
  }
};
