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

// Middleware to handle caching
const cacheMiddleware = (duration) => (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        console.log(`[CACHE] Returning cached response for ${key}`);
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cachedResponse);
    }

    res.sendResponse = res.send;
    res.send = (body) => {
        cache.put(key, body, duration * 1000);
        console.log(`[CACHE] Caching response for ${key} for ${duration} seconds`);
        res.setHeader('X-Cache-Hit', 'false');
        res.sendResponse(body);
    };

    next();
};

// Route to get all products with pagination and filtering
router.get('/', authenticate, adminMiddleware, adminRateLimiter, cacheMiddleware(10 * 60), async (req, res, next) => {
    try {
        const products = await getAllProducts(req, res);
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
            cache.clear(); // Invalidate all cache on product creation
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
            cache.clear(); // Invalidate all cache on product update
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
            cache.clear(); // Invalidate all cache on product deletion
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
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

// Middleware to handle caching
const cacheMiddleware = (duration) => (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        console.log(`[CACHE] Returning cached response for ${key}`);
        res.setHeader('X-Cache-Hit', 'true');
        return res.json(cachedResponse);
    }

    res.sendResponse = res.send;
    res.send = (body) => {
        cache.put(key, body, duration * 1000);
        console.log(`[CACHE] Caching response for ${key} for ${duration} seconds`);
        res.setHeader('X-Cache-Hit', 'false');
        res.sendResponse(body);
    };

    next();
};

// Route to get all products with pagination and filtering
router.get('/', authenticate, adminMiddleware, adminRateLimiter, cacheMiddleware(10 * 60), async (req, res, next) => {
    try {
        const products = await getAllProducts(req, res);
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
            cache.clear(); // Invalidate all cache on product creation
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
            cache.clear(); // Invalidate all cache on product update
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
            cache.clear(); // Invalidate all cache on product deletion
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    }
);

module.exports = router;
