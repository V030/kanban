import { fetchWithAuth } from "./authService";

const API_URL = process.env.REACT_APP_API_URL;

export async function addFriend(friendData) {
    return fetchWithAuth(`${API_URL}/auth/friends`, {
        method: "POST",
        body: JSON.stringify(friendData),
    });
}

export async function getFriends() {
    return fetchWithAuth(`${API_URL}/auth/friends`, {
        method: "GET",
    });
}

export async function removeFriend(friendshipId) {
  if (!friendshipId) {
    throw new Error("Friendship ID is required.");
  }

  return fetchWithAuth(`${API_URL}/auth/friends/${friendshipId}`, {
    method: "DELETE",
  });
}

export async function getSentFriendRequests() {
    return fetchWithAuth(`${API_URL}/auth/friends/sent`, {
        method: "GET",
    });
}

export async function getFriendRequests() {
    return fetchWithAuth(`${API_URL}/auth/friends/incoming`, {
        method: "GET",
    });
}

export async function acceptFriendRequest(requestId) {
  return fetchWithAuth(`${API_URL}/auth/friends/requests/${requestId}/accept`, {
    method: "PATCH",
  });
}

export async function declineFriendRequest(requestId) {
  return fetchWithAuth(`${API_URL}/auth/friends/requests/${requestId}/decline`, {
    method: "PATCH",
  });
}

export async function cancelFriendRequest(requestId) {
  return fetchWithAuth(`${API_URL}/auth/friends/requests/${requestId}/cancel`, {
    method: "PATCH", 
  });
}