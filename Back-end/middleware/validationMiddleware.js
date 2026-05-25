const { body, query, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  next();
};

const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),

  handleValidationErrors
];

const validateCreateOrder = [
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),

  body("phone")
    .trim()
    .isLength({ min: 7 })
    .withMessage("Valid phone number is required"),

  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive number"),

  body("design")
    .trim()
    .notEmpty()
    .withMessage("Design selection is required"),

  handleValidationErrors
];

const validateStatusUpdate = [
  body("status")
    .isIn([
      "pending",
      "approved",
      "in_production",
      "ready",
      "delivered",
      "cancelled"
    ])
    .withMessage("Invalid order status"),

  body("note")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Note cannot exceed 500 characters"),

  handleValidationErrors
];

const validateOrderQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive number"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("status")
    .optional()
    .isString(),

  query("design")
    .optional()
    .isString(),

  query("search")
    .optional()
    .isString(),

  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateCreateOrder,
  validateStatusUpdate,
  validateOrderQuery
};