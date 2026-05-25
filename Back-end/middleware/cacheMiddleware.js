const { getRedis } = require("../config/redis");

const cache = (keyBuilder, ttlSeconds = 60) => {
  return async (req, res, next) => {
    const redis = getRedis();

    if (!redis) return next();

    const key =
      typeof keyBuilder === "function"
        ? keyBuilder(req)
        : keyBuilder;

    try {
      const cached = await redis.get(key);

      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);

      res.json = async (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await redis.set(key, JSON.stringify(body), "EX", ttlSeconds);
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error.message);
      next();
    }
  };
};

const clearCacheByPattern = async (pattern) => {
  const redis = getRedis();

  if (!redis) return;

  const keys = await redis.keys(pattern);

  if (keys.length) {
    await redis.del(keys);
  }
};

module.exports = {
  cache,
  clearCacheByPattern
};