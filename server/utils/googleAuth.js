import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const googleClient = new OAuth2Client(process.env.CLIENT_ID);
const googleCodeClient = new OAuth2Client(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "postmessage"
);

/**
 * Verify Google ID token and extract user information
 * @param {String} token - Google ID token from frontend
 * @returns {Object} - { googleId, email, firstName, lastName, profilePictureUrl, emailVerified }
 * @throws {Error} - if token is invalid or verification fails
 */
export async function verifyGoogleToken(token) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.CLIENT_ID,
    });

    const payload = ticket.getPayload();

    return {
      googleId: payload.sub, // Google's unique user ID
      email: payload.email,
      firstName: payload.given_name || "",
      lastName: payload.family_name || "",
      profilePictureUrl: payload.picture || null,
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    console.error("Google token verification failed:", error.message);
    throw new Error("Invalid Google token");
  }
}

export async function exchangeGoogleAuthCode(code) {
  try {
    const { tokens } = await googleCodeClient.getToken(code);

    if (!tokens.id_token) {
      throw new Error("Google did not return an identity token");
    }

    const googleUser = await verifyGoogleToken(tokens.id_token);

    return {
      googleUser,
    };
  } catch (error) {
    console.error("Google auth code exchange failed:", error.message);
    throw new Error(error?.message || "Unable to complete Google authorization");
  }
}
