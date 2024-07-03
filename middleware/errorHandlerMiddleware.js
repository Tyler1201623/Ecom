const fs = require('fs');
const path = require('path');

// Create a write stream for logging to a file
const logFilePath = path.join(__dirname, '../logs', 'error.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Error handling middleware
function errorHandler(err, req, res, next) {
    const statusCode = err.status || 500;
    const errorMessage = err.message || 'Internal Server Error';
    const errorStack = process.env.NODE_ENV === 'production' ? null : err.stack;

    // Log the error details
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${statusCode} - Message: ${errorMessage} - Stack: ${errorStack}\n`;
    console.error(logMessage);
    logStream.write(logMessage);

    // Send error response
    res.status(statusCode).json({
        status: 'error',
        message: errorMessage,
        stack: errorStack
    });
}

// Not Found middleware
function notFoundHandler(req, res, next) {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: 404 - Message: Resource not found\n`;
    console.warn(logMessage);
    logStream.write(logMessage);

    res.status(404).json({
        status: 'fail',
        message: 'Resource not found'
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
