import jwt from "jsonwebtoken";

/**
 *@param {Object} payload   - data to store in token (userId, role, email)
 *@returns {String}         - The JWT token string
 */

export function generateToken(payload) {
    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    console.log("Token generated for user: ", payload.userId);
    return token;
}

/**
 * @param {String} token   - JWT token to verify
 * @returns {Object}       - decoded token data (userId, role, email)
 * @throws {Error}         - if token is invalid or expired
 */

export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token verified for user: ", decoded.userId);
        return decoded;
    } catch (error) {
        console.log("Token verification failed for user: ", error.message);
        
        if (error.name === "TokenExpiredError") {
            throw new Error("Token has expired, please sign in again.");
        }
        if (error.name === "JsonWebTokenError") {
            throw new Error("Invalid token");
        }
        throw error;
    }
}

