const db = require("../config");
const queries = require("../constants/salaryCalculationPeriodQueries");

class SalaryCalculationPeriodService {
  static async addPeriod(cutoffDate) {
    try {
      const cutoffNum = parseInt(cutoffDate);
      if (isNaN(cutoffNum) || cutoffNum < 1 || cutoffNum > 31) {
        throw new Error("Cutoff date must be an integer between 1 and 31");
      }

      const [result] = await db.execute(queries.ADD_SALARY_PERIOD, [cutoffNum]);
      return {
        success: true,
        data: { id: result.insertId || 1, cutoff_date: cutoffNum },
        message: result.insertId
          ? "Period added successfully"
          : "Period updated successfully",
      };
    } catch (error) {
      throw new Error(`Service error: ${error.message}`);
    }
  }

  static async getAllPeriods() {
    try {
      const [rows] = await db.execute(queries.GET_ALL_SALARY_PERIODS);
      return {
        success: true,
        data: rows,
        message: "Periods fetched successfully",
      };
    } catch (error) {
      throw new Error(`Service error: ${error.message}`);
    }
  }

  static async updatePeriod(id, cutoffDate) {
    try {
      const cutoffNum = parseInt(cutoffDate);
      if (isNaN(cutoffNum) || cutoffNum < 1 || cutoffNum > 31) {
        throw new Error("Cutoff date must be an integer between 1 and 31");
      }

      const [result] = await db.execute(queries.UPDATE_SALARY_PERIOD, [
        cutoffNum,
        id,
      ]);
      if (result.affectedRows === 0) {
        throw new Error("Period not found");
      }

      const [updatedRows] = await db.execute(queries.GET_SALARY_PERIOD_BY_ID, [
        id,
      ]);
      return {
        success: true,
        data: updatedRows[0],
        message: "Period updated successfully",
      };
    } catch (error) {
      throw new Error(`Service error: ${error.message}`);
    }
  }
}

module.exports = SalaryCalculationPeriodService;
