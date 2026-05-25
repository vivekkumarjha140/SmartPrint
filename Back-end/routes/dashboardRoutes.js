const express = require("express");
const { getDashboardStats } = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { cache } = require("../middleware/cacheMiddleware");

const router = express.Router();

router.get(
  "/stats",
  protect,
  authorize("admin", "manager", "staff"),
  cache((req) => `dashboard:stats:${req.user.role}`, 60),
  getDashboardStats
);

module.exports = router;