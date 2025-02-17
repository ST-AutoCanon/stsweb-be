const express = require('express');
const router = express.Router();
const employeeQueries = require('../handlers/employeeQueries');

// Employee routes
router.post('/addquery', employeeQueries.addQuery);
router.get('/emp/:sender_id', employeeQueries.getQueriesByEmployee);

// Admin routes
router.get('/all', employeeQueries.getAllQueries);
router.post('/adminreply', employeeQueries.addAdminReply);

module.exports = router;
