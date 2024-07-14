const Product = require('../models/Product');
const { validationResult } = require('express-validator');
const cache = require('memory-cache');
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
        new winston.transports.File({ filename: 'logs/productController.log' })
    ]
});

// Helper function to log errors
const logError = (message, error) => {
    logger.error(`${message}:`, {
        message: error.message,
        stack: error.stack,
    });
};

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
        query.price = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
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
        logger.info('Fetched all products', { query, page, limit });
    } catch (err) {
        logError('Error fetching products', err);
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
        logger.info('Created new product', { product });
    } catch (err) {
        logError('Error creating product', err);
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
        logger.info('Updated product', { id, updates: req.body });
    } catch (err) {
        logError('Error updating product', err);
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
        logger.info('Deleted product', { id });
    } catch (err) {
        logError('Error deleting product', err);
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
        logger.info('Fetched product details', { id });
    } catch (err) {
        logError('Error fetching product details', err);
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
        logger.info('Added review', { productId: id, userId, rating, comment });
    } catch (err) {
        logError('Error adding review', err);
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
        logger.info('Removed review', { productId: id, reviewId });
    } catch (err) {
        logError('Error removing review', err);
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for retrieving featured products
exports.getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({ isFeatured: true }).limit(10);
        res.json(products);
        logger.info('Fetched featured products');
    } catch (err) {
        logError('Error fetching featured products', err);
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for handling bulk product upload
exports.bulkUploadProducts = async (req, res) => {
    const products = req.body.products;

    try {
        await Product.insertMany(products);
        cache.del('/api/products'); // Invalidate cache
        res.status(201).json({ message: 'Products uploaded successfully' });
        logger.info('Bulk uploaded products', { productsCount: products.length });
    } catch (err) {
        logError('Error bulk uploading products', err);
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for calculating product discount prices
exports.calculateDiscountPrices = async (req, res) => {
    const { products } = req.body;

    try {
        const updatedProducts = await Promise.all(products.map(async (product) => {
            const existingProduct = await Product.findById(product.id);
            if (existingProduct) {
                existingProduct.price = existingProduct.price * (1 - product.discount / 100);
                await existingProduct.save();
                return existingProduct;
            }
            return null;
        }));

        res.json(updatedProducts.filter(product => product !== null));
        logger.info('Calculated discount prices', { productsCount: updatedProducts.length });
    } catch (err) {
        logError('Error calculating discount prices', err);
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};

// Middleware for validating product data
exports.validateProductData = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), code: 'VALIDATION_ERROR' });
    }
    next();
};

// Middleware for checking if a product exists
exports.checkProductExists = async (req, res, next) => {
    const { id } = req.params;
    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
        }
        req.product = product;
        next();
    } catch (err) {
        logError('Error checking product existence', err);
        res.status(500).json({ error: 'Server error. Please try again later.', code: 'SERVER_ERROR' });
    }
};
