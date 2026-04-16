import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per windowMs for auth routes
  message: {
    success: false,
    message: "Too many attempts from this IP, please try again after 5 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 1/2 hour
  max: 5, // Limit each IP to 5 OTP requests per hour
  message: {
    success: false,
    message: "Too many OTP requests from this IP, please try again after an hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

