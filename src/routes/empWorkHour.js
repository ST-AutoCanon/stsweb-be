

const express = require('express');
const router = express.Router();
const { getWorkHourSummaryHandler } = require('../handlers/empWorkHoursHandler');

router.get('/work-hour-summary/:employeeId', getWorkHourSummaryHandler);

module.exports = router;
