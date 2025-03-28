const db = require("../config");
const queries = require("../constants/empDetailsQueries");
const sgMail = require("@sendgrid/mail");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Generate a password reset token, store it, and send a reset link to the employee.
 */
const sendResetEmail = async (employeeEmail) => {
  // Generate a unique reset token
  const resetToken = uuidv4();
  // Create the reset link
  const resetLink = `${process.env.FRONTEND_URL}/ResetPassword?token=${resetToken}`;
  // Set the token expiry to 3 days
  const tokenExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  // Save the reset token and its expiry into the database
  await db.execute(queries.SAVE_RESET_TOKEN, [
    employeeEmail,
    resetToken,
    tokenExpiry,
  ]);

  // Prepare the email message with a blue clickable link and updated expiry info
  const msg = {
    to: employeeEmail,
    from: process.env.SENDGRID_SENDER_EMAIL,
    subject: "Password Reset Link - Welcome to Our Company",
    text: `Welcome to the company! Please reset your password using the link below:\n${resetLink}\n\nThis link is valid for 3 days.`,
    html: `<p>Welcome to the company!</p>
           <p>Please reset your password using the link below:</p>
           <a href="${resetLink}" style="color: blue; text-decoration: underline;">Reset Password</a>
           <p>This link is valid for 3 days.</p>`,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    throw new Error(
      `Error sending email: ${error.response.body.errors[0].message}`
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
  await sendResetEmail(employeeData.email);

  return result;
};

/**
 * Edit employee details with safety checks for SQL injection.
 */
exports.editEmployee = async (employeeId, updatedData) => {
  const params = [];
  const updates = [];

  // Check if department needs to be updated and get the department ID by name
  if (updatedData.department) {
    if (updatedData.role !== "Admin") {
      const [departmentResult] = await db.execute(
        queries.GET_DEPARTMENT_ID_BY_NAME,
        [updatedData.department]
      );
      if (departmentResult.length === 0) {
        throw new Error("Department not found");
      }
      updatedData.department_id = departmentResult[0].id;
      updates.push("department_id = ?");
      params.push(updatedData.department_id);
    } else {
      // If Admin, remove the department_id to avoid updating it
      delete updatedData.department_id;
    }
  }

  if (updatedData.domain) {
    updates.push("domain = ?");
    params.push(updatedData.domain);
  }
  if (updatedData.employee_type) {
    updates.push("employee_type = ?");
    params.push(updatedData.employee_type);
  }
  if (updatedData.first_name) {
    updates.push("first_name = ?");
    params.push(updatedData.first_name);
  }
  if (updatedData.last_name) {
    updates.push("last_name = ?");
    params.push(updatedData.last_name);
  }
  if (updatedData.email) {
    updates.push("email = ?");
    params.push(updatedData.email);
  }
  if (updatedData.phone_number) {
    updates.push("phone_number = ?");
    params.push(updatedData.phone_number);
  }
  if (updatedData.dob) {
    updates.push("dob = ?");
    params.push(updatedData.dob);
  }
  if (updatedData.address) {
    updates.push("address = ?");
    params.push(updatedData.address);
  }
  if (updatedData.aadhaar_number) {
    updates.push("aadhaar_number = ?");
    params.push(updatedData.aadhaar_number);
  }
  if (updatedData.pan_number) {
    updates.push("pan_number = ?");
    params.push(updatedData.pan_number);
  }
  if (updatedData.position) {
    updates.push("position = ?");
    params.push(updatedData.position);
  }
  if (updatedData.photo_url) {
    updates.push("photo_url = ?");
    params.push(updatedData.photo_url);
  }
  if (updatedData.salary) {
    updates.push("salary = ?");
    params.push(updatedData.salary);
  }
  if (updatedData.role) {
    updates.push("role = ?");
    params.push(updatedData.role);
  }
  if (updatedData.father_name) {
    updates.push("father_name = ?");
    params.push(updatedData.father_name);
  }
  if (updatedData.mother_name) {
    updates.push("mother_name = ?");
    params.push(updatedData.mother_name);
  }
  if (updatedData.gender) {
    updates.push("gender = ?");
    params.push(updatedData.gender);
  }
  if (updatedData.marital_status) {
    updates.push("marital_status = ?");
    params.push(updatedData.marital_status);
  }
  if (updatedData.spouse_name) {
    updates.push("spouse_name = ?");
    params.push(updatedData.spouse_name);
  }
  if (updatedData.marriage_date) {
    updates.push("marriage_date = ?");
    params.push(updatedData.marriage_date);
  }

  if (updates.length === 0) {
    throw new Error("No fields provided to update.");
  }

  params.push(employeeId);

  const sqlQuery = `
    UPDATE employees
    SET ${updates.join(", ")}
    WHERE employee_id = ?`;

  try {
    const [result] = await db.execute(sqlQuery, params);
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
