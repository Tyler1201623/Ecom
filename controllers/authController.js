const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const jwtSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

// Rate Limiting middleware for login attempts
const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login attempts per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// Send email notifications
const sendEmail = async (email, subject, message) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject,
        text: message,
    };

    await transporter.sendMail(mailOptions);
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
        await sendEmail(email, 'Verify your email', `Please verify your email by clicking the following link: ${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`);
        res.status(201).json({ message: 'User registered successfully. Please verify your email.' });
    } catch (err) {
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
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// User login with rate limiting and refresh token support
exports.login = [loginRateLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        if (!user.emailVerified) {
            return res.status(400).json({ error: 'Email not verified. Please verify your email.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ userId: user._id }, jwtRefreshSecret, { expiresIn: '7d' });

        user.refreshTokens.push(refreshToken);
        await user.save();

        await sendEmail(email, 'Login Notification', 'You have successfully logged in.');

        res.json({ token, refreshToken });
    } catch (err) {
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
            return res.status(401).json({ message: 'Invalid token' });
        }

        const newToken = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });
        const newRefreshToken = jwt.sign({ userId: user._id }, jwtRefreshSecret, { expiresIn: '7d' });

        user.refreshTokens = user.refreshTokens.filter(rt => rt !== token);
        user.refreshTokens.push(newRefreshToken);
        await user.save();

        res.json({ token: newToken, refreshToken: newRefreshToken });
    } catch (err) {
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
    } catch (err) {
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
            return res.status(401).json({ message: 'Token is blacklisted' });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const resetToken = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });

        user.passwordResetToken = resetToken;
        await user.save();

        await sendEmail(email, 'Password Reset', `Please reset your password by clicking the following link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);

        res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findById(decoded.userId);

        if (!user || user.passwordResetToken !== token) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
