const express = require("express");
const PasswordResetHandler = require("../handlers/resetPasswordHandler");
const router = express.Router();

/**
 * @route POST /admin/password-reset
 * @desc Verify reset token and update employee's password
 * @param {string} resetToken - The reset token to verify
 * @param {string} hashedPassword - The new password to set for the employee
 * @access Admin Only
 */
router.post("/password-reset", PasswordResetHandler.resetPassword);

module.exports = router;
