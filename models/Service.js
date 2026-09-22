const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    estimatedTime: { type: Number, required: true, default: 5 }, // initial default estimated time in minutes
    averageServiceTime: { type: Number, default: 5 }, // dynamic actual average time per person
    totalServedTokens: { type: Number, default: 0 },
    totalServiceDuration: { type: Number, default: 0 }, // in seconds or minutes
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
});

module.exports = mongoose.model('Service', ServiceSchema);
