const mongoose = require('mongoose');
const crypto = require('crypto');

// Order Item Schema
const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, required: true }
}, { _id: false });

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email address'] },
    phoneNumber: { type: String, required: true, match: [/^\+?\d{10,15}$/, 'Invalid phone number'] },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true, match: [/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'] },
    country: { type: String, required: true, trim: true },
    orderItems: [orderItemSchema],
    paymentMethod: { 
        type: String, 
        required: true, 
        enum: ['Credit Card', 'PayPal', 'Cash App'] 
    },
    paymentStatus: { 
        type: String, 
        default: 'Pending', 
        enum: ['Pending', 'Paid', 'Failed'] 
    },
    orderStatus: { 
        type: String, 
        default: 'Pending', 
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] 
    },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentIntentId: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deleted: { type: Boolean, default: false },
    orderNotes: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    deliveryDate: { type: Date }
}, { timestamps: true });

// Method to calculate total amount
orderSchema.methods.calculateTotalAmount = function() {
    this.totalAmount = this.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return this.totalAmount;
};

// Method to update order status
orderSchema.methods.updateStatus = async function(status) {
    if (['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
        this.orderStatus = status;
        this.updatedAt = Date.now();
        if (status === 'Shipped') {
            this.trackingNumber = crypto.randomBytes(10).toString('hex').toUpperCase();
        }
        await this.save();
        return this;
    } else {
        throw new Error('Invalid order status');
    }
};

// Method to update payment status
orderSchema.methods.updatePaymentStatus = async function(status) {
    if (['Pending', 'Paid', 'Failed'].includes(status)) {
        this.paymentStatus = status;
        this.updatedAt = Date.now();
        await this.save();
        return this;
    } else {
        throw new Error('Invalid payment status');
    }
};

// Middleware to auto-calculate total amount before saving
orderSchema.pre('save', function(next) {
    if (this.isModified('orderItems')) {
        this.calculateTotalAmount();
    }
    next();
});

// Method to add an item to the order
orderSchema.methods.addItem = async function(productId, name, price, quantity, imageUrl) {
    const existingItemIndex = this.orderItems.findIndex(item => item.productId.toString() === productId.toString());
    if (existingItemIndex >= 0) {
        this.orderItems[existingItemIndex].quantity += quantity;
    } else {
        this.orderItems.push({ productId, name, price, quantity, imageUrl });
    }
    await this.save();
    return this;
};

// Method to remove an item from the order
orderSchema.methods.removeItem = async function(productId) {
    this.orderItems = this.orderItems.filter(item => item.productId.toString() !== productId.toString());
    await this.save();
    return this;
};

// Method to update the quantity of an item
orderSchema.methods.updateItemQuantity = async function(productId, quantity) {
    const item = this.orderItems.find(item => item.productId.toString() === productId.toString());
    if (item) {
        item.quantity = quantity;
    }
    await this.save();
    return this;
};

// Middleware for soft delete
orderSchema.pre(/^find/, function(next) {
    this.where({ deleted: false });
    next();
});

// Method to soft delete an order
orderSchema.methods.softDelete = async function() {
    this.deleted = true;
    await this.save();
    return this;
};

// Method to add a note to the order
orderSchema.methods.addOrderNote = async function(note) {
    this.orderNotes += `${new Date().toISOString()}: ${note}\n`;
    await this.save();
    return this;
};

// Method to set delivery date
orderSchema.methods.setDeliveryDate = async function(date) {
    this.deliveryDate = date;
    await this.save();
    return this;
};

// Middleware to auto-update `updatedAt` field before any update
orderSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

module.exports = mongoose.model('Order', orderSchema);
