const express = require('express');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { 
    getCart, 
    addToCart, 
    removeFromCart, 
    clearCart, 
    updateProductQuantity, 
    applyCouponToCart, 
    getCartTotals 
} = require('../controllers/cartController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequestMiddleware');
const { errorHandler } = require('../middleware/errorHandlerMiddleware');
const { logAction, logMiddleware } = require('../middleware/logMiddleware'); // Ensure correct import
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { checkUserRole } = require('../middleware/roleMiddleware');

const router = express.Router();

/**
 * Rate Limiting middleware
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

const updateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 update requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

/**
 * Validation rules for adding and removing products from the cart.
 * Ensures productId is provided and quantity is a positive integer.
 */
const addProductValidationRules = [
    check('productId', 'Product ID is required').not().isEmpty().isMongoId().withMessage('Invalid Product ID').trim().escape(),
    check('quantity', 'Quantity must be a positive number').isInt({ gt: 0 }).toInt()
];

const removeProductValidationRules = [
    check('productId', 'Product ID is required').not().isEmpty().isMongoId().withMessage('Invalid Product ID').trim().escape()
];

const updateQuantityValidationRules = [
    check('productId', 'Product ID is required').not().isEmpty().isMongoId().withMessage('Invalid Product ID').trim().escape(),
    check('quantity', 'Quantity must be a positive number').isInt({ gt: 0 }).toInt()
];

const applyCouponValidationRules = [
    check('couponCode', 'Coupon code is required').not().isEmpty().trim().escape()
];

/**
 * @route   GET /api/cart
 * @desc    Get the cart for the authenticated user
 * @access  Private
 */
router.get('/', authenticate, logMiddleware, cacheMiddleware, logAction('getCart'), getCart);

/**
 * @route   POST /api/cart
 * @desc    Add a product to the cart
 * @access  Private
 */
router.post('/', authenticate, apiLimiter, addProductValidationRules, validateRequest, logAction('addToCart'), async (req, res, next) => {
    try {
        await addToCart(req, res);
        cacheMiddleware.clear(req.user.id); // Clear cache on cart update
    } catch (err) {
        next(err);
    }
});

/**
 * @route   DELETE /api/cart
 * @desc    Remove a product from the cart
 * @access  Private
 */
router.delete('/', authenticate, apiLimiter, removeProductValidationRules, validateRequest, logAction('removeFromCart'), async (req, res, next) => {
    try {
        await removeFromCart(req, res);
        cacheMiddleware.clear(req.user.id); // Clear cache on cart update
    } catch (err) {
        next(err);
    }
});

/**
 * @route   PUT /api/cart/quantity
 * @desc    Update the quantity of a product in the cart
 * @access  Private
 */
router.put('/quantity', authenticate, updateLimiter, updateQuantityValidationRules, validateRequest, logAction('updateProductQuantity'), async (req, res, next) => {
    try {
        await updateProductQuantity(req, res);
        cacheMiddleware.clear(req.user.id); // Clear cache on cart update
    } catch (err) {
        next(err);
    }
});

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear the cart
 * @access  Private
 */
router.delete('/clear', authenticate, updateLimiter, checkUserRole('admin'), logAction('clearCart'), async (req, res, next) => {
    try {
        await clearCart(req, res);
        cacheMiddleware.clear(req.user.id); // Clear cache on cart update
    } catch (err) {
        next(err);
    }
});

/**
 * @route   POST /api/cart/coupon
 * @desc    Apply a coupon to the cart
 * @access  Private
 */
router.post('/coupon', authenticate, apiLimiter, applyCouponValidationRules, validateRequest, logAction('applyCouponToCart'), async (req, res, next) => {
    try {
        await applyCouponToCart(req, res);
    } catch (err) {
        next(err);
    }
});

/**
 * @route   GET /api/cart/totals
 * @desc    Get the cart totals (price, items, weight)
 * @access  Private
 */
router.get('/totals', authenticate, logAction('getCartTotals'), getCartTotals);

/**
 * Error handling middleware
 */
router.use(errorHandler);

module.exports = router;
