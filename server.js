const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/services', require('./routes/services'));
app.use('/api/tokens', require('./routes/tokens'));

app.get('/', (req, res) => {
    res.send('QueueLess API is running...');
});

// Database Connection
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected...');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('Database connection error:', err.message);
        console.log('HINT: Make sure you have updated MONGODB_URI in server/.env');
    });
