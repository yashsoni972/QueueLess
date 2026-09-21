const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
    tokenNumber: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    status: { type: String, enum: ['waiting', 'serving', 'completed', 'cancelled'], default: 'waiting' },
    position: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Token', TokenSchema);
