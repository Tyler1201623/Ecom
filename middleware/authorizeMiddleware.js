const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const config = require('config');

// Create a write stream for logging unauthorized access attempts
const logFilePath = path.join(__dirname, '../logs', 'unauthorized_access.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

/**
 * Middleware to check if the user has the required role(s)
 * @param {Array|string} roles - The required role(s) for the route
 */
exports.authorize = (roles) => {
    return async (req, res, next) => {
        try {
            const token = req.header('Authorization') ? req.header('Authorization').replace('Bearer ', '') : null;
            if (!token) {
                logUnauthorizedAccess(req, 'No token provided');
                return res.status(401).json({ message: 'No token, authorization denied' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || config.get('jwtSecret'));
            const user = await User.findById(decoded.id);

            if (!user) {
                logUnauthorizedAccess(req, 'User not found');
                return res.status(401).json({ message: 'User not found, authorization denied' });
            }

            if (user.deleted) {
                logUnauthorizedAccess(req, 'User account is deactivated');
                return res.status(403).json({ message: 'User account is deactivated' });
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
            console.error('Authorization middleware error:', err.message);
            logUnauthorizedAccess(req, err.message);
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            res.status(401).json({ message: 'Token is not valid' });
        }
    };
};

/**
 * Middleware to log unauthorized access attempts
 * @param {Object} req - The request object
 * @param {string} reason - The reason for unauthorized access
 */
const logUnauthorizedAccess = (req, reason) => {
    const { method, originalUrl } = req;
    const userIp = req.ip;
    const timestamp = new Date().toISOString();

    const logMessage = `[${timestamp}] Unauthorized access attempt: ${method} ${originalUrl} from IP: ${userIp} - Reason: ${reason}\n`;
    console.log(logMessage);
    logStream.write(logMessage);
};

module.exports = {
    authorize: exports.authorize,
    logUnauthorizedAccess
};
