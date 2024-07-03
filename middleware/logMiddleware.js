const fs = require('fs');
const path = require('path');

// Create a write stream for logging to a file
const logFilePath = path.join(__dirname, '../logs', 'access.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Function to log general requests
function logMiddleware(req, res, next) {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function (body) {
        const responseTime = Date.now() - startTime;
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body,
            responseStatus: res.statusCode,
            responseTime: `${responseTime}ms`,
        };

        const logMessage = `[${logEntry.timestamp}] ${logEntry.method} ${logEntry.url} - Status: ${logEntry.responseStatus} - Response Time: ${logEntry.responseTime} - Headers: ${JSON.stringify(logEntry.headers)} - Body: ${JSON.stringify(logEntry.body)}\n`;
        console.log(logMessage);
        logStream.write(logMessage);

        originalSend.call(this, body);
    };

    next();
}

// Function to log specific actions
function logAction(action) {
    return (req, res, next) => {
        const details = JSON.stringify(req.body);
        const currentTime = new Date().toISOString();
        const logMessage = `[${currentTime}] Action: ${action} - Details: ${details}\n`;
        console.log(logMessage);
        logStream.write(logMessage);
        next();
    };
}

// Handle logging of uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
    const logMessage = `[${new Date().toISOString()}] Uncaught Exception: ${error.message}\nStack: ${error.stack}\n`;
    console.error(logMessage);
    logStream.write(logMessage);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    const logMessage = `[${new Date().toISOString()}] Unhandled Rejection: ${reason}\nPromise: ${promise}\n`;
    console.error(logMessage);
    logStream.write(logMessage);
});

module.exports = { logMiddleware, logAction };
