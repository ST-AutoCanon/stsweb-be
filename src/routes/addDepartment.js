const express = require('express');
const { addDepartmentHandler, getDepartmentsHandler } = require('../handlers/addDepartment');
const router = express.Router();

router.post('/departments/add', addDepartmentHandler);
router.get('/departments', getDepartmentsHandler);

module.exports = router;
