const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { saveResetToken, getEmployeeByEmail } = require('../services/forgotPasswordService');
const ErrorHandler = require("../utils/errorHandler");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * @param {object} req - The HTTP request object containing the email.
 * @param {object} res - The HTTP response object used to send the response to the client.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1. Check if the email exists
    const employee = await getEmployeeByEmail(email);

    if (!employee) {
      const errorResponse = ErrorHandler.generateErrorResponse(404, 'Email not found.');
      return res.status(404).json(errorResponse);
    }

    // 2. Generate a unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600 * 1000); // Token valid for 1 hour

    // 3. Save the reset token and expiry in the password_resets table
    await saveResetToken(email, resetToken, tokenExpiry);

    // 4. Generate the reset link
    const resetLink = `${process.env.FRONTEND_URL}/ResetPassword?token=${resetToken}`;

    // 5. Send the reset link via email using SendGrid/////////////
    const emailContent = {
      to: email,
      from: process.env.SENDGRID_SENDER_EMAIL,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link is valid for 1 hour.`,
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a><p>This link is valid for 1 hour.</p>`,
    };

    await sgMail.send(emailContent);

    const successResponse = ErrorHandler.generateSuccessResponse(200, {
      message: 'Password reset link has been sent to your email.',
    });
    res.status(200).json(successResponse);
  } catch (error) {
    console.error('Error processing forgot password request:', error);

    const errorResponse = ErrorHandler.generateErrorResponse(
      500,
      'An error occurred while processing your request.'
    );
    res.status(500).json(errorResponse);
  }      
};
