
const { saveSalaryDetails, getMonthlySalaryData } = require("../services/salaryDetailsService");
const { getApprovedEmployeeIds } = require("../services/salaryDetailsService");

const saveSalaryDetailsHandler = async (req, res) => {
  try {
    const { salaryData, month, year } = req.body;
    if (!Array.isArray(salaryData) || salaryData.length === 0) {
      return res.status(400).json({ success: false, error: "salaryData array required" });
    }

    const approvedData = salaryData.map(r => ({
      ...r,
      status: 'Approved',
      payslip_generation: 'disabled'
    }));

    const result = await saveSalaryDetails(approvedData, month, year);  // Now uses month/year
    return res.status(200).json({
      success: true,
      tableName: result.tableName,
      rowsAffected: result.rowsAffected  // Better feedback: inserts + updates
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "Failed to save" });
  }
};

// New: Handler for /get-monthly
const getMonthlySalaryDataHandler = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, error: "Month and year required" });
    }

    const data = await getMonthlySalaryData(month, year);
    return res.status(200).json({ success: true, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "Failed to fetch monthly data" });
  }
};

const getApprovedIdsHandler = async (req, res) => {
  try {
    const approvedIds = await getApprovedEmployeeIds();
    return res.status(200).json({ success: true, approvedIds });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "Failed to fetch approved ids" });
  }
};

module.exports = { saveSalaryDetailsHandler, getApprovedIdsHandler, getMonthlySalaryDataHandler };