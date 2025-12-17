const crypto = require("crypto");
const nodemailer = require("nodemailer");
const {
  saveResetToken,
  getEmployeeByEmail,
} = require("../services/forgotPasswordService");
const ErrorHandler = require("../utils/errorHandler");

if (!process.env.SMTP_HOST)
  console.warn("[mailer] WARNING: SMTP_HOST is not set.");
if (!process.env.SMTP_USER)
  console.warn("[mailer] WARNING: SMTP_USER is not set.");
if (!process.env.SMTP_PASS)
  console.warn("[mailer] WARNING: SMTP_PASS is not set.");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function sendWithRetries(mailOptions, retries = MAX_RETRIES) {
  let attempt = 0;
  let lastErr = null;

  while (attempt <= retries) {
    try {
      attempt++;
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (err) {
      lastErr = err;
      const isTransient =
        err &&
        (err.code === "ECONNRESET" ||
          err.code === "ECONNREFUSED" ||
          (err.response && err.response.status >= 500));
      if (!isTransient || attempt > retries) break;

      const wait = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[mailer] transient mail error (attempt ${attempt}). retrying in ${wait}ms`,
        err && err.message ? err.message : err
      );
      await sleep(wait);
    }
  }

  throw lastErr;
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const employee = await getEmployeeByEmail(email);
    if (!employee) {
      console.warn("No active user found for:", email);
      const notFound = ErrorHandler.generateErrorResponse(
        404,
        "No active account found with that email."
      );
      return res.status(404).json(notFound);
    }

    const userName =
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
      "User";

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    await saveResetToken(email, resetToken, tokenExpiry);

    const resetLink = `${process.env.FRONTEND_URL}/ResetPassword?token=${resetToken}`;

    const mailOptions = {
      to: email,
      from: `"SUKALPA TECH SOLUTIONS" <${process.env.SMTP_USER}>`,
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

    try {
      await sendWithRetries(mailOptions);
    } catch (mailErr) {
      console.error(
        "SMTP send failed:",
        mailErr && (mailErr.response || mailErr)
      );
      throw ErrorHandler.generateErrorResponse(
        502,
        "Failed to send reset email. Please try again later."
      );
    }

    const successResponse = ErrorHandler.generateSuccessResponse(200, {
      message: "Password reset link has been sent to your email.",
    });
    res.status(200).json(successResponse);
  } catch (err) {
    console.error("Forgot password error:", err);

    if (err && err.statusCode) {
      return res.status(err.statusCode).json(err);
    }

    const serverError = ErrorHandler.generateErrorResponse(
      500,
      "An internal error occurred. Please try again later."
    );
    return res.status(500).json(serverError);
  }
};
