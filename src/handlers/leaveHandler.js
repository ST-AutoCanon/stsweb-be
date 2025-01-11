const LeaveService = require("../services/leaveService");
const ErrorHandler = require("../utils/errorHandler");

class LeaveHandler {
  /**
   * Fetch leave queries with optional filtering and search.
   *
   * @param {Object} req - HTTP request object.
   * @param {Object} res - HTTP response object.
   */
  static async getLeaveQueries(req, res) {
    try {
      const userRole = req.user.role;
      const allowedRoles = ["Admin"];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json(
          ErrorHandler.generateErrorResponse(
            403,
            `Forbidden: Your role (${userRole}) does not have permission to access this resource.`
          )
        );
      }

      const { status = "", search = "" } = req.query;
      const leaveQueries = await LeaveService.getLeaveQueries({ status, search });

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: leaveQueries,
      });
    } catch (err) {
      console.error("Error in LeaveHandler.getLeaveQueries:", err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, err.message));
    }
  }

  /**
   * Approve or reject a leave request.
   *
   * @param {Object} req - HTTP request object.
   * @param {Object} res - HTTP response object.
   */
  static async updateLeaveRequest(req, res) {
    try {
      const userRole = req.user.role;
      const allowedRoles = ["Admin"];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json(
          ErrorHandler.generateErrorResponse(
            403,
            `Forbidden: Your role (${userRole}) does not have permission to access this resource.`
          )
        );
      }

      const { leaveId } = req.params;
      const { status, rejectionReason } = req.body;

      if (!["Approved", "Rejected"].includes(status)) {
        return res
          .status(403)
          .json(
            ErrorHandler.generateErrorResponse(
              403,
              "Invalid status. Status must be 'Approved' or 'Rejected'."
            )
          );
      }

      if (status === "Rejected" && !rejectionReason) {
        return res
          .status(400)
          .json(
            ErrorHandler.generateErrorResponse(
              400,
              "Rejection reason is required when rejecting a leave request."
            )
          );
      }

      await LeaveService.updateLeaveRequest({
        leaveId,
        status,
        rejectionReason: rejectionReason || null,
      });

      return res
        .status(200)
        .json(
          ErrorHandler.generateSuccessResponse(
            `Leave request ${status.toLowerCase()} successfully.`
          )
        );
    } catch (err) {
      console.error("Error in LeaveHandler.updateLeaveRequest:", err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, err.message));
    }
  }

  /**
   * Submit a leave request.
   * @param {Object} req - HTTP request object.
   * @param {Object} res - HTTP response object.
   */
  static async submitLeaveRequestHandler(req, res) {
    try {
      const { employeeId, startDate, endDate, reason, leavetype } = req.body;
  
      if (!employeeId || !startDate || !endDate || !reason || !leavetype) {
        return res
          .status(400)
          .json(ErrorHandler.generateErrorResponse(400, "All fields are required."));
      }
  
      const leaveRequest = await LeaveService.submitLeaveRequest({
        employeeId,
        startDate,
        endDate,
        reason,
        leavetype,
      });
  
      return res
        .status(200)
        .json(
          ErrorHandler.generateSuccessResponse(
            "Leave request submitted successfully.",
            leaveRequest
          )
        );
    } catch (err) {
      console.error("Error in submitLeaveRequestHandler:", {
        error: err.message,
        body: req.body,
      });
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Failed to submit leave request."));
    }
  }
  
  

  /**
   * Retrieve leave requests for an employee.
   * @param {Object} req - HTTP request object.
   * @param {Object} res - HTTP response object.
   */
  static async getLeaveRequestsHandler(req, res) {
    try {
      const { employeeId } = req.query;

      if (!employeeId) {
        return res
          .status(400)
          .json(ErrorHandler.generateErrorResponse(400, "Employee ID is required."));
      }

      const leaveRequests = await LeaveService.getLeaveRequests(employeeId);

      return res
        .status(200)
        .json(
          ErrorHandler.generateSuccessResponse(
            "Leave requests fetched successfully.",
            leaveRequests
          )
        );
    } catch (err) {
      console.error("Error in getLeaveRequestsHandler:", err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Error fetching leave requests."));
    }
  }
}

module.exports = LeaveHandler;