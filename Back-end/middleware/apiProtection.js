const rateLimit = require("express-rate-limit");

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: {
    success: false,
    message: "Too many payment requests. Please try again later."
  }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "AI usage limit reached. Please try again later."
  }
});

const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many authentication attempts."
  }
});

module.exports = {
  paymentLimiter,
  aiLimiter,
  strictAuthLimiter
};