const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// API route for generating PDF quotes
router.post('/', documentController.handlePdfQuote);

module.exports = router;
