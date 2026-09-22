const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

// Get default active service ("Smart Service Center")
router.get('/', async (req, res) => {
    try {
        let services = await Service.find({ status: 'active' });

        // If no active service exists, create default Smart Service Center
        if (services.length === 0) {
            const defaultCenter = new Service({
                name: 'Smart Service Center',
                description: 'Main Customer Service Counter',
                estimatedTime: 5,
                averageServiceTime: 5
            });
            await defaultCenter.save();
            services = [defaultCenter];
        }
        res.json(services);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Seed demo Smart Service Center
router.post('/seed', async (req, res) => {
    try {
        await Service.deleteMany({});
        const demoService = new Service({
            name: 'Smart Service Center',
            description: 'Main Customer Support & Processing Counter',
            estimatedTime: 5,
            averageServiceTime: 5
        });
        await demoService.save();
        res.json({ msg: 'Smart Service Center initialized successfully', service: demoService });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
