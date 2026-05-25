const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");

const getAccessSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const signAccessToken = (userId) => {
  return jwt.sign(
    { id: userId },
    getAccessSecret(),
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m" }
  );
};

const signRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: "refresh" },
    getRefreshSecret(),
    { expiresIn: `${process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7}d` }
  );
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge:
    Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) *
    24 *
    60 *
    60 *
    1000
});

const setRefreshCookie = (res, token) => {
  res.cookie("pf_refresh_token", token, refreshCookieOptions());
};
// const generateToken = (userId) => {
//   return jwt.sign(
//     { id: userId },
//     process.env.JWT_SECRET,
//     {
//       expiresIn: process.env.JWT_EXPIRES_IN || "7d"
//     }
//   );
// };

/**
 * @desc    Admin login
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  const accessToken = signAccessToken(user._id);
const refreshToken = signRefreshToken(user._id);

await RefreshToken.create({
  user: user._id,
  tokenHash: hashToken(refreshToken),
  expiresAt: new Date(
    Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000
  ),
  userAgent: req.headers["user-agent"] || "",
  ip: req.ip
});

setRefreshCookie(res, refreshToken);

res.status(200).json({
  success: true,
  message: "Login successful",
  accessToken,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});
});

/**
 * @desc    Get current logged-in admin
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.pf_refresh_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Refresh token missing"
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, getRefreshSecret());
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token"
    });
  }

  if (decoded.type !== "refresh") {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token"
    });
  }

  const storedToken = await RefreshToken.findOne({
    user: decoded.id,
    tokenHash: hashToken(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!storedToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token revoked or expired"
    });
  }

  const accessToken = signAccessToken(decoded.id);
  const refreshToken = signRefreshToken(decoded.id);

  storedToken.revokedAt = new Date();
  await storedToken.save();

  await RefreshToken.create({
    user: decoded.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(
      Date.now() + Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000
    ),
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip
  });

  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    accessToken
  });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.pf_refresh_token;

  if (token) {
    await RefreshToken.findOneAndUpdate(
      { tokenHash: hashToken(token) },
      { revokedAt: new Date() }
    );
  }

  res.clearCookie("pf_refresh_token", {
    ...refreshCookieOptions(),
    maxAge: undefined
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
});

module.exports = {
  login,
  getMe,
  refreshAccessToken,
  logout
};
