const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Admin dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private/Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalOrdersPromise = Order.countDocuments();

  const totalUnitsPromise = Order.aggregate([
    {
      $group: {
        _id: null,
        totalUnits: { $sum: "$quantity" },
        revenue: { $sum: "$pricing.estimatedTotal" }
      }
    }
  ]);

  const statusStatsPromise = Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  const monthlyStatsPromise = Order.aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        orders: { $sum: 1 },
        revenue: { $sum: "$pricing.estimatedTotal" },
        units: { $sum: "$quantity" }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1
      }
    },
    {
      $limit: 12
    }
  ]);

  const designStatsPromise = Order.aggregate([
    {
      $group: {
        _id: "$design",
        orders: { $sum: 1 },
        units: { $sum: "$quantity" },
        revenue: { $sum: "$pricing.estimatedTotal" }
      }
    },
    {
      $sort: {
        orders: -1
      }
    }
  ]);

  const [
    totalOrders,
    totalUnitsResult,
    statusStats,
    monthlyStats,
    designStats
  ] = await Promise.all([
    totalOrdersPromise,
    totalUnitsPromise,
    statusStatsPromise,
    monthlyStatsPromise,
    designStatsPromise
  ]);

  const totals = totalUnitsResult[0] || {
    totalUnits: 0,
    revenue: 0
  };

  const pendingOrders =
    statusStats.find((item) => item._id === "pending")?.count || 0;

  const deliveredOrders =
    statusStats.find((item) => item._id === "delivered")?.count || 0;

  res.status(200).json({
    success: true,
    data: {
      totalOrders,
      totalUnits: totals.totalUnits,
      revenue: totals.revenue,
      pendingOrders,
      deliveredOrders,
      statusStats,
      monthlyStats,
      designStats
    }
  });
});

module.exports = {
  getDashboardStats
};