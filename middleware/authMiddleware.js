const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Rate Limiting middleware for authentication attempts
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
});

// Middleware to log IP address of requests
const logIpAddress = (req, res, next) => {
    console.log(`Request from IP: ${req.ip}`);
    next();
};

// Middleware to check for token and authenticate user
const authenticate = async (req, res, next) => {
    const token = req.header('Authorization') ? req.header('Authorization').replace('Bearer ', '') : null;
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ message: 'User not found, authorization denied' });
        }

        if (req.user.tokenBlacklist && req.user.tokenBlacklist.includes(token)) {
            return res.status(401).json({ message: 'Token is blacklisted' });
        }

        if (req.user.twoFactorEnabled && !req.user.twoFactorAuthenticated) {
            return res.status(401).json({ message: 'Two-factor authentication required' });
        }

        req.user.lastActivity = Date.now();
        await req.user.save();
        next();
    } catch (err) {
        console.error('Authentication error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Middleware to check if the user is an admin
const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied, admin only' });
    }
};

// Middleware to check for specific roles
const roleMiddleware = (roles) => (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ message: `Access denied, requires one of the following roles: ${roles.join(', ')}` });
    }
};

// Middleware to handle refresh tokens
const handleRefreshToken = async (req, res, next) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: 'No refresh token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ message: 'User not found, authorization denied' });
        }
        next();
    } catch (err) {
        console.error('Refresh token error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Refresh token expired' });
        }
        res.status(401).json({ message: 'Refresh token is not valid' });
    }
};

// Middleware to revoke token
const revokeToken = async (req, res) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        user.tokenBlacklist = user.tokenBlacklist || [];
        user.tokenBlacklist.push(token);
        await user.save();

        res.status(200).json({ message: 'Token revoked successfully' });
    } catch (err) {
        console.error('Error revoking token:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Middleware to check for two-factor authentication
const checkTwoFactorAuth = async (req, res, next) => {
    if (req.user && req.user.twoFactorEnabled) {
        if (!req.user.twoFactorAuthenticated) {
            return res.status(401).json({ message: 'Two-factor authentication required' });
        }
    }
    next();
};

// Middleware to manage user sessions
const manageSessions = async (req, res, next) => {
    const sessionId = req.header('Session-ID');
    if (!sessionId) {
        return res.status(400).json({ message: 'No session ID provided' });
    }

    const session = req.user.sessions.find(sess => sess.id === sessionId);
    if (!session) {
        return res.status(401).json({ message: 'Invalid session ID' });
    }

    session.lastActivity = Date.now();
    await req.user.save();
    next();
};

module.exports = {
    authenticate: [authRateLimiter, logIpAddress, authenticate],
    adminMiddleware,
    roleMiddleware,
    handleRefreshToken,
    revokeToken,
    checkTwoFactorAuth,
    manageSessions
};
