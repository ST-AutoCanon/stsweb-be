const db = require('../config');
const queries = require('../constants/empDetailsQueries');
const sgMail = require('@sendgrid/mail');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Generate a password reset token, store it, and send a reset link to the employee.
 */
const sendResetEmail = async (employeeEmail) => {
  const resetToken = uuidv4();
  const resetLink = `${process.env.FRONTEND_URL}/ResetPassword?token=${resetToken}`;

  await db.execute(queries.SAVE_RESET_TOKEN, [employeeEmail, resetToken]);

  const msg = {
    to: employeeEmail,
    from: process.env.SENDGRID_SENDER_EMAIL,
    subject: 'Password Reset Link - Welcome to Our Company',
    text: `Welcome to the company! Please reset your password using the link below:\n${resetLink}\n\nThis link is valid for 1 hour.`,
    html: `<p>Welcome to the company!</p>
           <p>Please reset your password using the link below:</p>
           <a href="${resetLink}" style="color: blue; text-decoration: underline;">Reset Password</a>
           <p>This link is valid for 1 hour.</p>`,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    throw new Error(`Error sending email: ${error.response.body.errors[0].message}`);
  }
};

/**
 * Update Employee Photo.
 */
exports.updateEmployeePhoto = async (employeeId, photoUrl) => {
  try {
    // Validate inputs to prevent SQL injection
    if (!employeeId || !photoUrl) {
      throw new Error('Invalid input');
    }

    // Parameterized query to prevent SQL injection
    const [result] = await db.execute(
      queries.UPDATE_EMPLOYEE_PHOTO,
      [photoUrl, employeeId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Employee not found');
    }

    return { message: 'Employee photo updated successfully' };
  } catch (error) {
    console.error('Error in updateEmployeePhoto:', error.message);
    throw error;
  }
};

/**
 * Add a new employee and send a password reset email.
 */
exports.addEmployee = async (employeeData) => {
  let departmentId = null;

  if (employeeData.role !== 'Admin') {
    const [departmentResult] = await db.execute(queries.GET_DEPARTMENT_ID_BY_NAME, [employeeData.department]);
    if (departmentResult.length === 0) {
      throw new Error('Department not found');
    }
    departmentId = departmentResult[0].id;
  }

  const generateTemporaryPassword = () => {
    return crypto.randomBytes(6).toString('hex');
  };

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  const params = [
    employeeData.first_name || '',
    employeeData.last_name || '',
    employeeData.dob || '',
    employeeData.email || '',
    employeeData.aadhaar_number || '',
    employeeData.pan_number || '',
    employeeData.gender || '',
    employeeData.marital_status || '',
    employeeData.spouse_name || '',
    employeeData.marriage_date || null,
    employeeData.address || null,
    employeeData.phone_number || '',
    employeeData.father_name || null,
    employeeData.mother_name || null,
    departmentId,
    employeeData.position || null,
    employeeData.photo_url || null,
    employeeData.salary || null,
    employeeData.role || null,
    hashedPassword
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

  if (updatedData.department) {
    const [departmentResult] = await db.execute(queries.GET_DEPARTMENT_ID_BY_NAME, [updatedData.department]);
    if (departmentResult.length === 0) {
      throw new Error('Department not found');
    }
    updatedData.department_id = departmentResult[0].id;
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
  if (updatedData.department_id) {
    updates.push("department_id = ?");
    params.push(updatedData.department_id);
  }
  if (updatedData.father_name) {
    updates.push("father_name = ?");
    params.push(updatedData.father_name);
  }
  if (updatedData.mother_name) {
    updates.push("mother_name = ?");
    params.push(updatedData.mother_name);
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
    let query;
    let params = [];

    if (search) {
      query = queries.SEARCH_EMPLOYEES;
      params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
    } else {
      query = queries.GET_ALL_EMPLOYEES;
    }

    if (fromDate) {
      query += ' AND created_at >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND created_at <= ?';
      params.push(toDate);
    }

    console.log('Executing query:', query);
    console.log('With params:', params);

    const [rows] = await db.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Error fetching employees from database:', error);
    throw new Error('Error fetching employees from database');
  }
};


/**
 * Deactivate an employee by setting status to 'Inactive'.
 */
exports.deactivateEmployee = async (employeeId) => {
  try {
    const [result] = await db.execute(queries.UPDATE_EMPLOYEE_STATUS, [employeeId]);

    if (result.affectedRows === 0) {
      throw new Error('Employee not found or already deactivated');
    }

    return { message: 'Employee deactivated successfully' };
  } catch (error) {
    console.error('Error in deactivateEmployee:', error.message);
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
      throw new Error('Employee not found');
    }

    return rows[0];
  } catch (error) {
    console.error('Error in getEmployee:', error.message);
    throw error;
  }
};