const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
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
        new winston.transports.File({ filename: 'logs/cartController.log' })
    ]
});

// Helper function to log errors
const logError = (message, error) => {
    logger.error(`${message}:`, {
        message: error.message,
        stack: error.stack,
    });
};

// Get cart details
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('products.product');
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        res.json(cart);
        logger.info('Fetched cart successfully', { userId: req.user._id });
    } catch (error) {
        logError('Error fetching cart', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Add product to cart
exports.addToCart = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({ user: req.user._id, products: [] });
        }

        const cartProduct = cart.products.find(p => p.product.equals(productId));
        if (cartProduct) {
            cartProduct.quantity += quantity;
        } else {
            cart.products.push({ product: productId, quantity });
        }

        await cart.save();
        res.json(cart);
        logger.info('Added product to cart', { userId: req.user._id, productId, quantity });
    } catch (error) {
        logError('Error adding to cart', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Remove product from cart
exports.removeFromCart = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.body;

    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const productIndex = cart.products.findIndex(p => p.product.equals(productId));
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found in cart' });
        }

        cart.products.splice(productIndex, 1);
        await cart.save();

        res.json(cart);
        logger.info('Removed product from cart', { userId: req.user._id, productId });
    } catch (error) {
        logError('Error removing from cart', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Clear the cart
exports.clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOneAndDelete({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        res.json({ message: 'Cart cleared successfully' });
        logger.info('Cleared cart', { userId: req.user._id });
    } catch (error) {
        logError('Error clearing cart', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Update product quantity in cart
exports.updateProductQuantity = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;

    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const cartProduct = cart.products.find(p => p.product.equals(productId));
        if (!cartProduct) {
            return res.status(404).json({ error: 'Product not found in cart' });
        }

        cartProduct.quantity = quantity;
        await cart.save();

        res.json(cart);
        logger.info('Updated product quantity in cart', { userId: req.user._id, productId, quantity });
    } catch (error) {
        logError('Error updating product quantity', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Apply coupon to cart
exports.applyCouponToCart = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { couponCode } = req.body;

    try {
        const coupon = await Coupon.findOne({ code: couponCode });
        if (!coupon || !coupon.isActive || coupon.isExpired()) {
            return res.status(400).json({ error: 'Invalid or expired coupon code' });
        }

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        cart.discount = coupon.discount;
        await cart.save();

        res.json({ message: 'Coupon applied successfully', discount: coupon.discount });
        logger.info('Applied coupon to cart', { userId: req.user._id, couponCode });
    } catch (error) {
        logError('Error applying coupon', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Get cart totals
exports.getCartTotals = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('products.product');
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const totalItems = cart.products.reduce((total, item) => total + item.quantity, 0);
        const totalPrice = cart.products.reduce((total, item) => total + item.quantity * item.product.price * (1 - item.product.discount / 100), 0);

        res.json({
            totalItems,
            totalPrice
        });
        logger.info('Fetched cart totals', { userId: req.user._id, totalItems, totalPrice });
    } catch (error) {
        logError('Error fetching cart totals', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Sync cart with server (e.g., during user login)
exports.syncCartWithServer = async (req, res) => {
    try {
        const clientCart = req.body.cart;
        let serverCart = await Cart.findOne({ user: req.user._id });

        if (!serverCart) {
            serverCart = new Cart({ user: req.user._id, products: [] });
        }

        // Sync client cart with server cart
        clientCart.forEach(clientProduct => {
            const serverProduct = serverCart.products.find(p => p.product.equals(clientProduct.product));
            if (serverProduct) {
                serverProduct.quantity = clientProduct.quantity;
            } else {
                serverCart.products.push(clientProduct);
            }
        });

        await serverCart.save();
        res.json(serverCart);
        logger.info('Synced cart with server', { userId: req.user._id });
    } catch (error) {
        logError('Error syncing cart with server', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Calculate shipping costs
exports.calculateShipping = async (req, res) => {
    const { destination } = req.body;

    try {
        // Simulate shipping cost calculation
        const shippingCost = Math.floor(Math.random() * 20) + 5; // Random shipping cost between $5 and $25
        res.json({ shippingCost });
        logger.info('Calculated shipping cost', { userId: req.user._id, destination, shippingCost });
    } catch (error) {
        logError('Error calculating shipping costs', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: 'User is not authenticated' });
    }
    next();
};

// Middleware to validate product ID
exports.validateProductId = (req, res, next) => {
    const { productId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
    }
    next();
};

// Middleware to validate quantity
exports.validateQuantity = (req, res, next) => {
    const { quantity } = req.body;
    if (quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than zero' });
    }
    next();
};
