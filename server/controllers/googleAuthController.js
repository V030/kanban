import { verifyGoogleToken } from "../utils/googleAuth.js";
import { findOrCreateGoogleUser } from "../models/authModel.js";
import { generateToken } from "../utils/jwt.js";

/**
 * Google OAuth authentication endpoint
 * Verifies Google token, finds/creates user, and returns JWT
 * @route POST /auth/google
 * @param {Object} req - Express request
 * @param {String} req.body.token - Google ID token from frontend
 * @returns {Object} - { message, token, user }
 */
export async function googleAuth(req, res) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Google token is required" });
  }

  try {
    // Step 1: Verify Google token and extract user info
    const googleUser = await verifyGoogleToken(token);

    // Step 2: Find existing user or create new one
    const user = await findOrCreateGoogleUser(
      googleUser.googleId,
      googleUser.email,
      googleUser.firstName,
      googleUser.lastName,
      googleUser.profilePictureUrl
    );

    // Step 3: Generate JWT token for session management
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const jwtToken = generateToken(payload);

    // Step 4: Return success response with token and user info
    return res.status(200).json({
      message: "Google authentication successful",
      token: jwtToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        profileImageBase64: user.profile_picture_url,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({
      message: error.message || "Google authentication failed",
    });
  }
}
