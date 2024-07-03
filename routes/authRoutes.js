const express = require('express');
const router = express.Router();
const { logAction } = require('../middleware/logMiddleware');
const User = require('../models/User');

// Register route
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = new User({ email, password });
        await user.save();
        logAction('User Registered', { email: user.email, id: user._id });
        res.status(201).send({ message: 'User registered successfully', user });
    } catch (error) {
        logAction('User Registration Failed', { error: error.message });
        res.status(500).send({ message: 'Error registering user', error: error.message });
    }
});

// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (!user) {
            logAction('User Login Failed', { email });
            return res.status(401).send({ message: 'Invalid credentials' });
        }
        logAction('User Logged In', { email: user.email, id: user._id });
        res.send({ message: 'Login successful', user });
    } catch (error) {
        logAction('User Login Error', { error: error.message });
        res.status(500).send({ message: 'Error logging in', error: error.message });
    }
});

module.exports = router;
