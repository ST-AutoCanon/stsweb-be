const { checkFaceExists } = require('../services/checkFaceService');

const handleCheckFaceExists = async (req, res) => {
  const { employee_id } = req.params;

  try {
    const exists = await checkFaceExists(employee_id);
    res.json({ exists });
  } catch (error) {
    console.error('Error checking face data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  handleCheckFaceExists,
};
