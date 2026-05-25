const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  login,
  getMe,
  refreshAccessToken,
  logout
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { validateLogin } = require("../middleware/validationMiddleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});

router.post("/login", loginLimiter, validateLogin, login);

router.get("/me", protect, getMe);

router.post("/refresh-token", refreshAccessToken);

router.post("/logout", logout);

module.exports = router;
