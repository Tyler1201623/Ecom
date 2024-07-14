const express = require('express');
const router = express.Router();
const { logAction } = require('../middleware/logMiddleware');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

// Register route
router.post('/register', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character')
        .isLength({ min: 8 })
        .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logAction('User Registration Validation Failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            logAction('User Registration Failed - Email Exists', { email });
            return res.status(400).json({ message: 'User already exists' });
        }

        user = new User({ email, password });
        await user.save();
        logAction('User Registered', { email: user.email, id: user._id });

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ message: 'User registered successfully', token });
            }
        );
    } catch (error) {
        logAction('User Registration Failed', { error: error.message });
        res.status(500).send({ message: 'Server error', error: error.message });
    }
});

// Login route
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logAction('User Login Validation Failed', { errors: errors.array() });
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            logAction('User Login Failed - No User Found', { email });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            logAction('User Login Failed - Incorrect Password', { email });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        logAction('User Logged In', { email: user.email, id: user._id });

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({ message: 'Login successful', token });
            }
        );
    } catch (error) {
        logAction('User Login Error', { error: error.message });
        res.status(500).send({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
