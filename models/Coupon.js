// models/Coupon.js
const mongoose = require('mongoose');

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
    }
}, {
    timestamps: true
});

couponSchema.methods.isExpired = function () {
    return Date.now() > this.expiryDate;
};

module.exports = mongoose.model('Coupon', couponSchema);
