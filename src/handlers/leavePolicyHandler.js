const LeavePolicyService = require("../services/leavePolicyService");
const ErrorHandler = require("../utils/errorHandler");

class LeavePolicyHandler {
  /**
   * GET /api/leave-policies
   */
  static async getAllPolicies(req, res) {
    try {
      const policies = await LeavePolicyService.getAllPolicies();
      return res.status(200).json({
        success: true,
        statusCode: 200,
        data: policies,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(
          ErrorHandler.generateErrorResponse(500, "Internal server error.")
        );
    }
  }

  /**
   * POST /api/leave-policies
   */
  static async createPolicy(req, res) {
    try {
      const { period, year_start, year_end, leave_settings } = req.body;

      if (
        !period ||
        !year_start ||
        !year_end ||
        !Array.isArray(leave_settings)
      ) {
        return res
          .status(400)
          .json(
            ErrorHandler.generateErrorResponse(
              400,
              "period, year_start, year_end and leave_settings[] are required."
            )
          );
      }

      const newPolicy = await LeavePolicyService.createPolicy({
        period,
        year_start,
        year_end,
        leave_settings,
      });

      return res
        .status(201)
        .json(
          ErrorHandler.generateSuccessResponse(
            201,
            "Policy created.",
            newPolicy
          )
        );
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(
          ErrorHandler.generateErrorResponse(500, "Internal server error.")
        );
    }
  }

  static async getMonthlyLOPHandler(req, res) {
    try {
      const { employeeId } = req.params;
      if (!employeeId) {
        return res
          .status(400)
          .json(
            ErrorHandler.generateErrorResponse(400, "Employee ID is required.")
          );
      }
      const { month, year } = req.query;
      const now = new Date();
      const selectedMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
      const selectedYear = year ? parseInt(year, 10) : now.getFullYear();

      const data = await LeavePolicyService.getMonthlyLOP(
        employeeId,
        selectedMonth,
        selectedYear
      );
      return res
        .status(200)
        .json(
          ErrorHandler.generateSuccessResponse(
            200,
            "Monthly LOP fetched.",
            data
          )
        );
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(
          ErrorHandler.generateErrorResponse(500, "Internal server error.")
        );
    }
  }

  /**
   * PUT /api/leave-policies/:id
   */
  static async updatePolicy(req, res) {
    try {
      const { id } = req.params;
      const { period, year_start, year_end, leave_settings } = req.body;

      if (
        !id ||
        !period ||
        !year_start ||
        !year_end ||
        !Array.isArray(leave_settings)
      ) {
        return res
          .status(400)
          .json(
            ErrorHandler.generateErrorResponse(
              400,
              "id, period, year_start, year_end and leave_settings[] are required."
            )
          );
      }

      await LeavePolicyService.updatePolicy(id, {
        period,
        year_start,
        year_end,
        leave_settings,
      });

      return res
        .status(200)
        .json(ErrorHandler.generateSuccessResponse(200, "Policy updated."));
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(
          ErrorHandler.generateErrorResponse(500, "Internal server error.")
        );
    }
  }

  /**
   * DELETE /api/leave-policies/:id
   */
  static async deletePolicy(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json(ErrorHandler.generateErrorResponse(400, "Policy ID required."));
      }
      await LeavePolicyService.deletePolicy(id);
      return res
        .status(200)
        .json(ErrorHandler.generateSuccessResponse(200, "Policy deleted."));
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(
          ErrorHandler.generateErrorResponse(500, "Internal server error.")
        );
    }
  }

  /**
   * GET /api/leave-policies/employee/:employeeId/leave-balance
   */
  static async getLeaveBalanceHandler(req, res) {
    try {
      const { employeeId } = req.params;
      if (!employeeId) {
        return res
          .status(400)
          .json(
            ErrorHandler.generateErrorResponse(400, "Employee ID is required.")
          );
      }
      const data = await LeavePolicyService.getLeaveBalance(employeeId);
      return res
        .status(200)
        .json(
          ErrorHandler.generateSuccessResponse(
            200,
            "Leave balance fetched.",
            data
          )
        );
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json(
          ErrorHandler.generateErrorResponse(500, "Internal server error.")
        );
    }
  }
}

module.exports = LeavePolicyHandler;
