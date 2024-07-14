const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'Username is required'], 
        trim: true,
        unique: true 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true, 
        trim: true, 
        lowercase: true, 
        match: [/.+\@.+\..+/, 'Please enter a valid email address'] 
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'], 
        minlength: [8, 'Password must be at least 8 characters long'],
        validate: {
            validator: function(value) {
                return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/.test(value);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },
    profilePicture: {
        type: String,
        default: ''
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordTokenExpires: Date,
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: String,
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    lockUntil: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        required: true,
        default: 0
    },
    deleted: {
        type: Boolean,
        default: false
    },
    sessions: [
        {
            sessionId: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
            lastActivity: { type: Date, default: Date.now }
        }
    ],
    refreshTokens: [String],
    tokenBlacklist: [String]
}, { 
    timestamps: true 
});

// Hash password before saving the user
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
    const token = crypto.randomBytes(20).toString('hex');
    this.emailVerificationToken = token;
    this.emailVerificationTokenExpires = Date.now() + 3600000; // 1 hour
    return token;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
    const token = crypto.randomBytes(20).toString('hex');
    this.resetPasswordToken = token;
    this.resetPasswordTokenExpires = Date.now() + 3600000; // 1 hour
    return token;
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        this.loginAttempts = 1;
        this.lockUntil = undefined;
    } else {
        this.loginAttempts += 1;
        if (this.loginAttempts >= 5) {
            this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // Lock account for 2 hours
        }
    }
    await this.save();
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to manage user sessions
userSchema.methods.createSession = function () {
    const sessionId = crypto.randomBytes(20).toString('hex');
    this.sessions.push({ sessionId });
    return sessionId;
};

userSchema.methods.removeSession = async function (sessionId) {
    this.sessions = this.sessions.filter(session => session.sessionId !== sessionId);
    await this.save();
};

// Soft delete middleware
const softDeleteMiddleware = function(next) {
    this.where({ deleted: false });
    next();
};

userSchema.pre('find', softDeleteMiddleware);
userSchema.pre('findOne', softDeleteMiddleware);
userSchema.pre('findOneAndUpdate', softDeleteMiddleware);
userSchema.pre('findOneAndDelete', softDeleteMiddleware);
userSchema.pre('findOneAndRemove', softDeleteMiddleware);
userSchema.pre('updateOne', softDeleteMiddleware);

// Ensure email uniqueness case-insensitively
userSchema.plugin(uniqueValidator, { message: 'Error, expected {PATH} to be unique.' });

// Method to add token to blacklist
userSchema.methods.addToTokenBlacklist = async function (token) {
    this.tokenBlacklist.push(token);
    await this.save();
};

// Method to check if token is blacklisted
userSchema.methods.isTokenBlacklisted = function (token) {
    return this.tokenBlacklist.includes(token);
};

// Method to refresh token management
userSchema.methods.addRefreshToken = async function (token) {
    this.refreshTokens.push(token);
    await this.save();
};

userSchema.methods.removeRefreshToken = async function (token) {
    this.refreshTokens = this.refreshTokens.filter(refreshToken => refreshToken !== token);
    await this.save();
};

userSchema.methods.clearRefreshTokens = async function () {
    this.refreshTokens = [];
    await this.save();
};

// Middleware to auto-update `updatedAt` field before any update
userSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

module.exports = mongoose.model('User', userSchema);
