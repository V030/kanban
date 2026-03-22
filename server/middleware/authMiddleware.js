import { verifyToken } from "../utils/jwt.js"

export function authenticateToken(req, res, next) {
    console.log("Auth middleware running...");

    const authHeader = req.headers["authorization"];

    console.log("Auth Header: ", authHeader);

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        console.log("No token provided.");
        return res.status(401).json({
            message: "Access denied. No token provided."
        });
    }

    try {
        const decoded = verifyToken(token);
        console.log("User authenticated:", decoded);
        req.user = decoded;
        next();

    } catch (error) {
        console.log("Token verification failed: ", error.message);
        return res.status(403).json({
            message: "Invalid / Expired token."
        });
    }
}

/**
 * CONCEPT: Authorization Middleware (RBAC)
 * 
 * @param {Array<String>} allowedRoles - list of roles that can access the route
 * @returns {Function} - middleware function
 */

export function authorizeRole(...allowedRoles) {
    return (req, res, next) => {
        console.log("Authorization middleware running...");
        console.log("Allowed roles:", allowedRoles);
        console.log("User role:", req.user?.role);

        if (!req.user) {
                console.log("No user found in request. Did you forget authenticateToken?");
                return res.status(401).json({ 
                message: "Authentication required." 
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
                console.log(`Access denied. User role '${req.user.role}' not in allowed roles.`);
                return res.status(403).json({ 
                message: "Access denied. Insufficient permissions." 
            });
        }

        console.log("User authorized");
        next();
    };
}

