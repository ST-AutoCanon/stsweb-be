const express = require('express');
const { submitLeaveRequestHandler, getLeaveRequestsHandler } = require('../handlers/leaveHandlers');

const router = express.Router();

/**
 * @route POST /employee/leave
 * @description Submits a leave request
 * @params req { body: { employeeId, startDate, endDate, reason } }
 * @params res { message: string, leaveRequest: object }
 */
//http://localhost:3000/employee/leave

/*
{
  "employeeId": "STS002",
  "startDate": "2024-12-10",
  "endDate": "2024-12-15",
  "reason": "Family Vacation",
  "leavetype": "Vacation"
}

*/
router.post('/leave', submitLeaveRequestHandler);

/**
 * @route GET /employee/leave
 * @description Retrieves leave requests for an employee
 * @params req { query: { employeeId } }
 * @params res { leaveRequests: array }
 */
//http://localhost:3000/employee/leave?employeeId=STS003
router.get('/leave', getLeaveRequestsHandler);

module.exports = router;
