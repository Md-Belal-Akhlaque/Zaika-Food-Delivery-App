import jwt from "jsonwebtoken";

/**
 * isAuth middleware
 * - Returns 401 if no token or token invalid
 * - Sets req.userId when valid
 */
export const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized - No Token Provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Unauthorized - Invalid Token" });
    }
};

// Added: optionalAuth middleware for routes that benefit from user ID but don't require it
export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = decoded.userId;
            req.userRole = decoded.role;
        }
    } catch (error) {
        // Ignore error and proceed without user info
    }
    next();
};
