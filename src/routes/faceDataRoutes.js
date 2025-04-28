const express = require('express');
const router = express.Router();

const { handleSaveFaceData, handleGetFaceData } = require('../handlers/faceDataHandler');

// POST route to save face data
router.post('/api/face-data', handleSaveFaceData);

// GET route to fetch face data by employee_id
router.get('/api/face-data/:employee_id', handleGetFaceData);

module.exports = router;
