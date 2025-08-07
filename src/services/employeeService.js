const db = require("../config");
const queries = require("../constants/empDetailsQueries");
const sgMail = require("@sendgrid/mail");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

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
      data.tenth_institution,
      data.tenth_year,
      data.tenth_board,
      data.tenth_score,
      data.tenth_cert_url || null,
      data.twelfth_institution,
      data.twelfth_year,
      data.twelfth_board,
      data.twelfth_score,
      data.twelfth_cert_url || null,
      data.ug_institution || null,
      data.ug_year || null,
      data.ug_board || null,
      data.ug_score || null,
      data.ug_cert_url || null,
      data.pg_institution || null,
      data.pg_year || null,
      data.pg_board || null,
      data.pg_score || null,
      data.pg_cert_url || null,
    ]);

    if (Array.isArray(data.additional_certs)) {
      for (let cert of data.additional_certs) {
        await conn.execute(queries.ADD_EMPLOYEE_ADDITIONAL_CERT, [
          eid,
          cert.name,
          cert.institution,
          cert.year,
          (cert.file_urls || []).join(","),
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
      data.resume_url || null,
    ]);

    console.log("[addFullEmployee] inserting other document records");
    if (Array.isArray(data.other_docs_urls)) {
      for (let url of data.other_docs_urls) {
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
      // first, optionally clean up any old rows if editing
      // await conn.execute(queries.UPDATE_EMPLOYEE_EXP, [eid]);

      for (let exp of data.experience) {
        const docUrl =
          Array.isArray(exp.doc_urls) && exp.doc_urls.length
            ? exp.doc_urls[0]
            : null;
        await conn.execute(queries.ADD_EMPLOYEE_EXP, [
          eid || null,
          exp.company || null,
          exp.role || null,
          exp.start_date || null,
          exp.end_date || null,
          docUrl,
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

// services/employeeService.js
exports.editFullEmployee = async (data) => {
  console.log("[editFullEmployee] ⇒ start", { employee_id: data.employee_id });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    console.log("[editFullEmployee] began transaction");

    // 1) Core update (all employees columns except password)
    console.log("[editFullEmployee] updating core employee fields");
    await conn.execute(queries.UPDATE_EMPLOYEE_CORE, [
      data.first_name,
      data.last_name,
      data.email,
      data.phone_number,
      data.dob,
      data.employee_id,
    ]);

    // 2) Personal
    console.log("[editFullEmployee] updating personal details");
    await conn.execute(queries.UPDATE_EMPLOYEE_PERSONAL, [
      data.address || null,
      data.father_name || null,
      data.mother_name || null,
      data.gender || null,
      data.marital_status || null,
      data.spouse_name || null,
      data.spouse_dob || null,
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
      data.employee_id,
    ]);

    // 3) Education
    console.log("[editFullEmployee] updating education details");
    await conn.execute(queries.UPDATE_EMPLOYEE_EDU, [
      data.tenth_institution,
      data.tenth_year,
      data.tenth_board,
      data.tenth_score,
      data.tenth_cert_url,
      data.twelfth_institution,
      data.twelfth_year,
      data.twelfth_board,
      data.twelfth_score,
      data.twelfth_cert_url,
      data.ug_institution || null,
      data.ug_year || null,
      data.ug_board || null,
      data.ug_score || null,
      data.ug_cert_url || null,
      data.pg_institution || null,
      data.pg_year || null,
      data.pg_board || null,
      data.pg_score || null,
      data.pg_cert_url || null,
      data.employee_id,
    ]);

    // 4) Professional
    console.log("[editFullEmployee] updating professional details");
    await conn.execute(queries.UPDATE_EMPLOYEE_PRO, [
      data.domain,
      data.employee_type || null,
      data.joining_date || null,
      data.role,
      data.department_id || null,
      data.position || null,
      data.supervisor_id || null,
      data.salary,
      data.resume_url,
      data.employee_id,
    ]);

    console.log("[editFullEmployee] updating bank details");
    const fullName = `${data.first_name} ${data.last_name}`.trim();
    await conn.execute(queries.UPDATE_EMPLOYEE_BANK, [
      fullName,
      data.bank_name,
      data.account_number,
      data.ifsc_code,
      data.branch_name,
      data.employee_id,
    ]);

    await conn.execute(queries.DELETE_CERT_FILES, [data.employee_id]);

    if (Array.isArray(data.additional_certs)) {
      for (let idx = 0; idx < data.additional_certs.length; idx++) {
        const cert = data.additional_certs[idx];
        if (Array.isArray(cert.file_urls)) {
          for (let url of cert.file_urls) {
            await conn.execute(queries.ADD_CERT_FILE, [
              data.employee_id,
              idx,
              url,
            ]);
          }
        }
      }
    }

    // --- experience entries & files ---
    // delete old experience rows & files
    await conn.execute(queries.UPDATE_EMPLOYEE_EXP, [data.employee_id]);
    // now re‐insert the experience rows
    for (let ix = 0; ix < data.experience.length; ix++) {
      const exp = data.experience[ix];
      const docUrl =
        Array.isArray(exp.doc_urls) && exp.doc_urls.length
          ? exp.doc_urls[0]
          : null;
      const [expRes] = await conn.execute(queries.ADD_EMPLOYEE_EXP, [
        data.employee_id,
        exp.company,
        exp.role,
        exp.start_date,
        exp.end_date,
        docUrl,
      ]);
      // delete & re‐insert files for this exp record if you have a separate table
      if (Array.isArray(exp.doc_urls)) {
        // remove any old files for this record
        await conn.execute(queries.DELETE_EXP_FILES, [data.employee_id, ix]);
        for (let fileUrl of exp.doc_urls) {
          await conn.execute(queries.ADD_EXP_FILE, [
            data.employee_id,
            ix,
            fileUrl,
          ]);
        }
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.getFullEmployee = async (employeeId) => {
  const [rows] = await db.execute(queries.GET_FULL_EMPLOYEE, [employeeId]);
  if (!rows.length) throw new Error("Not found");
  return rows[0];
};

// for supervisor dropdown
exports.listSupervisors = async () => {
  const [rows] = await db.execute(queries.GET_SUPERVISORS);
  return rows;
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
