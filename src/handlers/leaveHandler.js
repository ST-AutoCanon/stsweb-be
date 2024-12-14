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
      const { status, search } = req.query;

      // Fetch leave queries from the service layer
      const leaveQueries = await LeaveService.getLeaveQueries({ status, search });

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: leaveQueries,
      });
    } catch (err) {
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
      const { leaveId } = req.params;
      const { status, rejectionReason } = req.body;

      // Ensure a valid status is provided
      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Status must be 'Approved' or 'Rejected'.",
        });
      }

      // Require a rejection reason if status is 'Rejected'
      if (status === "Rejected" && !rejectionReason) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required when rejecting a leave request.",
        });
      }

      // Update leave request using the service layer
      await LeaveService.updateLeaveRequest({
        leaveId,
        status,
        rejectionReason: rejectionReason || null,
      });

      return res.status(200).json({
        success: true,
        message: `Leave request ${status.toLowerCase()} successfully.`,
      });
    } catch (err) {
      return res.status(500).json(ErrorHandler.generateErrorResponse(500, err.message));
    }
  }
}

module.exports = LeaveHandler;
