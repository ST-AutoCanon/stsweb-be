const { saveFaceData, getEmployeeName } = require('../services/faceService');

async function handleSaveFaceData(req, res) {
  const { employee_id, descriptors } = req.body;
  try {
    const first_name = await getEmployeeName(employee_id);
    if (!first_name) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    await saveFaceData(employee_id, first_name, descriptors);
    res.json({ message: 'Face data saved successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save face data.' });
  }
}

module.exports = {
  handleSaveFaceData,
};
