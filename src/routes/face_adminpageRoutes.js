// routes/face_adminpageRoutes.js
const express = require("express");
const router = express.Router();
const { handleFacePunch } = require("../handlers/face_adminpageHandler");

// Route to handle face recognition for punch-in/punch-out
router.post("/", handleFacePunch);

module.exports = router;
