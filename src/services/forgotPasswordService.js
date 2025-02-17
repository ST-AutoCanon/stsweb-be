const db = require("../config");
const queries = require("../constants/queries");
const ErrorHandler = require("../utils/errorHandler");

/**
 * Retrieves employee details by email.
 * @param {string} email - The email to search for.
 * @returns {Promise<object|null>} - The employee details or null if not found.
 */
exports.getEmployeeByEmail = async (email) => {
  try {
    const [rows] = await db.query(queries.GET_EMPLOYEE_BY_EMAIL, [email]);
    return rows.length ? rows[0] : null;
  } catch (error) {
    console.error('Error retrieving employee by email:', error);
    throw ErrorHandler.generateErrorResponse(500, 'Internal server error while retrieving employee.');
  }
};

/**
 * Saves the reset token and expiry time in the database.
 * @param {string} email - The employee's email.
 * @param {string} resetToken - The reset token to save.
 * @param {Date} expiryTime - The expiry time of the token.
 * @returns {Promise<void>}
 */
exports.saveResetToken = async (email, resetToken, expiryTime) => {
  try {
    await db.query(queries.SAVE_RESET_TOKEN, [email, resetToken, expiryTime]);
  } catch (error) {
    console.error('Error saving reset token:', error);
    throw ErrorHandler.generateErrorResponse(500, 'Internal server error while saving reset token.');
  }
};
