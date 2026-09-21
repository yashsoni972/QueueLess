const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const Service = require('../models/Service');

// Join Queue (Generate Token)
router.post('/join', async (req, res) => {
    try {
        const { userId, serviceId } = req.body;

        // Check if user already has an active token for this service
        const existingToken = await Token.findOne({ userId, serviceId, status: 'waiting' });
        if (existingToken) {
            return res.status(400).json({ msg: 'You already have a waiting token for this service' });
        }

        // Get the count of tokens today to generate token number
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const count = await Token.countDocuments({ serviceId, createdAt: { $gte: startOfDay } });
        const tokenNumber = `T-${count + 1}`;

        // Get people ahead in queue
        const peopleAhead = await Token.countDocuments({ serviceId, status: 'waiting' });

        const newToken = new Token({
            tokenNumber,
            userId,
            serviceId,
            position: peopleAhead + 1
        });

        await newToken.save();

        // Fetch service details to return estimated time
        const service = await Service.findById(serviceId);
        if (!service) {
             return res.status(404).json({ msg: 'Service not found' });
        }
        const estimatedWait = peopleAhead * service.estimatedTime;

        res.status(201).json({
            token: newToken,
            peopleAhead,
            estimatedWait
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get user's active tokens
router.get('/my/:userId', async (req, res) => {
    try {
        const tokens = await Token.find({ userId: req.params.userId })
            .populate('serviceId')
            .sort({ createdAt: -1 });
        res.json(tokens);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Get Latest Active Token for User
router.get('/active/:userId', async (req, res) => {
    try {
        const token = await Token.findOne({ userId: req.params.userId, status: { $in: ['waiting', 'serving'] } })
            .populate('serviceId')
            .sort({ createdAt: -1 });

        if (!token) return res.status(404).json({ msg: 'No active token found' });
        res.json(token);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Get Service Queue Status
router.get('/status/:serviceId', async (req, res) => {
    try {
        const currentlyServing = await Token.findOne({ serviceId: req.params.serviceId, status: 'serving' })
            .sort({ updatedAt: -1 });

        const lastToken = await Token.findOne({ serviceId: req.params.serviceId })
            .sort({ createdAt: -1 });

        res.json({
            currentlyServing: currentlyServing ? currentlyServing.tokenNumber : 'None',
            lastToken: lastToken ? lastToken.tokenNumber : 'None'
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
