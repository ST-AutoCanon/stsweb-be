const express = require("express");
const ForgotPasswordHandler = require("../handlers/forgotPasswordHandler");
const router = express.Router();


router.post("/forgot-password", ForgotPasswordHandler.forgotPassword);

module.exports = router;
