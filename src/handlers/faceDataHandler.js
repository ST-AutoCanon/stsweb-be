const {
    saveFaceDataService,
    getFaceDataByEmployeeService
  } = require('../services/faceDataService');
  
  const handleSaveFaceData = async (req, res) => {
    const { employee_id, descriptors } = req.body;
  
    if (!employee_id || !descriptors) {
      return res.status(400).json({ error: 'Missing employee_id or descriptors' });
    }
  
    try {
      await saveFaceDataService(employee_id, descriptors);
      res.status(201).json({ message: 'Face data saved successfully' });
    } catch (error) {
      console.error('Error saving face data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  // Handle GET request to fetch face data for a specific employee
  const handleGetFaceData = async (req, res) => {
    const { employee_id } = req.params; // Extract employee_id from the URL parameters
  
    try {
      // Fetch face data from the service
      const faceData = await getFaceDataByEmployeeService(employee_id);
  
      if (!faceData) {
        // No face data found for the given employee
        return res.status(404).json({ message: 'No face data found for this employee' });
      }
  
      // Send the retrieved face data in the response
      res.json(faceData);
    } catch (error) {
      console.error('Error fetching face data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  // const handleGetFaceData = async (req, res) => {
  //   const { employee_id } = req.params;
  
  //   try {
  //     const faceData = await getFaceDataByEmployeeService(employee_id);
  
  //     if (!faceData || faceData.length === 0) {
  //       // Instead of 404, return empty descriptors with 200
  //       return res.status(200).json({ descriptors: [] });
  //     }
  
  //     // If face data exists, return it as expected
  //     res.json({ descriptors: faceData });
  //   } catch (error) {
  //     console.error('Error fetching face data:', error);
  //     res.status(500).json({ error: 'Internal server error' });
  //   }
  // };
  
  module.exports = {
    handleSaveFaceData,
    handleGetFaceData
  };
  