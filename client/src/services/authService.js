// src/services/authService.js

const API_URL = "http://localhost:5000";


export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No token found. Please log in.");
  }
  
  console.log("Making authenticated request to:", url);
  
  // add Authorization header
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    "Authorization": `Bearer ${token}`  // this sends token to backend
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // handles token expiration
  if (response.status === 401 || response.status === 403) {
    console.log("Token invalid or expired. Logging out...");
    logout();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Request failed");
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

    localStorage.setItem("user", JSON.stringify(data.user));

    console.log("Token stored. User role:", data.user.role);

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
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
}

export function logout() {
  console.log("Logging out...");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  console.log("Token cleared");
}

export function getCurrentUser() {
  const userJson = localStorage.getItem("user");
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error("Error parsing user data.");
    return null;
  }
}

export async function getProfile() {
  return fetchWithAuth(`${API_URL}/api/protected/profile`);
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
