const sgMail = require("@sendgrid/mail");
const { v4: uuidv4 } = require("uuid");

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

if (!process.env.SENDGRID_API_KEY) {
  console.warn("[mailer] WARNING: SENDGRID_API_KEY is not set.");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function sendWithRetries(msg, retries = MAX_RETRIES) {
  let attempt = 0;
  let lastErr = null;
  while (attempt <= retries) {
    try {
      attempt++;
      await sgMail.send(msg);
      return;
    } catch (err) {
      lastErr = err;
      const isTransient =
        err.code === "ECONNRESET" ||
        err.code === "ECONNREFUSED" ||
        (err.response && err.response.status >= 500);
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

async function sendResetEmail(employeeEmail, employeeName) {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured");
  }
  if (!process.env.SENDGRID_SENDER_EMAIL) {
    throw new Error("SENDGRID_SENDER_EMAIL not configured");
  }

  const resetToken = uuidv4();
  const resetLink = `${process.env.FRONTEND_URL}/ResetPassword?token=${resetToken}`;
  const tokenExpiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

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

  await sendWithRetries(msg);

  return { resetToken, tokenExpiry, resetLink };
}

module.exports = { sendResetEmail, sendWithRetries };
