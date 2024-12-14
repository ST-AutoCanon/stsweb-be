const express = require('express');
const { getEmployeeProfileHandler } = require('../handlers/profileHandler');

const router = express.Router();

// Route to get employee profile
//http://localhost:5000/employee/profile?id=STS001
router.get('/profile', getEmployeeProfileHandler);

module.exports = router;
