const express = require("express");
const { getConfig } = require("../handlers/configHandler");

const router = express.Router();

router.get("/config", getConfig);

module.exports = router;