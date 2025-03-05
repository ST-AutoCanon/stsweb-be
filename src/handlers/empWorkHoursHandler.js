
const workHourSummaryService = require('../services/empWorkHourService');

const getWorkHourSummaryHandler = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) {
            return res.status(400).json({ error: "Employee ID is required" });
        }

        const result = await workHourSummaryService.getWorkHourSummary(employeeId);
        return res.status(200).json(result);
    } catch (error) {
        console.error("❌ Error fetching work hour summary:", error);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};

module.exports = { getWorkHourSummaryHandler };
