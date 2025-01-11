const express = require('express');
const {submitLeaveRequestHandler, getLeaveRequestsHandler} = require('../handlers/leaveHandler');
const LeaveHandler = require('../handlers/leaveHandler'); 
const router = express.Router();

router.post('/employee/leave', submitLeaveRequestHandler);
router.get('/employee/leave', getLeaveRequestsHandler);
router.get('/admin/leave', LeaveHandler.getLeaveQueries);
router.put('/admin/leave/:leaveId', LeaveHandler.updateLeaveRequest);

module.exports = router;
