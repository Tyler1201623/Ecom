// cacheMiddleware.js
const cache = require('memory-cache');

// Middleware to cache responses
const cacheMiddleware = (duration) => (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        console.log(`[CACHE] Returning cached response for ${key}`);
        return res.send(cachedResponse);
    }

    res.sendResponse = res.send;
    res.send = (body) => {
        cache.put(key, body, duration * 1000);
        console.log(`[CACHE] Caching response for ${key} for ${duration} seconds`);
        res.sendResponse(body);
    };

    next();
};

// Function to clear cache for a specific route
const clearCache = (route) => {
    const key = `__express__${route}`;
    cache.del(key);
    console.log(`[CACHE] Clearing cache for ${key}`);
};

module.exports = { cacheMiddleware, clearCache };
