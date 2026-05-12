// src/services/authService.js

const API_URL = "http://localhost:5000";


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
  
  const response = await fetch(url, {
    ...restOptions,
    headers,
  });
  
  // handle token expiration/authentication failure
  if (response.status === 401) {
    console.log("Token invalid or expired. Logging out...");
    logout();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  
  if (!response.ok) {
    let errorMessage = "Request failed";

    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch {
      const fallbackText = await response.text();
      if (fallbackText) {
        errorMessage = fallbackText;
      }
    }

    if (response.status === 413) {
      errorMessage = "Image is too large. Please choose a smaller file.";
    }

    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    const data = await response.json();

    console.log("Login successful. Storing token...");

    localStorage.setItem("token", data.token);
    // cache user in-memory only; do not persist user object to localStorage
    cachedUser = data.user || null;

    console.log("Token stored. User role:", cachedUser?.role);

    return data;
}

export async function register(
    first_name, 
    last_name, 
    email, 
    password
  ) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ first_name, last_name, email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Registration failed");
  }

  const data = await response.json();

  localStorage.setItem("token", data.token);
  cachedUser = data.user || null;
  return data;
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
