const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
const {
  saveResetToken,
  getEmployeeByEmail,
} = require("../services/forgotPasswordService");
const ErrorHandler = require("../utils/errorHandler");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * @param {object} req - The HTTP request object containing the email.
 * @param {object} res - The HTTP response object used to send the response to the client.
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Forgot password requested for:", email);

    // 1. Check if the email exists
    const employee = await getEmployeeByEmail(email);
    if (!employee) {
      console.warn("Email not found in database:", email);
      const errorResponse = ErrorHandler.generateErrorResponse(
        404,
        "Email not found."
      );
      return res.status(404).json(errorResponse);
    }

    const userName =
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
      "User";

    // 2. Generate a unique reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

    // 3. Save token to DB
    await saveResetToken(email, resetToken, tokenExpiry);
    console.log("Reset token saved for:", email);

    // 4. Prepare email
    const resetLink = `${process.env.FRONTEND_URL}/ResetPassword?token=${resetToken}`;
    const emailContent = {
      to: email,
      from: process.env.SENDGRID_SENDER_EMAIL,
      subject: "Reset Your Password",
      text: `Hi ${userName},

We received a request to reset the password for your account associated with this email address.

To reset your password, please click the link below:
${resetLink}

This link will expire in 3 days for your security.

If you did not request a password reset, you can safely ignore this email — no changes have been made to your account.

Thank you,
SUKALPA TECH SOLUTIONS
https://sukalpatechsolutions.com
info@sukalpatech.com`,
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>We received a request to reset the password for your account associated with this email address.</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </p>
          <p>This link will expire in <strong>3 days</strong> for your security.</p>
          <p>If you did not request a password reset, you can safely ignore this email — no changes have been made to your account.</p>
          <br/>
          <p>Thank you,<br/><strong>SUKALPA TECH SOLUTIONS</strong></p>
          <p><a href="https://sukalpatechsolutions.com">https://sukalpatechsolutions.com</a> | <a href="mailto:info@sukalpatech.com">info@sukalpatech.com</a></p>
        </div>
      `,
    };

    // 5. Send email
    await sgMail.send(emailContent);
    console.log("Reset email sent successfully to:", email);

    const successResponse = ErrorHandler.generateSuccessResponse(200, {
      message: "Password reset link has been sent to your email.",
    });
    res.status(200).json(successResponse);
  } catch (error) {
    console.error("Error processing forgot password request:", error);

    const errorResponse = ErrorHandler.generateErrorResponse(
      500,
      "An error occurred while processing your request."
    );
    res.status(500).json(errorResponse);
  }
};
