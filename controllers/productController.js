const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const cache = require('memory-cache');

// Middleware for pagination, search, and filter
exports.getAllProducts = async (req, res) => {
    const { page = 1, limit = 10, search, category, priceRange, sortBy, order = 'asc' } = req.query;

    const query = {};
    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }
    if (category) {
        query.category = category;
    }
    if (priceRange) {
        const [minPrice, maxPrice] = priceRange.split('-');
        query.price = { $gte: minPrice, $lte: maxPrice };
    }

    const sortOrder = order === 'desc' ? -1 : 1;

    try {
        const products = await Product.find(query)
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const totalProducts = await Product.countDocuments(query);
        res.json({
            products,
            totalPages: Math.ceil(totalProducts / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        console.error('Error fetching products:', {
            message: err.message,
            stack: err.stack,
            query
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for creating product
exports.createProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), code: 'VALIDATION_ERROR' });
    }

    const { name, price, description, imageUrl, category, stock, discount, tags } = req.body;

    try {
        const product = new Product({ name, price, description, imageUrl, category, stock, discount, tags });
        await product.save();
        cache.del('/api/products'); // Invalidate cache
        res.status(201).json(product);
    } catch (err) {
        console.error('Error creating product:', {
            message: err.message,
            stack: err.stack,
            body: req.body
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for updating product
exports.updateProduct = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), code: 'VALIDATION_ERROR' });
    }

    const { id } = req.params;
    const { name, price, description, imageUrl, category, stock, discount, tags } = req.body;

    try {
        const product = await Product.findByIdAndUpdate(id, { name, price, description, imageUrl, category, stock, discount, tags }, { new: true });
        if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
        cache.del('/api/products'); // Invalidate cache
        res.json(product);
    } catch (err) {
        console.error('Error updating product:', {
            message: err.message,
            stack: err.stack,
            body: req.body,
            params: req.params
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for soft deleting product
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findByIdAndUpdate(id, { deleted: true }, { new: true });
        if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
        cache.del('/api/products'); // Invalidate cache
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Error deleting product:', {
            message: err.message,
            stack: err.stack,
            params: req.params
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for fetching detailed product information
exports.getProductDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findById(id).populate('reviews.user', 'username email');
        if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
        res.json(product);
    } catch (err) {
        console.error('Error fetching product details:', {
            message: err.message,
            stack: err.stack,
            params: req.params
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for adding a review to a product
exports.addReview = async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    try {
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });

        product.addReview(userId, rating, comment);
        await product.save();
        res.json(product);
    } catch (err) {
        console.error('Error adding review:', {
            message: err.message,
            stack: err.stack,
            body: req.body,
            params: req.params
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for removing a review from a product
exports.removeReview = async (req, res) => {
    const { id, reviewId } = req.params;

    try {
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });

        product.reviews.id(reviewId).remove();
        product.ratings.count = product.reviews.length;
        product.ratings.average = product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length || 0;
        await product.save();
        res.json(product);
    } catch (err) {
        console.error('Error removing review:', {
            message: err.message,
            stack: err.stack,
            params: req.params
        });
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};
