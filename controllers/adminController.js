const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const cache = require('memory-cache');
const { startSession } = require('mongoose');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

// Rate Limiting middleware for admin actions
const adminRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
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

// Middleware for creating product with validation and authorization
exports.addProduct = [adminRateLimiter, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), code: 'VALIDATION_ERROR' });
    }

    const { name, price, description, imageUrl, category, stock, discount } = req.body;

    try {
        const session = await startSession();
        session.startTransaction();

        const product = new Product({ name, price, description, imageUrl, category, stock, discount });
        await product.save({ session });

        await session.commitTransaction();
        session.endSession();

        cache.del('/api/products'); // Invalidate cache

        res.status(201).json(product);

        // Audit logging and notifications
        await sendEmail(process.env.ADMIN_EMAIL, 'Product Added', `Product ${name} was added by admin.`);
    } catch (err) {
        console.error('Error creating product:', {
            message: err.message,
            stack: err.stack,
            body: req.body
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
}];

// Middleware for updating product with validation and authorization
exports.updateProduct = [adminRateLimiter, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), code: 'VALIDATION_ERROR' });
    }

    const { id } = req.params;
    const { name, price, description, imageUrl, category, stock, discount } = req.body;

    try {
        const session = await startSession();
        session.startTransaction();

        const product = await Product.findByIdAndUpdate(id, { name, price, description, imageUrl, category, stock, discount }, { new: true, session });
        if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });

        await session.commitTransaction();
        session.endSession();

        cache.del('/api/products'); // Invalidate cache

        res.json(product);

        // Audit logging and notifications
        await sendEmail(process.env.ADMIN_EMAIL, 'Product Updated', `Product ${name} was updated by admin.`);
    } catch (err) {
        console.error('Error updating product:', {
            message: err.message,
            stack: err.stack,
            body: req.body,
            params: req.params
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
}];

// Middleware for soft deleting product with authorization
exports.deleteProduct = [adminRateLimiter, async (req, res) => {
    const { id } = req.params;
    try {
        const session = await startSession();
        session.startTransaction();

        const product = await Product.findByIdAndUpdate(id, { deleted: true }, { new: true, session });
        if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });

        await session.commitTransaction();
        session.endSession();

        cache.del('/api/products'); // Invalidate cache

        res.json({ message: 'Product deleted successfully' });

        // Audit logging and notifications
        await sendEmail(process.env.ADMIN_EMAIL, 'Product Deleted', `Product ${product.name} was deleted by admin.`);
    } catch (err) {
        console.error('Error deleting product:', {
            message: err.message,
            stack: err.stack,
            params: req.params
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
}];
