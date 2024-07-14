const mongoose = require('mongoose');
const crypto = require('crypto');

// Coupon Schema
const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        trim: true
    },
    discount: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount must be positive'],
        max: [100, 'Discount cannot exceed 100']
    },
    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    maxUsage: {
        type: Number,
        default: 1,
        min: [1, 'Max usage must be at least 1']
    },
    usageHistory: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        usedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Check if the coupon is expired
couponSchema.methods.isExpired = function () {
    return Date.now() > this.expiryDate;
};

// Method to use the coupon
couponSchema.methods.useCoupon = function (userId) {
    if (!this.isActive) {
        throw new Error('Coupon is inactive');
    }

    if (this.isExpired()) {
        throw new Error('Coupon has expired');
    }

    if (this.usageCount >= this.maxUsage) {
        throw new Error('Coupon usage limit reached');
    }

    this.usageCount += 1;
    this.usageHistory.push({ userId });
    return this.save();
};

// Method to deactivate the coupon
couponSchema.methods.deactivate = function () {
    this.isActive = false;
    return this.save();
};

// Middleware to check for expired coupons and deactivate them
couponSchema.pre('save', function (next) {
    if (this.isExpired()) {
        this.isActive = false;
    }
    next();
});

// Middleware to ensure max usage is a positive integer
couponSchema.pre('validate', function (next) {
    if (this.maxUsage < 1) {
        throw new Error('Max usage must be at least 1');
    }
    next();
});

module.exports = mongoose.model('Coupon', couponSchema);
