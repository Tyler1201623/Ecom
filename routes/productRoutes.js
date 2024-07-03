const express = require('express');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { 
    getAllProducts, 
    getProductDetails, 
    createProduct, 
    updateProduct, 
    deleteProduct 
} = require('../controllers/productController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorizeMiddleware');
const { validateRequest } = require('../middleware/validateRequestMiddleware');
const { errorHandler } = require('../middleware/errorHandlerMiddleware');
const { cacheMiddleware, clearCache } = require('../middleware/cacheMiddleware');
const { logAction } = require('../middleware/logMiddleware');

const router = express.Router();

/**
 * Rate Limiting middleware
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

const createUpdateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

/**
 * Validation rules for product creation and update.
 */
const productValidationRules = [
    check('name', 'Name is required').not().isEmpty().trim().escape(),
    check('price', 'Price must be a positive number').isFloat({ gt: 0 }).toFloat(),
    check('description', 'Description is required').not().isEmpty().trim().escape(),
    check('imageUrl', 'Image URL is required').isURL().trim().escape(),
    check('category', 'Category is required').not().isEmpty().trim().escape(),
    check('stock', 'Stock must be a non-negative integer').isInt({ min: 0 }).toInt(),
    check('discount', 'Discount must be between 0 and 100').isFloat({ min: 0, max: 100 }).toFloat()
];

/**
 * @route   GET /api/products
 * @desc    Get all products with pagination, search, and filtering
 * @access  Public
 */
router.get('/', apiLimiter, cacheMiddleware(30), getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get detailed information about a product
 * @access  Public
 */
router.get('/:id', apiLimiter, getProductDetails);

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Admin only)
 */
router.post(
    '/',
    authenticate,
    authorize(['admin']), // Updated to call the function correctly
    createUpdateLimiter,
    productValidationRules,
    validateRequest,
    logAction('createProduct'),
    async (req, res, next) => {
        try {
            await createProduct(req, res);
            clearCache('/api/products'); // Invalidate cache
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private (Admin only)
 */
router.put(
    '/:id',
    authenticate,
    authorize(['admin']), // Updated to call the function correctly
    createUpdateLimiter,
    productValidationRules,
    validateRequest,
    logAction('updateProduct'),
    async (req, res, next) => {
        try {
            await updateProduct(req, res);
            clearCache('/api/products'); // Invalidate cache
        } catch (err) {
            next(err);
        }
    }
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(['admin']), createUpdateLimiter, logAction('deleteProduct'), async (req, res, next) => {
    try {
        await deleteProduct(req, res);
        clearCache('/api/products'); // Invalidate cache
    } catch (err) {
        next(err);
    }
});

/**
 * Error handling middleware
 */
router.use(errorHandler);

module.exports = router;
