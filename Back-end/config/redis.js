const Redis = require("ioredis");

let redis = null;

const connectRedis = () => {
  if (!process.env.REDIS_URL) {
    console.warn("Redis URL missing. Cache disabled.");
    return null;
  }

  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });

  redis.on("connect", () => {
    console.log("Redis connected");
  });

  redis.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  return redis;
};

const getRedis = () => redis;

module.exports = {
  connectRedis,
  getRedis
};