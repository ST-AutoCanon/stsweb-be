const LeaveService = require("../services/leaveService");
const ErrorHandler = require("../utils/errorHandler");

class LeaveHandler {
  /**
   * Fetch leave queries with optional filtering, search, and date range.
   */
  static async getLeaveQueries(req, res) {
    try {
      

      const { status = "", search = "", from_date = "", to_date = "" } = req.query;

      if ((from_date && isNaN(Date.parse(from_date))) || (to_date && isNaN(Date.parse(to_date)))) {
        return res
          .status(400)
          .json(ErrorHandler.generateErrorResponse(400, "Invalid date format."));
      }

      const leaveQueries = await LeaveService.getLeaveQueries({
        status,
        search,
        from_date,
        to_date,
      });

      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: leaveQueries,
      });
    } catch (err) {
      console.log("Error in LeaveHandler.getLeaveQueries:", err);
      console.error("Error in LeaveHandler.getLeaveQueries:", err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Internal server error."));
    }
  }

  /**
   * Approve or reject a leave request.
   */
  static async updateLeaveRequest(req, res) {
    try {
     

      const { leaveId } = req.params;
      const { status, comments } = req.body;

      if (!["Approved", "Rejected"].includes(status)) {
        return res
          .status(400)
          .json(
            ErrorHandler.generateErrorResponse(
              400,
              "Invalid status. Status must be 'Approved' or 'Rejected'."
            )
          );
      }

      if (status === "Rejected" && !comments) {
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
        comments: comments || null,
      });

      return res.status(200).json(
        ErrorHandler.generateSuccessResponse(
          200,
          `Leave request ${status.toLowerCase()} successfully.`
        )
      );
    } catch (err) {
      console.error("Error in LeaveHandler.updateLeaveRequest:", err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, "Internal server error."));
    }
  }

  /**
   * Submit a leave request.
   */
  static async submitLeaveRequestHandler(req, res) {
    try {
      const { employeeId, reason, leavetype, h_f_day, startDate, endDate} = req.body;
      console.log("body", req.body);

      if (!employeeId || !startDate || !endDate || !h_f_day || !reason || !leavetype) {
        return res
          .status(400)
          .json(ErrorHandler.generateErrorResponse(400, "All fields are required."));
      }

      const leaveRequest = await LeaveService.submitLeaveRequest({
        employeeId,
        startDate,
        endDate,
        h_f_day,
        reason,
        leavetype,
      });

      return res.status(200).json(
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
   * Retrieve leave requests for an employee using route parameters and optional date filters.
   */
  static async getLeaveRequestsHandler(req, res) {
    try {
      const { employeeId } = req.params;
      const { from_date, to_date } = req.query;

      if (!employeeId) {
        return res
          .status(400)
          .json(ErrorHandler.generateErrorResponse(400, "Employee ID is required."));
      }

      const leaveRequests = await LeaveService.getLeaveRequests(employeeId, from_date, to_date);

      return res.status(200).json(
        ErrorHandler.generateSuccessResponse(200,
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

  /**
   * Edit a pending leave request.
   */
  static async editLeaveRequestHandler(req, res) {
    try {
      const { leaveId } = req.params;
  
console.log("Received leaveId:", leaveId);

      const { employeeId, startDate, endDate, h_f_day, reason, leavetype } = req.body;
      console.log("Request Body:", req.body);


      if (!leaveId || !employeeId || !startDate || !endDate || !h_f_day || !reason || !leavetype) {
        return res
          .status(400)
          .json(ErrorHandler.generateErrorResponse(400, "All fields are required."));
      }

      const updatedLeaveRequest = await LeaveService.editLeaveRequest({
        leaveId,
        employeeId,
        startDate,
        endDate,
        h_f_day,
        reason,
        leavetype,
      });

      return res.status(200).json(
        ErrorHandler.generateSuccessResponse(200,
          "Leave request updated successfully.",
          updatedLeaveRequest
        )
      );
    } catch (err) {
      console.error("Error in editLeaveRequestHandler:", err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, err.message));
    }
  }

  /**
   * Cancel a pending leave request.
   */
  static async cancelLeaveRequestHandler(req, res) {
    try {
      const { leaveId, employeeId } = req.params;

      if (!leaveId || !employeeId) {
        return res
          .status(400)
          .json(ErrorHandler.generateErrorResponse(400, "Leave ID and Employee ID are required."));
      }

      const message = await LeaveService.cancelLeaveRequest(leaveId, employeeId);

      return res.status(200).json(
        ErrorHandler.generateSuccessResponse(
          message
        )
      );
    } catch (err) {
      console.error("Error in cancelLeaveRequestHandler:", err);
      return res
        .status(500)
        .json(ErrorHandler.generateErrorResponse(500, err.message));
    }
  }

  static async getLeaveRequestsForTeamLeadHandler(req, res) {
    const { teamLeadId } = req.params;
    console.log("id:", teamLeadId);
    const filters = req.query;
  
    try {
      const leaveRequests = await LeaveService.getLeaveQueriesForTeamLead(filters, teamLeadId);
      return res.status(200).json(ErrorHandler.generateSuccessResponse(200, {
        data: leaveRequests,
      }));
    } catch (err) {
      console.log("Error fetching leave requests for team lead:", err);
      console.error("Error fetching leave requests for team lead:", err.message);
      return res.status(500).json({ message: "Failed to fetch leave requests for team lead." });
    }
  }
}

module.exports = LeaveHandler;