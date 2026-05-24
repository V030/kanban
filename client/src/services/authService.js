// src/services/authService.js

import { transformErrorMessage, extractErrorMessage } from "../utils/errorTransformer";

const API_URL = "http://localhost:5000";

const NETWORK_ERROR_EVENT = "kanban:network-error";
const SESSION_EXPIRED_EVENT = "kanban:session-expired";

function redirectToConnectionErrorPage() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(NETWORK_ERROR_EVENT));
}

function redirectToLoginPage() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

/**
 * Centralized handler for unauthorized requests.
 * Only true authentication failures should clear the token.
 * @param {number} status - HTTP status code
 */
function handleAuthFailure(status) {
  console.log(`Auth failure detected (${status}). Logging out...`);
  logout();
  redirectToLoginPage();
}

function handleNetworkFailure(error) {
  const isNetworkFailure =
    error instanceof TypeError ||
    error?.name === "TypeError" ||
    (typeof window !== "undefined" && !window.navigator.onLine);

  if (isNetworkFailure) {
    redirectToConnectionErrorPage();
    throw new Error("Network error. Please check your connection and try again.");
  }

  throw error;
}


export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No token found. Please log in.");
  }
  
  console.log("Making authenticated request to:", url);
  
  // Pull `headers` out so spreading options never duplicates or drops fields (must keep JSON body intact).
  const { headers: incomingHeaders = {}, ...restOptions } = options;

  const optionalHeaders = Object.fromEntries(
    Object.entries(incomingHeaders).filter(([, value]) => value !== undefined)
  );

  const headers = {
    "Content-Type": "application/json",
    ...optionalHeaders,
    Authorization: `Bearer ${token}`,
  };
  
  let response;

  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
    });
  } catch (error) {
    handleNetworkFailure(error);
  }
  
  // Handle auth failures: only 401 means the session/token is no longer valid.
  // 403 means the user is authenticated but not authorized, so keep the token.
  if (response.status === 401) {
    handleAuthFailure(response.status);
    throw new Error("Session expired. Please log in again.");
  }

  if (response.status === 403) {
    const errorMessage = await extractErrorMessage(response);
    const userFriendlyMessage = transformErrorMessage(errorMessage || "Forbidden");
    throw new Error(userFriendlyMessage);
  }
  
  if (!response.ok) {
    let errorMessage = await extractErrorMessage(response);
    
    if (response.status === 413) {
      errorMessage = "Image is too large. Please choose a smaller file.";
    }

    const userFriendlyMessage = transformErrorMessage(errorMessage);
    throw new Error(userFriendlyMessage);
  }
  
  return response.json();
}

export async function login(email, password) {
  let response;

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    handleNetworkFailure(error);
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    const userFriendlyMessage = transformErrorMessage(errorMessage);
    throw new Error(userFriendlyMessage);
  }

  const data = await response.json();

    console.log("Login successful. Storing token...");

    localStorage.setItem("token", data.token);
    // cache user in-memory only; do not persist user object to localStorage
    cachedUser = data.user || null;

    console.log("Token stored. User role:", cachedUser?.role);

    return data;
}

export async function checkEmail(email) {
  const response = await fetch(`${API_URL}/auth/check-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error(data.message || "Email is already taken");
    }
    throw new Error(data.message || "Failed to check email");
  }

  return data;
}

export async function register(
    first_name, 
    last_name, 
    email, 
    password
  ) {
  let response;

  try {
    response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name, last_name, email, password }),
    });
  } catch (error) {
    handleNetworkFailure(error);
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    const userFriendlyMessage = transformErrorMessage(errorMessage);
    throw new Error(userFriendlyMessage);
  }

  const data = await response.json();

  localStorage.setItem("token", data.token);
  cachedUser = data.user || null;
  return data;
}

export async function googleLogin(credentialResponse) {
  try {
    const response = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: credentialResponse.credential }),
    });

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response);
      const userFriendlyMessage = transformErrorMessage(errorMessage);
      throw new Error(userFriendlyMessage);
    }

    const data = await response.json();

    console.log("Google login successful. Storing token...");

    localStorage.setItem("token", data.token);
    cachedUser = data.user || null;

    console.log("Token stored. User role:", cachedUser?.role);

    return data;
  } catch (error) {
    if (error instanceof TypeError || error?.name === "TypeError") {
      handleNetworkFailure(error);
    }

    console.error("Google login error:", error);
    throw error;
  }
}

export async function requestPasswordResetOtp(email) {
  let response;

  try {
    response = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    handleNetworkFailure(error);
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    const userFriendlyMessage = transformErrorMessage(errorMessage);
    throw new Error(userFriendlyMessage);
  }

  return response.json();
}

export async function verifyPasswordResetOtp(email, otp) {
  let response;

  try {
    response = await fetch(`${API_URL}/auth/forgot-password/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
  } catch (error) {
    handleNetworkFailure(error);
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    const userFriendlyMessage = transformErrorMessage(errorMessage);
    throw new Error(userFriendlyMessage);
  }

  return response.json();
}

export async function completePasswordResetWithToken(resetToken, newPassword) {
  let response;

  try {
    response = await fetch(`${API_URL}/auth/forgot-password/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToken, newPassword }),
    });
  } catch (error) {
    handleNetworkFailure(error);
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    const userFriendlyMessage = transformErrorMessage(errorMessage);
    throw new Error(userFriendlyMessage);
  }

  return response.json();
}

export async function resetPasswordWithOtp(email, otp, newPassword) {
  let response;

  try {
    response = await fetch(`${API_URL}/auth/forgot-password/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
  } catch (error) {
    handleNetworkFailure(error);
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    const userFriendlyMessage = transformErrorMessage(errorMessage);
    throw new Error(userFriendlyMessage);
  }

  return response.json();
}

export function logout() {
  console.log("Logging out...");
  localStorage.removeItem("token");
  cachedUser = null;
  console.log("Token cleared");
}

export function getCurrentUser() {
  return cachedUser;
}

export async function getProfile() {
  return fetchWithAuth(`${API_URL}/api/protected/profile`);
}

export async function changePassword(currentPassword, newPassword) {
  return fetchWithAuth(`${API_URL}/api/protected/change-password`, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateProfile(firstName, lastName, email, profileImageBase64) {
  const response = await fetchWithAuth(`${API_URL}/api/protected/profile`, {
    method: "PUT",
    body: JSON.stringify({ firstName, lastName, email, profileImageBase64 }),
  });
  
  // Update cached user with new profile data
  if (response?.user) {
    cachedUser = response.user;
  }
  
  return response;
}

export async function getAllUsers() {
  return fetchWithAuth(`${API_URL}/api/protected/admin/users`);
}

export function getToken() {
  return localStorage.getItem("token");
}

export function isAuthenticated() {
  return !!getToken();
}

export function hasRole(role) {
  const user = getCurrentUser();
  return user && user.role === role;
}

// in-memory cached user; populated on login/register or via explicit hydration
let cachedUser = null;

/**
 * Invalidate the cached user state.
 * This forces a re-fetch on the next access to getCurrentUser.
 */
export function invalidateUserCache() {
  console.log("Invalidating user cache (e.g., due to role change)");
  cachedUser = null;
}

// attempt to hydrate cached user from server using token
export async function hydrateUserFromToken() {
  const token = getToken();
  if (!token) return null;

  try {
    const profile = await getProfile();
    cachedUser = profile?.user || profile || cachedUser;
    return cachedUser;
  } catch (err) {
    return null;
  }
}
