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
    const mongoStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.send(`QueueLess API is running... (MongoDB Status: ${mongoStatus})`);
});

// Start Server First
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Connect to MongoDB
    if (process.env.MONGODB_URI) {
        mongoose.connect(process.env.MONGODB_URI)
            .then(() => console.log('MongoDB Connected successfully...'))
            .catch(err => {
                console.error('Database connection error:', err.message);
                console.log('HINT: Please update MONGODB_URI credentials in Render Environment Settings.');
            });
    } else {
        console.error('MONGODB_URI environment variable is missing!');
    }
});
