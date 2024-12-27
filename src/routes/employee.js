const express = require('express');
const router = express.Router();
const employeeHandler = require('../handlers/employeeHandler');

// Define routes
router.post('/admin/employees', employeeHandler.addEmployee);
router.get('/admin/employees', employeeHandler.searchEmployees);
router.put('/admin/employees/:employeeId', employeeHandler.editEmployee);
router.delete('/admin/employees/:employeeId', employeeHandler.deleteEmployee);
router.get('/employee/profile/:employeeId', employeeHandler.getEmployee);

module.exports = router;
