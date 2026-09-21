const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

// Get all active services
router.get('/', async (req, res) => {
    try {
        const services = await Service.find({ status: 'active' });
        res.json(services);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Seed demo services (Run this once)
router.post('/seed', async (req, res) => {
    try {
        const demoServices = [
            { name: 'General Consultation', description: 'General health checkup', estimatedTime: 10 },
            { name: 'Dental Checkup', description: 'Basic dental cleaning and checkup', estimatedTime: 15 },
            { name: 'Salon - Haircut', description: 'Professional haircut service', estimatedTime: 20 },
            { name: 'Laptop Repair', description: 'Hardware diagnostics and repair', estimatedTime: 30 }
        ];
        await Service.insertMany(demoServices);
        res.json({ msg: 'Demo services added successfully' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
