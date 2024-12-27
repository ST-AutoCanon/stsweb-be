const express = require("express");
const PasswordResetHandler = require("../handlers/resetPasswordHandler");
const router = express.Router();


router.post("/password-reset", PasswordResetHandler.resetPassword);

module.exports = router;
