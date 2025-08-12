const db = require("../config");
const queries = require("../constants/empDetailsQueries");
const sgMail = require("@sendgrid/mail");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const path = require("path");

const BASE_UPLOADS = path.join(__dirname, "../../../EmployeeDetails");

// ---------- helpers (add/ensure these are available in this module) ----------
function tryParseJSON(val) {
  if (val == null) return val;
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

function normalizeToStringArray(input) {
  if (input == null) return [];

  if (Array.isArray(input)) {
    const out = [];
    for (const item of input) {
      const nested = normalizeToStringArray(item);
      for (const v of nested) if (v) out.push(v);
    }
    return Array.from(new Set(out));
  }

  if (typeof input === "object") {
    try {
      return normalizeToStringArray(JSON.stringify(input));
    } catch {
      return [];
    }
  }

  const s = String(input).trim();
  if (!s) return [];

  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const parsed = JSON.parse(s);
      return normalizeToStringArray(parsed);
    } catch {}
  }

  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      const parsed = JSON.parse(s);
      return normalizeToStringArray(parsed);
    } catch {}
  }

  if (s.includes(",")) {
    const parts = s
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    return normalizeToStringArray(parts);
  }

  return [s];
}

function arrayToJsonOrNull(val) {
  const arr = normalizeToStringArray(val);
  if (!arr || !arr.length) return null;
  return JSON.stringify(arr);
}

function ensureArrayField(raw) {
  return normalizeToStringArray(raw);
}

// convert a web URL (/EmployeeDetails/...) -> full disk path
function webUrlToFullPath(webUrl) {
  if (!webUrl) return null;
  // remove query params if any
  const clean = String(webUrl).split("?")[0];
  // trim leading slashes then remove the EmployeeDetails/ prefix
  const rel = clean.replace(/^\/?EmployeeDetails[\\/]/, "");
  return path.join(BASE_UPLOADS, rel);
}

