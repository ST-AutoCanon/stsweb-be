const express = require('express');
const router = express.Router();
const { fetchAttendanceExcelData } = require('../handlers/emp_excelsheetHandler');

router.get('/employeelogin/punches', fetchAttendanceExcelData);
router.get('/emp-excelsheet', fetchAttendanceExcelData);

module.exports = router;
