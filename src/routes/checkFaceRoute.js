const express = require('express');
const router = express.Router();
const { handleCheckFaceExists } = require('../handlers/checkFaceHandler');

router.get('/api/face/check/:employee_id', handleCheckFaceExists);

module.exports = router;
