require("dotenv").config();

const express = require("express");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const http = require("http");
const { initSocket } = require("./realtime/socket");
const paymentRoutes = require("./routes/paymentRoutes");
const aiRoutes = require("./routes/aiRoutes");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");

const {
  paymentLimiter,
  aiLimiter
} = require("./middleware/apiProtection");


// const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");
const orderRoutes = require("./routes/orderRoutes");

const {
  errorHandler,
  notFound
} = require("./middleware/errorMiddleware");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize());
app.use(hpp());

// Connect to MongoDB
connectDB();

// Connect to redis
// connectRedis();

// Middleware
app.use(helmet());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Enable CORS so frontend can communicate with backend
app.use(
  cors({
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:5500"
    ],
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use(generalLimiter);

// Basic health route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Custom T-Shirt Printing Factory API is running"
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payments", paymentLimiter, paymentRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);


// Global 404 handler
app.use(notFound);
app.use(errorHandler);

// Start server
const server = http.createServer(app);

initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
