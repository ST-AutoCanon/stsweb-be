// routes/overtimeSupervisorRoutes.js
const express = require('express');
const router = express.Router();
const { upsertOvertimeSupervisor } = require('../handlers/overtimeSupervisorHandler');

// Dedicated endpoint for Supervisor
router.post('/overtime-upsert-supervisor', upsertOvertimeSupervisor);

module.exports = router;