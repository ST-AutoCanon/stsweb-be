import { getLastMonthTotalSalary } from "../services/adminPayrollService.js";

export const fetchLastMonthSalary = async (req, res) => {
  try {
    const totalSalary = await getLastMonthTotalSalary();
    res.json({ total_salary: totalSalary });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch salary data",
      details: error.message,
    });
  }
};
