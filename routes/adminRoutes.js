const express = require('express');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getAllProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { authenticate, adminMiddleware } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequestMiddleware');
const { logAction } = require('../middleware/logMiddleware');
const cache = require('memory-cache');

const router = express.Router();

// Rate Limiting middleware for admin actions
const adminRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Validation rules for product data
const productValidationRules = [
    check('name', 'Name is required').not().isEmpty().trim().escape(),
    check('price', 'Price must be a positive number').isFloat({ gt: 0 }).toFloat(),
    check('description', 'Description is required').not().isEmpty().trim().escape(),
    check('imageUrl', 'Image URL is required').isURL().trim()
];

// Route to get all products with pagination and filtering
router.get('/', authenticate, adminMiddleware, adminRateLimiter, async (req, res, next) => {
    try {
        const cacheKey = '/api/products';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const products = await getAllProducts(req, res);
        cache.put(cacheKey, products, 10 * 60 * 1000); // Cache for 10 minutes
        res.json(products);
    } catch (err) {
        next(err);
    }
});

// Route to create a new product
router.post(
    '/',
    authenticate,
    adminMiddleware,
    adminRateLimiter,
    productValidationRules,
    validateRequest,
    logAction('createProduct'),
    async (req, res, next) => {
        try {
            const product = await createProduct(req, res);
            cache.del('/api/products'); // Invalidate cache
            res.status(201).json(product);
        } catch (err) {
            next(err);
        }
    }
);

// Route to update an existing product
router.put(
    '/:id',
    authenticate,
    adminMiddleware,
    adminRateLimiter,
    [
        check('id', 'Valid product ID is required').isMongoId(),
        ...productValidationRules
    ],
    validateRequest,
    logAction('updateProduct'),
    async (req, res, next) => {
        try {
            const updatedProduct = await updateProduct(req, res);
            cache.del('/api/products'); // Invalidate cache
            res.json(updatedProduct);
        } catch (err) {
            next(err);
        }
    }
);

// Route to delete a product
router.delete(
    '/:id',
    authenticate,
    adminMiddleware,
    adminRateLimiter,
    [
        check('id', 'Valid product ID is required').isMongoId()
    ],
    validateRequest,
    logAction('deleteProduct'),
    async (req, res, next) => {
        try {
            await deleteProduct(req, res);
            cache.del('/api/products'); // Invalidate cache
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
