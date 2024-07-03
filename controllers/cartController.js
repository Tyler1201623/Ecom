const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { validationResult } = require('express-validator');

// Get cart details
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('products.product');
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        res.json(cart);
    } catch (error) {
        console.error('Error fetching cart:', {
            message: error.message,
            stack: error.stack,
        });
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
    } catch (error) {
        console.error('Error adding to cart:', {
            message: error.message,
            stack: error.stack,
        });
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
    } catch (error) {
        console.error('Error removing from cart:', {
            message: error.message,
            stack: error.stack,
        });
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
    } catch (error) {
        console.error('Error clearing cart:', {
            message: error.message,
            stack: error.stack,
        });
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
    } catch (error) {
        console.error('Error updating product quantity:', {
            message: error.message,
            stack: error.stack,
        });
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
    } catch (error) {
        console.error('Error applying coupon:', {
            message: error.message,
            stack: error.stack,
        });
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
        const totalPrice = cart.products.reduce((total, item) => total + item.quantity * item.product.price, 0);

        res.json({
            totalItems,
            totalPrice
        });
    } catch (error) {
        console.error('Error fetching cart totals:', {
            message: error.message,
            stack: error.stack,
        });
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};
