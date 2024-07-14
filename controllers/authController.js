const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const config = require('config');
const winston = require('winston');

// Initialize Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, meta }) => {
            return `${timestamp} [${level}] ${message} ${meta ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/authController.log' })
    ]
});

const jwtSecret = process.env.JWT_SECRET || config.get('jwtSecret');
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || config.get('jwtRefreshSecret');
const frontendUrl = process.env.FRONTEND_URL || config.get('frontendUrl');
const emailUser = process.env.EMAIL_USER || config.get('emailUser');
const emailPass = process.env.EMAIL_PASS || config.get('emailPass');

// Rate Limiting middleware for login attempts
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login attempts per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// Send email notifications
const sendEmail = async (email, subject, message) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const mailOptions = {
            from: emailUser,
            to: email,
            subject,
            text: message,
        };

        await transporter.sendMail(mailOptions);
        logger.info('Email sent successfully', { email, subject });
    } catch (err) {
        logger.error('Error sending email', { message: err.message, stack: err.stack });
    }
};

// User registration with email verification and role support
exports.register = async (req, res) => {
    const { username, email, password, role } = req.body;

    if (password.length < 8 || !/\d/.test(password) || !/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long and include a number and an uppercase letter' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = jwt.sign({ email }, jwtSecret, { expiresIn: '1h' });

        const user = new User({
            username,
            email,
            password: hashedPassword,
            role: role || 'user',
            emailVerified: false,
            emailVerificationToken: verificationToken,
        });

        await user.save();
        await sendEmail(email, 'Verify your email', `Please verify your email by clicking the following link: ${frontendUrl}/verify-email?token=${verificationToken}`);
        res.status(201).json({ message: 'User registered successfully. Please verify your email.' });
        logger.info('User registered successfully', { username, email });
    } catch (err) {
        logger.error('Error registering user', { message: err.message, stack: err.stack });
        res.status(500).json({ error: err.message });
    }
};

// Email verification
exports.verifyEmail = async (req, res) => {
    const { token } = req.query;

    try {
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findOne({ email: decoded.email, emailVerificationToken: token });

        if (!user) {
            logger.warn('Invalid or expired token for email verification', { token });
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully' });
        logger.info('Email verified successfully', { email: user.email });
    } catch (err) {
        logger.error('Error verifying email', { message: err.message, stack: err.stack });
        res.status(500).json({ error: err.message });
    }
};

// User login with rate limiting and refresh token support
exports.login = [loginRateLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            logger.warn('User not found during login', { email });
            return res.status(400).json({ error: 'User not found' });
        }

        if (!user.emailVerified) {
            return res.status(400).json({ error: 'Email not verified. Please verify your email.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn('Invalid credentials during login', { email });
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ userId: user._id }, jwtRefreshSecret, { expiresIn: '7d' });

        user.refreshTokens.push(refreshToken);
        await user.save();

        await sendEmail(email, 'Login Notification', 'You have successfully logged in.');

        res.json({ token, refreshToken });
        logger.info('User logged in successfully', { email });
    } catch (err) {
        logger.error('Error during login', { message: err.message, stack: err.stack });
        res.status(500).json({ error: err.message });
    }
}];

// Token refresh
exports.refreshToken = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, jwtRefreshSecret);
        const user = await User.findById(decoded.userId);

        if (!user || !user.refreshTokens.includes(token)) {
            logger.warn('Invalid token during refresh', { token });
            return res.status(401).json({ message: 'Invalid token' });
        }

        const newToken = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
        const newRefreshToken = jwt.sign({ userId: user._id }, jwtRefreshSecret, { expiresIn: '7d' });

        user.refreshTokens = user.refreshTokens.filter(rt => rt !== token);
        user.refreshTokens.push(newRefreshToken);
        await user.save();

        res.json({ token: newToken, refreshToken: newRefreshToken });
        logger.info('Token refreshed successfully', { userId: user._id });
    } catch (err) {
        logger.error('Error refreshing token', { message: err.message, stack: err.stack });
        res.status(500).json({ error: err.message });
    }
};

// Logout and revoke refresh tokens
exports.logout = async (req, res) => {
    const { token } = req.body;

    try {
        const decoded = jwt.verify(token, jwtRefreshSecret);
        const user = await User.findById(decoded.userId);

        if (user) {
            user.refreshTokens = user.refreshTokens.filter(rt => rt !== token);
            await user.save();
        }

        res.status(200).json({ message: 'Logged out successfully' });
        logger.info('User logged out successfully', { userId: decoded.userId });
    } catch (err) {
        logger.error('Error during logout', { message: err.message, stack: err.stack });
        res.status(500).json({ error: err.message });
    }
};

// Middleware to check token blacklisting
exports.checkBlacklistedToken = async (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findById(decoded.userId);

        if (!user || user.tokenBlacklist.includes(token)) {
            logger.warn('Token is blacklisted', { token });
            return res.status(401).json({ message: 'Token is blacklisted' });
        }

        req.user = user;
        next();
    } catch (err) {
        logger.error('Error checking blacklisted token', { message: err.message, stack: err.stack });
        res.status(500).json({ error: err.message });
    }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            logger.warn('User not found during password reset request', { email });
            return res.status(400).json({ error: 'User not found' });
        }

        const resetToken = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });

        user.passwordResetToken = resetToken;
        await user.save();

        await sendEmail(email, 'Password Reset', `Please reset your password by clicking the following link: ${frontendUrl}/reset-password?token=${resetToken}`);

        res.status(200).json({ message: 'Password reset link sent to your email' });
        logger.info('Password reset link sent', { email });
    } catch (err) {
        logger.error('Error requesting password reset', { message: err.message, stack: err.stack });
        res.status(500).json({ error: err.message });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long and include a number and an uppercase letter' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findById(decoded.userId);

        if (!user || user.passwordResetToken !== token) {
            logger.warn('Invalid or expired token during password reset', { token });
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
        logger.info('Password reset successfully', { userId: user._id });
    } catch (err) {
        logger.error('Error resetting password', { message: err.message, stack: err.stack });
        res.status(500).json({ error: err.message });
    }
};
