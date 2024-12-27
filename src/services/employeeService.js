const db = require('../config');
const queries = require('../constants/queries');
const sgMail = require('@sendgrid/mail');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Generate a password reset token, store it, and send a reset link to the employee.
 */
const sendResetEmail = async (employeeEmail) => {
  const resetToken = uuidv4(); // Generate a unique reset token
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  // Save reset token to database
  await db.execute(queries.SAVE_RESET_TOKEN, [employeeEmail, resetToken]);

  // Email content
  const msg = {
    to: employeeEmail,
    from: process.env.SENDGRID_SENDER_EMAIL, // Verified sender email
    subject: 'Password Reset Link - Welcome to Our Company',
    text: `Welcome to the company! Please reset your password using the link below:\n${resetLink}\n\nThis link is valid for 1 hour.`,
    html: `<p>Welcome to the company!</p>
           <p>Please reset your password using the link below:</p>
           <a href="${resetLink}">Reset Password</a>
           <p>This link is valid for 1 hour.</p>`,
  };

  try {
    // Send email
    await sgMail.send(msg);
  } catch (error) {
    throw new Error(`Error sending email: ${error.response.body.errors[0].message}`);
  }
};


/**
 * Add a new employee and send a password reset email.
 */
exports.addEmployee = async (employeeData) => {
  // Fetch department_id based on department name
  const [departmentResult] = await db.execute(queries.GET_DEPARTMENT_ID_BY_NAME, [employeeData.department]);
  if (departmentResult.length === 0) {
    throw new Error('Department not found');
  }
  const departmentId = departmentResult[0].id; // Use the id from the query result

  // Function to generate a random temporary password (12 characters long)
  const generateTemporaryPassword = () => {
    return crypto.randomBytes(6).toString('hex'); // Generates a 12-character password
  };

  const temporaryPassword = generateTemporaryPassword();

  const hashedPassword = await bcrypt.hash(temporaryPassword, 10); // Hash the password before storing

  // Prepare params for inserting employee data into the database
  const params = [
    employeeData.first_name || '',
    employeeData.last_name || '',
    employeeData.dob || null,
    employeeData.email || '',
    employeeData.aadhaar_number || null,
    employeeData.pan_number || null,
    employeeData.address || '',
    employeeData.phone_number || '',
    employeeData.father_name || null,
    employeeData.mother_name || null,
    employeeData.department || '',
    departmentId,  // Use department_id from the department query result
    employeeData.position || '',
    employeeData.photo_url || null,
    employeeData.salary || null,
    employeeData.role || '',
    hashedPassword // Insert the hashed temporary password into the database
  ];

  // Add the employee to the database
  const [result] = await db.execute(queries.ADD_EMPLOYEE, params);

  // Send the password reset email after adding the employee
  await sendResetEmail(employeeData.email); // Pass only the email to the reset email function

  return result; // Return result (employee added)
};

/**
 * Service to search employees based on search criteria.
 */
exports.searchEmployees = async (search) => {
  try {
    let query;
    let params = [];

    if (search) {
      // If search is provided, use the search query
      query = queries.SEARCH_EMPLOYEES;
      params = [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`];
    } else {
      // Otherwise, fetch all employees
      query = queries.GET_ALL_EMPLOYEES;
    }

    // Execute the query and return the results
    const [rows] = await db.execute(query, params);
    return rows;
  } catch (error) {
    throw new Error('Error fetching employees from database');
  }
};

/**
 * Edit employee details.
 */
exports.editEmployee = async (employeeId, updatedData) => {
  const params = [];
  const updates = [];

  // Add parameters dynamically based on the provided data
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
  if (updatedData.department) {
    updates.push("department = ?");
    params.push(updatedData.department);
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

  // Always add the employeeId as the final parameter
  params.push(employeeId);

  // Dynamically construct the query
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
 * Delete an employee by employee_id.
 */
exports.deleteEmployee = async (employeeId) => {
  // Check if employee exists
  const [employee] = await db.execute(queries.GET_EMPLOYEE_BY_ID, [employeeId]);
  if (employee.length === 0) {
    throw new Error(`Employee with ID ${employeeId} does not exist.`);
  }

  // Delete employee
  const [result] = await db.execute(queries.DELETE_EMPLOYEE, [employeeId]);

  console.log(`Employee with ID ${employeeId} has been deleted.`);
  return result;
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