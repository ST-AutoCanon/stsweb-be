
const { saveSalaryDetails } = require("../services/salaryDetailsService");
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

    const result = await saveSalaryDetails(approvedData, month, year);
    return res.status(200).json({
      success: true,
      tableName: result.tableName,
      rowsInserted: result.rowsInserted
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "Failed to save" });
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

module.exports = { saveSalaryDetailsHandler, getApprovedIdsHandler };