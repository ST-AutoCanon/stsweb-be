import { getSalaryStatement, getEmployeeBankDetails } from "../services/adminSalaryStatementService.js";

export const fetchSalaryStatement = async (req, res) => {
  try {
    const { month, year } = req.params;
    const salaryData = await getSalaryStatement(month, year);
    res.json({ salary_statement: salaryData });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch salary statement",
      details: error.message,
    });
  }
};

export const fetchEmployeeBankDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const bankDetails = await getEmployeeBankDetails(employeeId);
    res.json({ bank_details: bankDetails });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch employee bank details",
      details: error.message,
    });
  }
};
