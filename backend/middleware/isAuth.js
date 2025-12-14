import jwt from "jsonwebtoken";

/**
 * isAuth middleware
 * - Returns 401 if no token or token invalid
 * - Sets req.userId when valid
 */
export const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      // Return a 401 so client knows they are unauthorized
      return res.status(401).json({ success: false, message: "No auth token provided" });
    }

    let decodeToken;
    try {
      decodeToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyErr) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    if (!decodeToken || !decodeToken.userId) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    req.userId = decodeToken.userId;

    return next();
  } catch (err) {
    console.error("isAuth middleware error:", err);
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
};
