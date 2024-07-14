const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Create a write stream for logging unauthorized access attempts
const logFilePath = path.join(__dirname, '../logs', 'unauthorized_access.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

/**
 * Middleware to check if the user has the required role(s)
 * @param {Array|string} roles - The required role(s) for the route
 */
const checkUserRole = (roles) => {
    return async (req, res, next) => {
        try {
            const token = req.header('Authorization') ? req.header('Authorization').replace('Bearer ', '') : null;
            if (!token) {
                logUnauthorizedAccess(req, 'No token provided');
                return res.status(401).json({ message: 'No token, authorization denied' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user) {
                logUnauthorizedAccess(req, 'User not found');
                return res.status(401).json({ message: 'User not found, authorization denied' });
            }

            if (user.deleted) {
                logUnauthorizedAccess(req, 'User account is deactivated');
                return res.status(403).json({ message: 'User account is deactivated.' });
            }

            if (Array.isArray(roles)) {
                if (!roles.includes(user.role)) {
                    logUnauthorizedAccess(req, `User role ${user.role} insufficient`);
                    return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
                }
            } else if (user.role !== roles) {
                logUnauthorizedAccess(req, `User role ${user.role} insufficient`);
                return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
            }

            req.user = user;
            next();
        } catch (err) {
            console.error('Role middleware error:', err.message);
            if (err.name === 'TokenExpiredError') {
                logUnauthorizedAccess(req, 'Token expired');
                return res.status(401).json({ message: 'Token expired' });
            }
            logUnauthorizedAccess(req, 'Token is not valid');
            res.status(401).json({ message: 'Token is not valid' });
        }
    };
};

/**
 * Middleware to log unauthorized access attempts
 */
const logUnauthorizedAccess = (req, reason) => {
    const { method, originalUrl } = req;
    const userIp = req.ip;
    const timestamp = new Date().toISOString();

    const logMessage = `[${timestamp}] Unauthorized access attempt: ${method} ${originalUrl} from IP: ${userIp} - Reason: ${reason}\n`;
    console.log(logMessage);
    logStream.write(logMessage);
};

/**
 * Middleware to handle failed login attempts and account lockout
 */
const handleFailedLogin = async (req, res, next) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user) {
            await user.incrementLoginAttempts();
            if (user.isLocked()) {
                return res.status(403).json({ message: 'Account locked due to multiple failed login attempts. Try again later.' });
            }
        }
        next();
    } catch (err) {
        console.error('Failed login handling error:', err.message);
        next(err);
    }
};

/**
 * Middleware to verify email verification status
 */
const verifyEmailStatus = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user.emailVerified) {
            return res.status(403).json({ message: 'Email not verified. Please verify your email to proceed.' });
        }
        next();
    } catch (err) {
        console.error('Email verification status check error:', err.message);
        next(err);
    }
};

/**
 * Middleware to check if the user's account is active
 */
const checkAccountStatus = (req, res, next) => {
    const user = req.user;
    if (user.status !== 'active') {
        return res.status(403).json({ message: 'Account is not active. Please contact support.' });
    }
    next();
};

/**
 * Middleware to check if the user has multi-factor authentication enabled
 */
const checkMultiFactorAuth = async (req, res, next) => {
    try {
        const user = req.user;
        if (user.multiFactorEnabled && !req.session.mfaAuthenticated) {
            return res.status(403).json({ message: 'Multi-factor authentication required. Please complete the second step.' });
        }
        next();
    } catch (err) {
        console.error('Multi-factor authentication check error:', err.message);
        next(err);
    }
};

module.exports = {
    checkUserRole,
    logUnauthorizedAccess,
    handleFailedLogin,
    verifyEmailStatus,
    checkAccountStatus,
    checkMultiFactorAuth
};
