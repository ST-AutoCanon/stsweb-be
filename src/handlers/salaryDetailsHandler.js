const { saveSalaryDetails } = require("../services/salaryDetailsService");

/**
 * Handler to save salary details to DB
 * Expects body: { salaryData: [{ employee_id, full_name, annual_ctc, ... }] }
 */
const saveSalaryDetailsHandler = async (req, res) => {
  try {
    const { salaryData } = req.body;

    if (!salaryData || !Array.isArray(salaryData) || salaryData.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid or empty salaryData array required" 
      });
    }

    console.log(`Received ${salaryData.length} salary records for saving`);

    const result = await saveSalaryDetails(salaryData);

    return res.status(200).json({ 
      success: true, 
      message: `Salary details saved successfully in table: ${result.tableName}`,
      tableName: result.tableName,
      rowsInserted: result.rowsInserted 
    });
  } catch (error) {
    console.error("Error saving salary details:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal Server Error: Failed to save salary details" 
    });
  }
};

module.exports = { saveSalaryDetailsHandler };