/** server.js V32.0 - MVC Refactoring */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Imports API routes
const chatRoutes = require('./routes/chat.routes');
const documentRoutes = require('./routes/document.routes');

const app = express();
const PORT = process.env.PORT || 7860;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Main App API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/pdf', documentRoutes);

// General health check fallback
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', up: true });
});

app.listen(PORT, () => console.log(`🚀 SERVER running on port ${PORT}`));