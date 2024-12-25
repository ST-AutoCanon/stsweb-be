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
      // Dynamically check the user's role
      const userRole = req.user.role;

      const allowedRoles = ['Admin'];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json(ErrorHandler.generateErrorResponse(403, `Forbidden: Your role (${userRole}) does not have permission to access this resource.`));
      }

      // Extract query parameters and default them to empty strings if not provided
      const { status = '', search = '' } = req.query;

      // Fetch leave queries from the service layer
      const leaveQueries = await LeaveService.getLeaveQueries({ status, search });

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: leaveQueries,
      });
    } catch (err) {
      console.log("Error in LeaveHandler.getLeaveQueries:", err); // Add logging for debugging
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, err.message));
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
      // Dynamically check the user's role
      const userRole = req.user.role;

      const allowedRoles = ['Admin'];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json(ErrorHandler.generateErrorResponse(403, `Forbidden: Your role (${userRole}) does not have permission to access this resource.`));
      }

      const { leaveId } = req.params;
      const { status, rejectionReason } = req.body;

      // Ensure a valid status is provided
      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(403).json(ErrorHandler.generateErrorResponse(403, "Invalid status. Status must be 'Approved' or 'Rejected'."));
      }

      // Require a rejection reason if status is 'Rejected'
      if (status === "Rejected" && !rejectionReason) {
        return res.status(400).json(ErrorHandler.generateErrorResponse(400, "Rejection reason is required when rejecting a leave request."));
      }

      // Update leave request using the service layer
      await LeaveService.updateLeaveRequest({
        leaveId,
        status,
        rejectionReason: rejectionReason || null,
      });

      return res.status(200).json(ErrorHandler.generateSuccessResponse(`Leave request ${status.toLowerCase()} successfully.`));
  
    } catch (err) {
      console.log("Error in LeaveHandler.updateLeaveRequest:", err); // Add logging for debugging
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, err.message));
    }
  }
}

module.exports = LeaveHandler;
