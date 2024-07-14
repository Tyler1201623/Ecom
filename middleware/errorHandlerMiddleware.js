const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const os = require('os');

// Create a write stream for logging to a file
const logDirectory = path.join(__dirname, '../logs');
const logFilePath = path.join(logDirectory, 'error.log');

// Ensure log directory exists
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// Create log stream
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Format log message
function formatLogMessage(level, method, url, statusCode, message, stack) {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const hostname = os.hostname();
    const formattedStack = stack ? `\nStack: ${stack}` : '';
    return `[${timestamp}] [${hostname}] [${level}] ${method} ${url} - Status: ${statusCode} - Message: ${message}${formattedStack}\n`;
}

// Error handling middleware
function errorHandler(err, req, res, next) {
    const statusCode = err.status || 500;
    const errorMessage = err.message || 'Internal Server Error';
    const errorStack = process.env.NODE_ENV === 'production' ? null : err.stack;

    // Log the error details
    const logMessage = formatLogMessage('ERROR', req.method, req.originalUrl, statusCode, errorMessage, errorStack);
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
    const logMessage = formatLogMessage('WARN', req.method, req.originalUrl, 404, 'Resource not found');
    console.warn(logMessage);
    logStream.write(logMessage);

    res.status(404).json({
        status: 'fail',
        message: 'Resource not found'
    });
}

/**
 * Middleware to log request details
 */
function requestLogger(req, res, next) {
    const logMessage = formatLogMessage('INFO', req.method, req.originalUrl, 0, 'Request received');
    console.info(logMessage);
    logStream.write(logMessage);
    next();
}

/**
 * Middleware to log response details
 */
function responseLogger(req, res, next) {
    res.on('finish', () => {
        const logMessage = formatLogMessage('INFO', req.method, req.originalUrl, res.statusCode, 'Response sent');
        console.info(logMessage);
        logStream.write(logMessage);
    });
    next();
}

// Log uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    const logMessage = formatLogMessage('FATAL', 'UncaughtException', '', 500, error.message, error.stack);
    console.error(logMessage);
    logStream.write(logMessage);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    const logMessage = formatLogMessage('FATAL', 'UnhandledRejection', '', 500, reason.message || reason, reason.stack);
    console.error(logMessage);
    logStream.write(logMessage);
    process.exit(1);
});

// Function to clear the log file
function clearLogFile() {
    fs.truncate(logFilePath, 0, (err) => {
        if (err) {
            console.error(`[ERROR] Failed to clear log file: ${err.message}`);
        } else {
            console.log(`[INFO] Log file cleared: ${logFilePath}`);
        }
    });
}

// Middleware to log system stats
function systemStatsLogger(req, res, next) {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    const statsMessage = `[STATS] Memory Usage: ${JSON.stringify(memoryUsage)}, CPU Usage: ${JSON.stringify(cpuUsage)}, Uptime: ${uptime}s`;
    console.info(statsMessage);
    logStream.write(statsMessage + '\n');
    next();
}

module.exports = {
    errorHandler,
    notFoundHandler,
    requestLogger,
    responseLogger,
    clearLogFile,
    systemStatsLogger
};
