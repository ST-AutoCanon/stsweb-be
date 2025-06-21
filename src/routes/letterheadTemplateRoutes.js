const express = require('express');
const router = express.Router();
const {
  addTemplateHandler,
  getAllTemplatesHandler
} = require('../handlers/letterheadTemplateHandler');

// POST /api/templates/add - Add a new letterhead template
router.post('/add', addTemplateHandler);

// GET /api/templates/list - Get all letterhead templates
router.get('/list', getAllTemplatesHandler);

module.exports = router;
