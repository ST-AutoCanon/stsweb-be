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

/**
 * Update Employee Photo.
 */
exports.updateEmployeePhoto = async (employeeId, photoUrl) => {
  try {
    // Validate inputs to prevent SQL injection
    if (!employeeId || !photoUrl) {
      throw new Error("Invalid input");
    }

    // Parameterized query to prevent SQL injection
    const [result] = await db.execute(queries.UPDATE_EMPLOYEE_PHOTO, [
      photoUrl,
      employeeId,
    ]);

    if (result.affectedRows === 0) {
      throw new Error("Employee not found");
    }

    return { message: "Employee photo updated successfully" };
  } catch (error) {
    console.error("Error in updateEmployeePhoto:", error.message);
    throw error;
  }
};

exports.addEmployee = async (employeeData) => {
  let departmentId = null;

  if (employeeData.role !== "Admin") {
    const [departmentResult] = await db.execute(
      queries.GET_DEPARTMENT_ID_BY_NAME,
      [employeeData.department]
    );
    if (departmentResult.length === 0) {
      throw new Error("Department not found");
    }
    departmentId = departmentResult[0].id;
  }

  // Check for duplicate Aadhaar or PAN number
  const [existingEmployee] = await db.execute(
    queries.CHECK_DUPLICATE_EMPLOYEE,
    [employeeData.aadhaar_number, employeeData.pan_number]
  );

  if (existingEmployee.length > 0) {
    throw {
      code: "DUPLICATE_AADHAAR_PAN",
      message: "Aadhaar or PAN number already exists.",
    };
  }

  const generateTemporaryPassword = () => {
    return crypto.randomBytes(6).toString("hex");
  };

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  const params = [
    employeeData.domain || "",
    employeeData.employee_type || "",
    employeeData.first_name || "",
    employeeData.last_name || "",
    employeeData.dob || "",
    employeeData.email || "",
    employeeData.aadhaar_number || "",
    employeeData.pan_number || "",
    employeeData.gender || "",
    employeeData.marital_status || "",
    employeeData.spouse_name || "",
    employeeData.marriage_date || null,
    employeeData.address || null,
    employeeData.phone_number || "",
    employeeData.father_name || null,
    employeeData.mother_name || null,
    departmentId,
    employeeData.position || null,
    employeeData.photo_url || null,
    employeeData.salary || null,
    employeeData.role || null,
    hashedPassword,
  ];

  const [result] = await db.execute(queries.ADD_EMPLOYEE, params);
  await sendResetEmail(
    employeeData.email,
    `${employeeData.first_name} ${employeeData.last_name}`
  );

  return result;
};

/**
 * Edit employee details with safety checks for SQL injection.
 */
exports.editEmployee = async (employeeId, updatedData) => {
  let departmentId = null;

  // If a department is provided (for non-admin), fetch its ID.
  if (updatedData.department && updatedData.department.trim() !== "") {
    const [departmentResult] = await db.execute(
      queries.GET_DEPARTMENT_ID_BY_NAME,
      [updatedData.department]
    );
    if (departmentResult.length === 0) {
      throw new Error("Department not found");
    }
    departmentId = departmentResult[0].id;
  }

  // Build the params array in the order expected by the EDIT_EMPLOYEE query.
  const params = [
    updatedData.domain || "",
    updatedData.employee_type || "",
    updatedData.first_name || "",
    updatedData.last_name || "",
    updatedData.dob || "",
    updatedData.email || "",
    updatedData.aadhaar_number || "",
    updatedData.pan_number || "",
    updatedData.gender || "",
    updatedData.marital_status || "",
    updatedData.spouse_name || "",
    updatedData.marriage_date || null,
    updatedData.address || "",
    updatedData.phone_number || "",
    updatedData.father_name || "",
    updatedData.mother_name || "",
    departmentId, // department_id (or null if role is Admin or not provided)
    updatedData.position || "",
    updatedData.photo_url || "",
    updatedData.salary || "",
    updatedData.role || "",
    employeeId, // WHERE clause parameter
  ];

  try {
    const [result] = await db.execute(queries.EDIT_EMPLOYEE, params);
    return result;
  } catch (error) {
    console.error("Failed to update employee:", error);
    throw error;
  }
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
