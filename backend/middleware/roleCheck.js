import User from "../models/userModel.js";

/**
 * roleCheck middleware
 * - Returns 403 if user role does not match
 */
export const roleCheck = (roles) => {
  return async (req, res, next) => {
    try {
      // Check role from the token first (optimized to avoid DB hit)
      if (req.role && roles.includes(req.role)) {
        return next();
      }

      // Fallback: if role not in token (e.g., legacy token), check DB
      const user = await User.findById(req.userId).select("role");

      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Requires one of these roles: ${roles.join(", ")}` 
        });
      }

      next();
    } catch (err) {
      console.error("roleCheck middleware error:", err);
      return res.status(500).json({ success: false, message: "Server error during role check" });
    }
  };
};
