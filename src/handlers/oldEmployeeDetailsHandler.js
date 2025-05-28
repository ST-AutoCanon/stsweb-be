// // handles/oldEmployeeDetailsHandler.js

// const service = require('../services/oldEmployeeDetailsService');

// const saveOldEmployeeDetails = async (req, res) => {
//   try {
//     const result = await service.insertOldEmployeeDetails(req.body);
//     res.status(201).json({ message: 'Employee details saved successfully', insertId: result.insertId });
//   } catch (error) {
//     console.error('Save Error:', error); // Logs full error to console
//     res.status(500).json({
//       message: 'Failed to save employee details',
//       error: error.message || 'Unknown error occurred'
//     });
//   }
// };

// const fetchOldEmployeeDetails = async (req, res) => {
//   try {
//     const data = await service.getAllOldEmployeeDetails();
//     res.status(200).json(data);
//   } catch (error) {
//     console.error('Fetch Error:', error); // Logs full error to console
//     res.status(500).json({
//       message: 'Failed to fetch employee details',
//       error: error.message || 'Unknown error occurred'
//     });
//   }
// };

// module.exports = {
//   saveOldEmployeeDetails,
//   fetchOldEmployeeDetails,
// };


const service = require('../services/oldEmployeeDetailsService');


// const saveOldEmployeeDetails = async (req, res) => {
//   try {
//     const result = await service.insertOldEmployeeDetails(req.body);
//     res.status(201).json({ message: 'Employee details saved successfully', insertId: result.insertId });
//   } catch (error) {
//     console.error('Save Error:', error);
//     res.status(500).json({ message: 'Failed to save employee details', error: error.message || 'Unknown error' });
//   }
// };
const saveOldEmployeeDetails = async (req, res) => {
  try {
    console.log('Received req.body in handler:', req.body); // 🔍 Add this

    const result = await service.insertOldEmployeeDetails(req.body);
    res.status(201).json({ message: 'Employee details saved successfully', insertId: result.insertId });
  } catch (error) {
    console.error('Save Error:', error);
    res.status(500).json({ message: 'Failed to save employee details', error: error.message || 'Unknown error' });
  }
};


const fetchOldEmployeeDetails = async (req, res) => {
  try {
    const data = await service.getAllOldEmployeeDetails();
    res.status(200).json(data);
  } catch (error) {
    console.error('Fetch Error:', error);
    res.status(500).json({ message: 'Failed to fetch employee details', error: error.message || 'Unknown error' });
  }
};

const editOldEmployeeDetails = async (req, res) => {
  try {
    const result = await service.updateOldEmployeeDetails(req.body);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Employee not found or no changes made' });
    }
    res.status(200).json({ message: 'Employee details updated successfully' });
  } catch (error) {
    console.error('Edit Error:', error);
    res.status(500).json({ message: 'Failed to update employee details', error: error.message || 'Unknown error' });
  }
};

module.exports = {
  saveOldEmployeeDetails,
  fetchOldEmployeeDetails,
  editOldEmployeeDetails,
};
