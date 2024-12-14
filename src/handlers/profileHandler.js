

const { getEmployeeProfile } = require('../services/profileService');

async function getEmployeeProfileHandler(req, res) {
  const id = req.query.id || req.params.id;

  if (!id) {
    return res.status(400).json({ message: 'Employee ID is required.' });
  }

  try {
    const profile = await getEmployeeProfile(id);
    res.status(200).json({ profile });
    console.log('Profile fetched:', profile);
  } catch (error) {
    console.error('Error in getEmployeeProfileHandler:', error.message);
    res.status(500).json({
      message: 'Failed to fetch employee profile.',
      error: error.message,
    });
  }
}

module.exports = { getEmployeeProfileHandler };
