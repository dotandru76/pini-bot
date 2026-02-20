const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Define API routes for chat functionality
router.post('/', chatController.handleChat);

module.exports = router;
