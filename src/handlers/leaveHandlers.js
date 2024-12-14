

// Handlers
const { submitLeaveRequest, getLeaveRequests } = require('../services/leaveServices');

/**
 * @function submitLeaveRequestHandler
 * @description Handles submitting a leave request.
 * @param {object} req - Express request object containing leave request details.
 * @param {object} res - Express response object.
 */
async function submitLeaveRequestHandler(req, res) {
  try {
    const { employeeId, startDate, endDate, reason, leavetype} = req.body;

    // Validation
    if (!employeeId || !startDate || !endDate || !reason || !leavetype) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const leaveRequest = await submitLeaveRequest(employeeId, startDate, endDate, reason, leavetype);
    res.status(200).json({ message: 'Leave request submitted successfully.', leaveRequest });
  } catch (error) {
    console.error('Error in submitLeaveRequestHandler:', error);
    res.status(500).json({ message: 'Error submitting leave request.', error: error.message });
  }
}

/**
 * @function getLeaveRequestsHandler
 * @description Handles retrieving leave requests for an employee.
 * @param {object} req - Express request object containing employee ID.
 * @param {object} res - Express response object.
 */
async function getLeaveRequestsHandler(req, res) {
  try {
    const { employeeId } = req.query;

    // Validation
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required.' });
    }

    const leaveRequests = await getLeaveRequests(employeeId);
    res.status(200).json({ leaveRequests });
  } catch (error) {
    console.error('Error in getLeaveRequestsHandler:', error);
    res.status(500).json({ message: 'Error fetching leave requests.', error: error.message });
  }
}

module.exports = {
  submitLeaveRequestHandler,
  getLeaveRequestsHandler,
};