// delete files on disk given a mixed value (string/array/JSON-string)
function deleteFilesByUrlsMixed(val) {
  const arr = normalizeToStringArray(val);
  for (const url of arr) {
    try {
      const full = webUrlToFullPath(url);
      if (full && fs.existsSync(full)) {
        fs.unlinkSync(full);
        console.log("[file-delete] removed:", full);
      } else {
        // file not present — still okay
        // console.log("[file-delete] not found:", full);
      }
    } catch (e) {
      console.warn(
        "[file-delete] failed for",
        url,
        e && e.message ? e.message : e
      );
    }
  }
}
// ---------- end helpers ----------

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendResetEmail = async (employeeEmail, employeeName) => {
  const resetToken = uuidv4();

  const resetLink = `${process.env.FRONTEND_URL}/ResetPassword?token=${resetToken}`;
  const tokenExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

  // Save the reset token and its expiry into the database
  await db.execute(queries.SAVE_RESET_TOKEN, [
    employeeEmail,
    resetToken,
    tokenExpiry,
  ]);

  const msg = {
    to: employeeEmail,
    from: process.env.SENDGRID_SENDER_EMAIL,
    subject: "Welcome to SUKALPA TECH SOLUTIONS – Set Up Your Account",
    text: `Dear ${employeeName},

Welcome to SUKALPA TECH SOLUTIONS! We're excited to have you join our team and look forward to achieving great things together.

🔐 Reset Your Password
To activate your account, please reset your password using the link below:
${resetLink}

Note: This link will be valid for 3 days. If it expires, you can request a new one from the login page.

"Coming together is a beginning. Keeping together is progress. Working together is success."

Thank you, and once again, welcome to the team!

Warm regards,
SUKALPA TECH SOLUTIONS
https://sukalpatechsolutions.com
info@sukalpatech.com`,

    html: `
    <p>Dear ${employeeName},</p>
    <p>Welcome to <strong>SUKALPA TECH SOLUTIONS</strong>! We're excited to have you join our team and look forward to achieving great things together.</p>

    <h3>🔐 Reset Your Password</h3>
    <p>To activate your account, please reset your password using the link below:</p>
    <p><a href="${resetLink}" style="color: blue; text-decoration: underline; font-weight: bold;">👉 Reset Your Password</a></p>

    <p><strong>Note:</strong> This link will be valid for 3 days. If it expires, you can request a new one from the login page.</p>

    <blockquote style="font-style: italic; color: gray;">
      "Coming together is a beginning. Keeping together is progress. Working together is success."
    </blockquote>

    <p>Thank you, and once again, welcome to the team!</p>
    <p>Warm regards,</p>
    <p><strong>SUKALPA TECH SOLUTIONS</strong></p>
    <p><a href="https://sukalpatechsolutions.com">https://sukalpatechsolutions.com</a> | <a href="mailto:info@sukalpatech.com">info@sukalpatech.com</a></p>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error(
      `Error sending email: ${
        error.response?.body?.errors?.[0]?.message || error.message
      }`
    );
  }
};

// services/employeeService.js
exports.addFullEmployee = async (data) => {
  console.log("[addFullEmployee] ⇒ start", { email: data.email });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    console.log("[addFullEmployee] began transaction");

    // 1) Insert core
    const password = crypto.randomBytes(8).toString("hex");
    const hash = await bcrypt.hash(password, 10);
    console.log("[addFullEmployee] generated temp password & hash");

    const [coreRes] = await conn.execute(queries.ADD_EMPLOYEE_CORE, [
      data.first_name,
      data.last_name,
      data.email,
      hash,
      data.phone_number,
      data.dob,
    ]);
    console.log("[addFullEmployee] core insert result:", coreRes);

    // fetch the new employee_id
    const [[{ employee_id: eid }]] = await conn.execute(
      `SELECT employee_id FROM employees WHERE email = ?`,
      [data.email]
    );
    console.log("[addFullEmployee] new employee_id:", eid);

    // ensure personal file fields are JSON strings (or null) — use flattening helper
    const personalFileKeys = [
      "spouse_gov_doc_url",
      "aadhaar_doc_url",
      "pan_doc_url",
      "passport_doc_url",
      "driving_license_doc_url",
      "voter_id_doc_url",
      "father_gov_doc_url",
      "mother_gov_doc_url",
      "child1_gov_doc_url",
      "child2_gov_doc_url",
      "child3_gov_doc_url",
      "photo_url",
    ];
    personalFileKeys.forEach((k) => {
      if (k in data) data[k] = arrayToJsonOrNull(data[k]);
    });

    // 2) Personal
    console.log("[addFullEmployee] inserting personal details");
    await conn.execute(queries.ADD_EMPLOYEE_PERSONAL, [
      eid,
      data.address || null,
      data.father_name || null,
      data.mother_name || null,
      data.gender || null,
      data.marital_status || null,
      data.spouse_name || null,
      data.spouse_dob || null,
      data.spouse_gov_doc_url || null,
      data.marriage_date || null,
      data.aadhaar_number || null,
      data.aadhaar_doc_url || null,
      data.pan_number || null,
      data.pan_doc_url || null,
      data.passport_number || null,
      data.passport_doc_url || null,
      data.driving_license_number || null,
      data.driving_license_doc_url || null,
      data.voter_id || null,
      data.voter_id_doc_url || null,
      data.uan_number || null,
      data.pf_number || null,
      data.esi_number || null,
      data.photo_url || null,
      data.alternate_email || null,
      data.alternate_number || null,
      data.blood_group || null,
      data.emergency_name || null,
      data.emergency_number || null,
      data.father_dob || null,
      data.father_gov_doc_url || null,
      data.mother_dob || null,
      data.mother_gov_doc_url || null,
      data.child1_name || null,
      data.child1_dob || null,
      data.child1_gov_doc_url || null,
      data.child2_name || null,
      data.child2_dob || null,
      data.child2_gov_doc_url || null,
      data.child3_name || null,
      data.child3_dob || null,
      data.child3_gov_doc_url || null,
    ]);

    // 3) Education
    console.log("[addFullEmployee] inserting education details");
    await conn.execute(queries.ADD_EMPLOYEE_EDU, [
      eid,
      data.tenth_institution || null,
      data.tenth_year || null,
      data.tenth_board || null,
      data.tenth_score || null,
      arrayToJsonOrNull(
        data.tenth_cert_url || data.tenth_cert || data.tenth_cert_urls
      ),
      data.twelfth_institution || null,
      data.twelfth_year || null,
      data.twelfth_board || null,
      data.twelfth_score || null,
      arrayToJsonOrNull(
        data.twelfth_cert_url || data.twelfth_cert || data.twelfth_cert_urls
      ),
      data.ug_institution || null,
      data.ug_year || null,
      data.ug_board || null,
      data.ug_score || null,
      arrayToJsonOrNull(data.ug_cert_url || data.ug_cert || data.ug_cert_urls),
      data.pg_institution || null,
      data.pg_year || null,
      data.pg_board || null,
      data.pg_score || null,
      arrayToJsonOrNull(data.pg_cert_url || data.pg_cert || data.pg_cert_urls),
    ]);

    if (Array.isArray(data.additional_certs)) {
      for (let cert of data.additional_certs) {
        const fileUrls = cert.file_urls || cert.files || cert.file || null;
        await conn.execute(queries.ADD_EMPLOYEE_ADDITIONAL_CERT, [
          eid,
          cert.name || null,
          cert.institution || null,
          cert.year || null,
          arrayToJsonOrNull(fileUrls),
        ]);
      }
    }

    // 4) Professional
    console.log("[addFullEmployee] inserting professional details");
    await conn.execute(queries.ADD_EMPLOYEE_PRO, [
      eid,
      data.domain,
      data.employee_type || null,
      data.joining_date || null,
      data.role,
      data.department_id || null,
      data.position || null,
      data.supervisor_id || null,
      data.salary,
      arrayToJsonOrNull(data.resume_url || data.resume || data.resume_urls),
    ]);

    console.log("[addFullEmployee] inserting other document records");
    // insert other docs per-row if present
    const otherDocsRaw = data.other_docs_urls || data.other_docs || null;
    const otherDocs = ensureArrayField(otherDocsRaw);
    if (otherDocs.length) {
      for (const url of otherDocs) {
        await conn.execute(queries.ADD_EMPLOYEE_OTHER_DOC, [eid, url]);
      }
    }

    // 5) Bank
    console.log("[addFullEmployee] inserting bank details");
    const fullName = `${data.first_name} ${data.last_name}`.trim();
    await conn.execute(queries.ADD_EMPLOYEE_BANK, [
      eid,
      fullName, // ← employee_name
      data.bank_name,
      data.account_number,
      data.ifsc_code,
      data.branch_name, // or branch fallback as before
    ]);

    console.log("[addFullEmployee] inserting experience entries");
    if (Array.isArray(data.experience)) {
      for (let exp of data.experience) {
        const docUrls = exp.doc_urls || exp.files || exp.doc || null;
        await conn.execute(queries.ADD_EMPLOYEE_EXP, [
          eid,
          exp.company || null,
          exp.role || null,
          exp.start_date || null,
          exp.end_date || null,
          arrayToJsonOrNull(docUrls),
        ]);
      }
    }

    await conn.commit();
    console.log("[addFullEmployee] committed transaction");
    try {
      console.log("[addFullEmployee] sending reset email to:", data.email);
      await sendResetEmail(data.email, `${data.first_name} ${data.last_name}`);
      console.log("[addFullEmployee] reset email sent");
    } catch (mailErr) {
      console.warn(
        "[addFullEmployee] warning: reset‐email failed — not rolling back:",
        mailErr.message
      );
    }

    return { employee_id: eid };
  } catch (err) {
    console.error("[addFullEmployee] error, rolling back:", err);
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    console.log("[addFullEmployee] ⇒ end");
  }
};

exports.editFullEmployee = async (data) => {
  console.log("[editFullEmployee] ⇒ start", { employee_id: data.employee_id });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    console.log("[editFullEmployee] began transaction");

    const eid = data.employee_id; // <- use this throughout

    // Load existing DB row so we can fallback when client didn't send a value
    const [existingRows] = await conn.execute(queries.GET_FULL_EMPLOYEE, [eid]);
    const existing = existingRows && existingRows[0] ? existingRows[0] : {};
    console.log("[editFullEmployee] loaded existing row for fallback");

    // Helper to check whether client explicitly sent a key
    const hasKey = (k) => Object.prototype.hasOwnProperty.call(data, k);

    // Normalize a few incoming JSON-ish fields if the client provided them
    if (hasKey("resume_url") && typeof data.resume_url === "string") {
      const parsed = tryParseJSON(data.resume_url);
      if (Array.isArray(parsed)) data.resume_url = parsed;
    }
    if (
      hasKey("additional_certs") &&
      typeof data.additional_certs === "string"
    ) {
      const parsed = tryParseJSON(data.additional_certs);
      if (Array.isArray(parsed)) data.additional_certs = parsed;
    }
    if (hasKey("experience") && typeof data.experience === "string") {
      const parsed = tryParseJSON(data.experience);
      if (Array.isArray(parsed)) data.experience = parsed;
    }

    // small pick helper: prefer client's explicit key, else existing DB value
    const pick = (key) => (hasKey(key) ? data[key] : existing[key]);

    // === BEFORE WRITES: delete old files only for fields client supplied ===

    // personal file-array fields (photo, gov docs, etc.)
    const personalFileFields = [
      "spouse_gov_doc_url",
      "aadhaar_doc_url",
      "pan_doc_url",
      "passport_doc_url",
      "driving_license_doc_url",
      "voter_id_doc_url",
      "photo_url",
      "father_gov_doc_url",
      "mother_gov_doc_url",
      "child1_gov_doc_url",
      "child2_gov_doc_url",
      "child3_gov_doc_url",
    ];

    for (const field of personalFileFields) {
      if (hasKey(field)) {
        // client provided a new value (could be [] to clear): remove old files
        deleteFilesByUrlsMixed(existing[field]);
      }
    }

    // resume: if the client provided any resume field (resume_url / resume / resume_urls) -> delete old resume files
    if (hasKey("resume_url") || hasKey("resume") || hasKey("resume_urls")) {
      deleteFilesByUrlsMixed(existing.resume_url);
    }

    // other_docs: if client provided other_docs or other_docs_urls -> delete old other docs
    if (hasKey("other_docs") || hasKey("other_docs_urls")) {
      deleteFilesByUrlsMixed(existing.other_docs);
    }

    // additional_certs: if client sent additional_certs we will delete the rows,
    // so delete files referenced by existing.additional_certs before deleting rows
    if (hasKey("additional_certs")) {
      try {
        const oldAdditional = tryParseJSON(existing.additional_certs) || [];
        if (Array.isArray(oldAdditional) && oldAdditional.length) {
          for (const cert of oldAdditional) {
            deleteFilesByUrlsMixed(
              cert && (cert.file_urls || cert.files || cert.file)
            );
          }
        }
      } catch (e) {
        console.warn(
          "[editFullEmployee] could not parse existing.additional_certs",
          e
        );
      }
    }

    // experience: same approach — delete existing experience doc files only if client provided experience
    if (hasKey("experience")) {
      try {
        const oldExp = tryParseJSON(existing.experience) || [];
        if (Array.isArray(oldExp) && oldExp.length) {
          for (const ex of oldExp) {
            deleteFilesByUrlsMixed(ex && (ex.doc_urls || ex.files || ex.doc));
          }
        }
      } catch (e) {
        console.warn(
          "[editFullEmployee] could not parse existing.experience",
          e
        );
      }
    }

    // At this point we've removed old files for fields client is replacing.
    // Proceed with updates (core/personal/edu/pro/bank/rows) — same as your previous logic.

    // 1) Core update
    await conn.execute(queries.UPDATE_EMPLOYEE_CORE, [
      pick("first_name"),
      pick("last_name"),
      pick("email"),
      pick("phone_number"),
      pick("dob"),
      eid,
    ]);

    // 2) Personal - list/order must match your SQL
    const personalKeys = [
      "address",
      "father_name",
      "mother_name",
      "gender",
      "marital_status",
      "spouse_name",
      "spouse_dob",
      "spouse_gov_doc_url",
      "marriage_date",
      "aadhaar_number",
      "aadhaar_doc_url",
      "pan_number",
      "pan_doc_url",
      "passport_number",
      "passport_doc_url",
      "driving_license_number",
      "driving_license_doc_url",
      "voter_id",
      "voter_id_doc_url",
      "uan_number",
      "pf_number",
      "esi_number",
      "photo_url",
      "alternate_email",
      "alternate_number",
      "blood_group",
      "emergency_name",
      "emergency_number",
      "father_dob",
      "father_gov_doc_url",
      "mother_dob",
      "mother_gov_doc_url",
      "child1_name",
      "child1_dob",
      "child1_gov_doc_url",
      "child2_name",
      "child2_dob",
      "child2_gov_doc_url",
      "child3_name",
      "child3_dob",
      "child3_gov_doc_url",
    ];

    const personalFileSet = new Set(personalFileFields);

    const personalParams = personalKeys.map((k) => {
      const val = pick(k);
      if (personalFileSet.has(k)) {
        return arrayToJsonOrNull(val);
      }
      return val !== undefined ? val : null;
    });
    personalParams.push(eid);
    await conn.execute(queries.UPDATE_EMPLOYEE_PERSONAL, personalParams);

    // 3) Education
    const resolveCertValue = (dbKey, altKeys = []) => {
      for (const k of [dbKey, ...altKeys]) {
        if (hasKey(k)) return data[k];
      }
      return existing[dbKey];
    };

    await conn.execute(queries.UPDATE_EMPLOYEE_EDU, [
      pick("tenth_institution") || null,
      pick("tenth_year") || null,
      pick("tenth_board") || null,
      pick("tenth_score") || null,
      arrayToJsonOrNull(
        resolveCertValue("tenth_cert_url", ["tenth_cert", "tenth_cert_urls"])
      ),
      pick("twelfth_institution") || null,
      pick("twelfth_year") || null,
      pick("twelfth_board") || null,
      pick("twelfth_score") || null,
      arrayToJsonOrNull(
        resolveCertValue("twelfth_cert_url", [
          "twelfth_cert",
          "twelfth_cert_urls",
        ])
      ),
      pick("ug_institution") || null,
      pick("ug_year") || null,
      pick("ug_board") || null,
      pick("ug_score") || null,
      arrayToJsonOrNull(
        resolveCertValue("ug_cert_url", ["ug_cert", "ug_cert_urls"])
      ),
      pick("pg_institution") || null,
      pick("pg_year") || null,
      pick("pg_board") || null,
      pick("pg_score") || null,
      arrayToJsonOrNull(
        resolveCertValue("pg_cert_url", ["pg_cert", "pg_cert_urls"])
      ),
      eid,
    ]);

    // 3b) Additional certs
    if (hasKey("additional_certs")) {
      await conn.execute(queries.DELETE_EMPLOYEE_ADDITIONAL_CERTS, [eid]);
      if (
        Array.isArray(data.additional_certs) &&
        data.additional_certs.length
      ) {
        for (let cert of data.additional_certs) {
          const fileUrls = cert.file_urls || cert.files || cert.file || null;
          await conn.execute(queries.ADD_EMPLOYEE_ADDITIONAL_CERT, [
            eid,
            cert.name || null,
            cert.institution || null,
            cert.year || null,
            arrayToJsonOrNull(fileUrls),
          ]);
        }
      }
    } else {
      console.log("[editFullEmployee] skipping additional_certs (no key)");
    }

    // 4) Professional (resume)
    const chosenResume = (() => {
      if (hasKey("resume_url")) return data.resume_url;
      if (hasKey("resume")) return data.resume;
      if (hasKey("resume_urls")) return data.resume_urls;
      return existing.resume_url;
    })();

    await conn.execute(queries.UPDATE_EMPLOYEE_PRO, [
      pick("domain"),
      pick("employee_type") || null,
      pick("joining_date") || null,
      pick("role"),
      pick("department_id") || null,
      pick("position") || null,
      pick("supervisor_id") || null,
      pick("salary"),
      arrayToJsonOrNull(chosenResume),
      eid,
    ]);

    // 4b) Other docs
    if (hasKey("other_docs") || hasKey("other_docs_urls")) {
      if (queries.DELETE_EMPLOYEE_OTHER_DOCS) {
        await conn.execute(queries.DELETE_EMPLOYEE_OTHER_DOCS, [eid]);
      }
      const otherDocsRaw = hasKey("other_docs_urls")
        ? data.other_docs_urls
        : hasKey("other_docs")
        ? data.other_docs
        : null;
      const otherDocs = ensureArrayField(otherDocsRaw);
      if (otherDocs.length) {
        for (const url of otherDocs) {
          await conn.execute(queries.ADD_EMPLOYEE_OTHER_DOC, [eid, url]);
        }
      }
    } else {
      console.log("[editFullEmployee] skipping other_docs (no key)");
    }

    // 5) Bank
    const fullName = `${pick("first_name") || existing.first_name || ""} ${
      pick("last_name") || existing.last_name || ""
    }`.trim();
    await conn.execute(queries.UPDATE_EMPLOYEE_BANK, [
      fullName,
      pick("bank_name"),
      pick("account_number"),
      pick("ifsc_code"),
      pick("branch_name"),
      eid,
    ]);

    // 6) Experience (delete+reinsert only if provided)
    if (hasKey("experience")) {
      if (!queries.DELETE_EMPLOYEE_EXP)
        throw new Error("Missing SQL query: DELETE_EMPLOYEE_EXP");
      await conn.execute(queries.DELETE_EMPLOYEE_EXP, [eid]);

      const expList = Array.isArray(data.experience) ? data.experience : [];
      for (const exp of expList) {
        const docUrls = normalizeToStringArray(
          exp.doc_urls || exp.files || exp.doc || null
        );
        const hasAny =
          (exp.company && String(exp.company).trim()) ||
          (exp.role && String(exp.role).trim()) ||
          (exp.start_date && String(exp.start_date).trim()) ||
          (exp.end_date && String(exp.end_date).trim()) ||
          (Array.isArray(docUrls) && docUrls.length);
        if (!hasAny) continue;
        await conn.execute(queries.ADD_EMPLOYEE_EXP, [
          eid,
          exp.company || null,
          exp.role || null,
          exp.start_date || null,
          exp.end_date || null,
          arrayToJsonOrNull(docUrls),
        ]);
      }
    } else {
      console.log("[editFullEmployee] skipping experience (no key)");
    }

    await conn.commit();
    console.log("[editFullEmployee] committed");
  } catch (err) {
    await conn.rollback();
    console.error("[editFullEmployee] error:", err);
    throw err;
  } finally {
    conn.release();
  }
};

exports.getFullEmployee = async (employeeId) => {
  const [rows] = await db.execute(queries.GET_FULL_EMPLOYEE, [employeeId]);
  if (!rows.length) throw new Error("Not found");
  const row = rows[0];

  row.additional_certs = tryParseJSON(row.additional_certs) || [];
  row.experience = tryParseJSON(row.experience) || [];

  const fileFields = [
    "tenth_cert_url",
    "twelfth_cert_url",
    "ug_cert_url",
    "pg_cert_url",
    "photo_url",
    "aadhaar_doc_url",
    "pan_doc_url",
    "passport_doc_url",
    "driving_license_doc_url",
    "voter_id_doc_url",
    "resume_url",
    "other_docs", // ensure your SELECT aliases "other_docs" this way
  ];

  for (const k of fileFields) {
    if (k in row) row[k] = ensureArrayField(row[k]);
  }

  // for additional certs: ensure cert.files exists and is flattened
  if (Array.isArray(row.additional_certs)) {
    row.additional_certs = row.additional_certs.map((cert) => {
      if (!cert) return cert;
      cert.files = ensureArrayField(cert.files || cert.file_urls || cert.file);
      return cert;
    });
  }

  if (Array.isArray(row.experience)) {
    row.experience = row.experience.map((exp) => {
      if (!exp) return exp;
      exp.files = ensureArrayField(
        exp.files || exp.doc_url || exp.doc_urls || exp.doc
      );
      return exp;
    });
  }

  return row;
};

/**
 * Service to search employees based on search criteria.
 */
exports.searchEmployees = async (search, fromDate, toDate) => {
  try {
    let query = queries.GET_ALL_EMPLOYEES;
    let params = [];

    if (search) {
      query = queries.SEARCH_EMPLOYEES;
      params = [
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
      ];
    }

    // ✅ Fix Date Handling to Prevent UTC Shift
    function formatToMySQLDate(dateStr, isEndOfDay = false) {
      if (!dateStr) return null;

      // Convert to Local Time (Avoid UTC shift)
      const date = new Date(dateStr + "T00:00:00"); // Ensures midnight local time
      if (isEndOfDay) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }

      // Convert to MySQL DATETIME format
      return date.toISOString().slice(0, 19).replace("T", " ");
    }

    const formattedFromDate = formatToMySQLDate(fromDate);
    const formattedToDate = formatToMySQLDate(toDate, true);

    if (formattedFromDate && formattedToDate) {
      query += " AND e.created_at BETWEEN ? AND ?";
      params.push(formattedFromDate, formattedToDate);
    } else if (formattedFromDate) {
      query += " AND e.created_at >= ?";
      params.push(formattedFromDate);
    } else if (formattedToDate) {
      query += " AND e.created_at <= ?";
      params.push(formattedToDate);
    }

    // Debug Logs
    console.log("🔍 Executing Query:", query);
    console.log("🕒 From Date:", formattedFromDate);
    console.log("🕒 To Date:", formattedToDate);
    console.log("📌 Query Parameters:", params);

    const [rows] = await db.execute(query, params);
    return rows;
  } catch (error) {
    console.error("❌ Error fetching employees from database:", error);
    throw new Error("Error fetching employees from database");
  }
};

/**
 * Deactivate an employee by setting status to 'Inactive'.
 */
exports.deactivateEmployee = async (employeeId) => {
  try {
    const [result] = await db.execute(queries.UPDATE_EMPLOYEE_STATUS, [
      employeeId,
    ]);

    if (result.affectedRows === 0) {
      throw new Error("Employee not found or already deactivated");
    }

    return { message: "Employee deactivated successfully" };
  } catch (error) {
    console.error("Error in deactivateEmployee:", error.message);
    throw error;
  }
};

/**
 * Fetch employee details.
 */
exports.getEmployee = async (employeeId) => {
  try {
    const [rows] = await db.execute(queries.GET_EMPLOYEE, [employeeId]);

    if (rows.length === 0) {
      throw new Error("Employee not found");
    }

    return rows[0];
  } catch (error) {
    console.error("Error in getEmployee:", error.message);
    throw error;
  }
};

exports.getUserRoles = async () => {
  const [rows] = await db.execute(queries.GET_USER_ROLES);
  return rows;
};

exports.getPositions = async (role, department_id) => {
  const dept = department_id || null;
  const [rows] = await db.execute(queries.GET_POSITIONS_BY_ROLE_AND_DEPT, [
    role,
    role,
    dept,
    role,
    dept,
    role,
    dept,
    role,
    dept,
  ]);
  return rows.map((r) => r.name);
};

exports.getSupervisorsByPosition = async (position, department_id) => {
  const [rankRows] = await db.execute(queries.GET_POSITION_RANK, [position]);
  const currentRank = rankRows[0]?.rank;
  if (!currentRank) return [];

  const minRank = Math.max(1, currentRank - 3);
  const maxRank = currentRank - 1;
  if (minRank > maxRank) return [];

  const [rows] = await db.execute(queries.GET_SUPERVISORS_BY_POSITION, [
    department_id || null,
    minRank,
    maxRank,
  ]);

  return rows;
};

exports.assignSupervisor = async (employeeId, supervisorId, startDate) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // 1) close existing
    await conn.execute(queries.UPDATE_SUPERVISOR_ASSIGNMENT_END, [
      startDate,
      employeeId,
    ]);
    // 2) add new
    const [addRes] = await conn.execute(queries.ADD_SUPERVISOR_ASSIGNMENT, [
      employeeId,
      supervisorId,
      startDate,
    ]);
    await conn.commit();
    return { assignment_id: addRes.insertId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.getSupervisorHistory = async (employeeId) => {
  const [rows] = await db.execute(queries.GET_SUPERVISOR_HISTORY, [employeeId]);
  return rows;
};
