const express = require('express');
const router = express.Router();
const employeeHandler = require('../handlers/employeeHandler');

// Define routes
router.post('/admin/employees', employeeHandler.addEmployee);
router.get('/admin/employees', employeeHandler.searchEmployees);
router.put('/admin/employees/:employeeId', employeeHandler.editEmployee);
router.put('/admin/employees/:employeeId/deactivate', employeeHandler.deactivateEmployee);
router.get('/employee/:employeeId', employeeHandler.getEmployee);

module.exports = router;
