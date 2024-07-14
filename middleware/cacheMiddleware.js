const cache = require('memory-cache');

// Middleware to cache responses
const cacheMiddleware = (duration) => (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        console.log(`[CACHE] Returning cached response for ${key}`);
        res.setHeader('X-Cache-Hit', 'true');
        return res.send(cachedResponse);
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

// Function to clear cache for a specific route
const clearCache = (route) => {
    const key = `__express__${route}`;
    cache.del(key);
    console.log(`[CACHE] Clearing cache for ${key}`);
};

// Function to clear all cache
const clearAllCache = () => {
    cache.clear();
    console.log(`[CACHE] Clearing all cache`);
};

// Middleware to log cache statistics
const cacheStatsLogger = (req, res, next) => {
    const size = cache.size();
    const keys = cache.keys();
    console.log(`[CACHE] Current cache size: ${size}`);
    console.log(`[CACHE] Current cached keys: ${keys.join(', ')}`);
    next();
};

// Middleware to conditionally cache responses based on request method
const conditionalCacheMiddleware = (duration) => (req, res, next) => {
    if (req.method !== 'GET') {
        return next();
    }
    return cacheMiddleware(duration)(req, res, next);
};

// Middleware to cache responses with cache invalidation on data change
const cacheWithInvalidation = (duration, invalidationRoutes = []) => (req, res, next) => {
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse && !invalidationRoutes.includes(req.originalUrl || req.url)) {
        console.log(`[CACHE] Returning cached response for ${key}`);
        res.setHeader('X-Cache-Hit', 'true');
        return res.send(cachedResponse);
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

// Enhanced function to clear cache based on invalidation routes
const clearInvalidationCache = (routes) => {
    routes.forEach((route) => {
        const key = `__express__${route}`;
        cache.del(key);
        console.log(`[CACHE] Clearing cache for ${key}`);
    });
};

module.exports = {
    cacheMiddleware,
    clearCache,
    clearAllCache,
    cacheStatsLogger,
    conditionalCacheMiddleware,
    cacheWithInvalidation,
    clearInvalidationCache
};
