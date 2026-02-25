const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Define API routes for chat functionality
router.post('/', chatController.handleChat);
router.post('/upload', upload.single('image'), chatController.handleImageUpload);

module.exports = router;
