const multer = require("multer");

/**
 * Global error handler.
 * Keep this after all routes in server.js.
 */
const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((item) => item.message);

    return res.status(400).json({
      success: false,
      message: messages.join(", ")
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID"
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate field value entered"
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
};

/**
 * Route not found handler.
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFound
};