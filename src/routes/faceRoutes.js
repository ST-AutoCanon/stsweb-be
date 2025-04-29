const express = require('express');
const router = express.Router();
const { handleSaveFaceData } = require('../handlers/faceHandler');

// POST route to save face data
router.post('/save-face-data', handleSaveFaceData);

module.exports = router;
