const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendOtpEmail = require('../utils/sendEmail');

// Register API
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        console.log(`[AUTH] Registering user: ${email} (${role || 'user'})`);

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            if (user.isVerified) {
                console.log(`[AUTH] Registration failed: ${email} already exists and verified`);
                return res.status(400).json({ msg: 'User already exists' });
            } else {
                // If user exists but not verified, generate new OTP and re-send email
                const otp = Math.floor(1000 + Math.random() * 9000).toString();
                user.name = name || user.name;
                user.phone = phone || user.phone;
                user.role = role || user.role;
                user.otp = otp;

                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(password, salt);
                await user.save();

                await sendOtpEmail(email, otp);
                return res.status(200).json({
                    msg: 'Account re-registered. OTP sent to your email.',
                    email
                });
            }
        }

        // Create 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        user = new User({
            name,
            email,
            phone,
            password,
            role: role || 'user',
            otp
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        // Send OTP via email
        await sendOtpEmail(email, otp);

        res.status(201).json({
            msg: 'Registration successful! Verification OTP sent to your email.',
            email
        });

    } catch (err) {
        console.error('Register Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Verify OTP API
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        console.log(`[AUTH] Verifying OTP for ${email}`);

        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ msg: 'User not found' });
        if (user.otp !== otp) return res.status(400).json({ msg: 'Invalid OTP' });

        user.isVerified = true;
        user.otp = null;
        await user.save();

        res.json({ msg: 'Account verified successfully!', success: true });

    } catch (err) {
        console.error('Verify OTP Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Resend OTP API
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ msg: 'User not found' });

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        user.otp = otp;
        await user.save();

        await sendOtpEmail(email, otp);

        res.json({ msg: 'New OTP sent to your email address' });
    } catch (err) {
        console.error('Resend OTP Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// Login API
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

        if (!user.isVerified) return res.status(401).json({ msg: 'Please verify your account with OTP first' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

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
