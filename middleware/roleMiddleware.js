// middleware/roleMiddleware.js

/**
 * Middleware to check if the user has the required role(s)
 * @param {Array|string} roles - The required role(s) for the route
 */
const checkUserRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || (Array.isArray(roles) ? !roles.includes(req.user.role) : req.user.role !== roles)) {
            return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

module.exports = {
    checkUserRole
};
