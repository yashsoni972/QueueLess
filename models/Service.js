const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    estimatedTime: { type: Number, required: true }, // in minutes per person
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
});

module.exports = mongoose.model('Service', ServiceSchema);
