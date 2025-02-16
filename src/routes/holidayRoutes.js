const express = require("express");
const router = express.Router();
const holidayHandler = require("../handlers/holidayHandler");

router.get("/holidays", holidayHandler.getHolidays);

module.exports = router;
