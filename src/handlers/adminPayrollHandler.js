const { getLastMonthTotalSalary } = require("../services/adminPayrollService");

const fetchLastMonthSalary = async (req, res) => {
  try {
    const totalSalary = await getLastMonthTotalSalary();
    res.status(200).json({ total_salary: totalSalary });
  } catch (error) {
    console.error("Error fetching last month's salary:", error);
    res.status(500).json({
      error: "Failed to fetch salary data",
      details: error.message,
    });
  }
};

module.exports = {
  fetchLastMonthSalary,
};
