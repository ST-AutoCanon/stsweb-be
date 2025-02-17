const express = require("express");
const router = express.Router();
const LoginHandler = require("../handlers/loginHandler");

router.post("/login", LoginHandler.login);

module.exports = router;
