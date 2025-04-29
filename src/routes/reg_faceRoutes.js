const express = require("express");
const router = express.Router();
const { handleCheckFaceRegistered } = require("../handlers/reg_faceHandler");

router.get("/check-face-registered/:employee_id", handleCheckFaceRegistered);

module.exports = router;

