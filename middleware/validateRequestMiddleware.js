const { validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Configurable logging
const enableLogging = process.env.NODE_ENV !== 'production';

// Rate Limiting middleware for validation errors
const validationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: 'Too many invalid requests from this IP, please try again after 15 minutes'
});

// Function to get expected format for a field (example purposes)
const getExpectedFormat = (field) => {
    const formats = {
        email: 'a valid email address (e.g., user@example.com)',
        password: 'at least 8 characters long, including a number, an uppercase letter, and a special character',
        username: 'a non-empty string'
    };
    return formats[field] || 'valid input';
};

// Localization translations
const translations = {
    en: {
        VALIDATION_EMAIL: 'Please enter a valid email address.',
        VALIDATION_PASSWORD: 'Password must be at least 8 characters long and include a number, an uppercase letter, and a special character.',
    },
    es: {
        VALIDATION_EMAIL: 'Por favor, introduce una dirección de correo electrónico válida.',
        VALIDATION_PASSWORD: 'La contraseña debe tener al menos 8 caracteres, incluyendo un número, una letra mayúscula, y un carácter especial.',
    }
};

// Simple translation function
const translate = (message, locale = 'en') => {
    return translations[locale][message] || message;
};

// Middleware to validate the request using express-validator
exports.validateRequest = (req, res, next) => {
    const start = process.hrtime();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Log the validation errors with request details for debugging
        if (enableLogging) {
            console.error('Validation errors:', {
                errors: errors.array(),
                path: req.path,
                method: req.method,
                body: req.body,
                params: req.params,
                query: req.query,
                user: req.user ? req.user.id : 'unauthenticated',
                ip: req.ip
            });
        }

        // Enhanced error formatting with additional context
        const formattedErrors = errors.array().map(err => ({
            field: err.param,
            message: err.msg,
            value: err.value,
            location: err.location,
            code: `VALIDATION_${err.param.toUpperCase()}`,
            context: `Expected format for ${err.param} is ${getExpectedFormat(err.param)}`
        }));

        // Send detailed error response
        return res.status(400).json({
            status: 'fail',
            errors: formattedErrors,
            message: 'Validation failed. Please check the input data and try again.',
            timestamp: new Date().toISOString(),
            path: req.path
        });
    }
    next();

    const end = process.hrtime(start);
    console.log(`Validation middleware executed in ${end[0] * 1000 + end[1] / 1000000}ms`);
};

// Middleware to compose multiple validation middlewares
exports.composeValidators = (...validators) => {
    return (req, res, next) => {
        for (let validator of validators) {
            validator(req, res, next);
        }
        next();
    };
};

// Test mode to mock validation responses
exports.testValidateRequest = (req, res, next) => {
    if (process.env.TEST_MODE === 'true') {
        return res.status(400).json({
            status: 'fail',
            errors: [{ field: 'testField', message: 'This is a test validation error' }],
            message: 'Test mode validation error',
            timestamp: new Date().toISOString(),
            path: req.path
        });
    }
    next();
};

// Middleware to validate the request using express-validator with localization
exports.validateRequestLocalized = (req, res, next) => {
    const errors = validationResult(req);
    const locale = req.headers['accept-language'] || 'en';
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.param,
            message: translate(err.msg, locale),
            value: err.value,
            location: err.location,
            code: `VALIDATION_${err.param.toUpperCase()}`,
            context: `Expected format for ${err.param} is ${getExpectedFormat(err.param)}`
        }));

        return res.status(400).json({
            status: 'fail',
            errors: formattedErrors,
            message: translate('Validation failed. Please check the input data and try again.', locale),
            timestamp: new Date().toISOString(),
            path: req.path
        });
    }
    next();
};

// Export the rate limiter for use in other modules
exports.validationRateLimiter = validationRateLimiter;
