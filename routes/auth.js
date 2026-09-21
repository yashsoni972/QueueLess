const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register API
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        console.log(`[AUTH] Registering user: ${email} (${role})`);

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            console.log(`[AUTH] Registration failed: ${email} already exists`);
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create mock OTP (4 digits)
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        console.log(`[DEBUG] OTP for ${email}: ${otp}`);

        user = new User({ name, email, phone, password, role, otp });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(201).json({ msg: 'User registered. Please verify with OTP.', email });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Verify OTP API
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ msg: 'User not found' });
        if (user.otp !== otp) return res.status(400).json({ msg: 'Invalid OTP' });

        user.isVerified = true;
        user.otp = null;
        await user.save();

        res.json({ msg: 'Account verified successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Login API
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        if (!user.isVerified) return res.status(401).json({ msg: 'Please verify your account first' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
