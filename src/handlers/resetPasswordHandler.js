const bcrypt = require('bcrypt');
const { verifyResetToken, updateEmployeePassword } = require('../services/resetPasswordService');
const ErrorHandler = require("../utils/errorHandler");

/**
 * @param {object} req - The HTTP request object containing the reset token and new password.
 * @param {object} res - The HTTP response object used to send the response to the client.
 */
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    // 1. Verify the reset token
    const employeeEmail = await verifyResetToken(resetToken);

    if (!employeeEmail) {
      const errorResponse = ErrorHandler.generateErrorResponse(400, 'Invalid or expired token.');
      return res.status(400).json(errorResponse);
    }

    // 2. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update the password in the database
    await updateEmployeePassword(employeeEmail, hashedPassword);

    const successResponse = ErrorHandler.generateSuccessResponse({
      message: 'Password reset successful. You can now log in with your new password.'
    });
    res.status(200).json(successResponse);
  } catch (error) {
    // Log the error details
    console.error('Error resetting password:', error);

    const errorResponse = ErrorHandler.generateErrorResponse(
      500,
      'An error occurred while resetting your password.'
    );
    res.status(500).json(errorResponse);
  }
};
