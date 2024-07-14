const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for logging to a file
const logFilePath = path.join(logsDir, 'access.log');
let logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

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

        const logMessage = `[${logEntry.timestamp}] ${logEntry.method} ${logEntry.url} - Status: ${logEntry.responseStatus} - Response Time: ${logEntry.responseTime}ms - Headers: ${JSON.stringify(logEntry.headers)} - Body: ${JSON.stringify(logEntry.body)}\n`;
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

// Function to rotate log files daily
function rotateLogs() {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const newLogFilePath = path.join(logsDir, `access-${dateStr}.log`);
    logStream.end();
    fs.renameSync(logFilePath, newLogFilePath);
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    console.log(`[${new Date().toISOString()}] Log file rotated to ${newLogFilePath}`);
}

// Schedule log rotation at midnight
const midnight = new Date();
midnight.setHours(24, 0, 0, 0);
const timeToMidnight = midnight.getTime() - Date.now();
setTimeout(() => {
    rotateLogs();
    setInterval(rotateLogs, 24 * 60 * 60 * 1000); // Rotate every 24 hours
}, timeToMidnight);

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
    logMiddleware,
    logAction,
    clearLogFile,
    systemStatsLogger
};
