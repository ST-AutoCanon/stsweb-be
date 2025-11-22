// handlers/overtimeSupervisorHandler.js
const overtimeSupervisorService = require('../services/overtimeSupervisorService');

const upsertOvertimeSupervisor = async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid input: data must be a non-empty array' });
    }

    const results = await overtimeSupervisorService.upsertOvertimeSupervisor(data, req.employeeId);

    const insertedCount = results.filter(r => r.insertId > 0).length;
    const updatedCount = results.filter(r => r.affectedRows > 0 && !r.insertId).length;

    res.status(200).json({
      success: true,
      message: `Supervisor overtime: ${insertedCount} inserted, ${updatedCount} updated`,
      data: { insertedCount, updatedCount }
    });
  } catch (error) {
    console.error('Error in upsertOvertimeSupervisor handler:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

module.exports = {
  upsertOvertimeSupervisor,
};