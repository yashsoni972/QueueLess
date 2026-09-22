const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register API (Instant Verification - No Mandatory OTP Block)
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        console.log(`[AUTH] Registering user: ${email} (${role || 'user'})`);

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            console.log(`[AUTH] Registration failed: ${email} already exists`);
            return res.status(400).json({ msg: 'User with this email already exists' });
        }

        user = new User({
            name,
            email,
            phone,
            password,
            role: role || 'user',
            isVerified: true // Automatically verified for smooth authentication
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        console.log(`[AUTH] Registration successful for ${email}`);
        res.status(201).json({
            msg: 'Registration successful! You can now log in.',
            success: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        console.error('Register Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Login API
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid email or password' });

        const payload = { user: { id: user.id, role: user.role } };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
