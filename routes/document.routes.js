const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// API route for generating PDF quotes
router.post('/quote', documentController.handlePdfQuote);

// API route for Direct GCP Upload Signed URLs
router.post('/signed-url', documentController.handleSignedUrl);

// API route for technical image validation
router.post('/validate', documentController.handleImageValidation);

module.exports = router;
