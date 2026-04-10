import { addFriend as addFriendModel, 
         getFriends as getFriendsModel,
         getSentFriendRequests as getSentRequests,
         getIncomingFriendRequests as getMyFriendRequests,
         acceptFriendRequest as acceptFriendRequestModel,
         declineFriendRequest as declineFriendRequestModel,
         cancelFriendRequest as cancelFriendRequestModel,
        } from "../models/friendModel.js";

export async function addFriend(req, res) {
  const requesterId = req.user?.userId;
  const requesterEmail = (req.user?.email || "").trim().toLowerCase();
  const email = (req.body?.email || "").trim().toLowerCase();

  if (!requesterId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!email) {
    return res.status(400).json({ message: "E-Mail is required." });
  }

  if (requesterEmail && requesterEmail === email) {
    return res.status(400).json({ message: "You cannot add yourself as a friend." });
  }

  try {
    const friendRequest = await addFriendModel({ requesterId, email });
    return res.status(201).json({
      message: "Friend request sent successfully",
      friendRequest: friendRequest || null,
    });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Friend request already exists." });
    }

    if (error?.code === "ALREADY_FRIENDS") {
      return res.status(409).json({ message: "You are already friends." });
    }

    if (error?.code === "FRIEND_NOT_FOUND" || error?.code === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "No user found with that email." });
    }

    if (error?.code === "SELF_FRIEND_REQUEST") {
      return res.status(400).json({ message: "You cannot add yourself as a friend." });
    }

    console.error("Add friend error:", error);
    return res.status(500).json({ message: "Unable to send friend request" });
  }
}

export async function getFriends(req, res) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const friends = await getFriendsModel(userId);
    return res.status(200).json({ friends });
  } catch (error) {
    console.error("Get friends error:", error);
    return res.status(500).json({ message: "Unable to fetch friends" });
  }
}

export async function getSentFriendRequests(req, res) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const sentRequests = await getSentRequests(userId);
    return res.status(200).json({ sentFriendRequests: sentRequests });
  } catch (error) {
    console.error("Get sent requests error:", error);
    return res.status(500).json({ message: "Unable to fetch sent requests." });
  }
}

export async function getIncomingFriendRequests(req, res) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const friendRequests = await getMyFriendRequests(userId);
    return res.status(200).json({ myFriendRequests: friendRequests });
  } catch (error) {
    console.error("Get sent requests error:", error);
    return res.status(500).json({ message: "Unable to fetch friend requests." });
  }
}

export async function acceptFriendRequest(req, res) {
  const userId = req.user?.userId;
  const { requestId } = req.params;

  if (!userId) return res.status(401).json({ message: "Authentication required" });
  if (!requestId) return res.status(400).json({ message: "Request ID is required" });

  try {
    const result = await acceptFriendRequestModel({ requestId, userId });
    return res.status(200).json({ message: "Friend request accepted", request: result });
  } catch (error) {
    if (error?.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "Friend request not found." });
    }

    if (error?.code === "INVALID_REQUEST_STATUS") {
      return res.status(409).json({ message: "Only pending requests can be accepted." });
    }

    console.error("Accept friend request error:", error);
    return res.status(500).json({ message: "Unable to accept friend request." });
  }
}

export async function declineFriendRequest(req, res) {
  const userId = req.user?.userId;
  const { requestId } = req.params;

  if (!userId) return res.status(401).json({ message: "Authentication required" });
  if (!requestId) return res.status(400).json({ message: "Request ID is required" });

  try {
    const result = await declineFriendRequestModel({ requestId, userId });
    return res.status(200).json({ message: "Friend request declined", request: result });
  } catch (error) {
    if (error?.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "Friend request not found." });
    }

    if (error?.code === "INVALID_REQUEST_STATUS") {
      return res.status(409).json({ message: "Only pending requests can be declined." });
    }

    console.error("Decline friend request error:", error);
    return res.status(500).json({ message: "Unable to decline friend request." });
  }
}

export async function cancelFriendRequest(req, res) {
  const userId = req.user?.userId;
  const { requestId } = req.params;

  if (!userId) return res.status(401).json({ message: "Authentication required" });
  if (!requestId) return res.status(400).json({ message: "Request ID is required" });

  try {
    const result = await cancelFriendRequestModel({ requestId, userId });
    return res.status(200).json({ message: "Friend request canceled", request: result });
  } catch (error) {
    if (error?.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "Friend request not found." });
    }

    if (error?.code === "INVALID_REQUEST_STATUS") {
      return res.status(409).json({ message: "Only pending requests can be canceled." });
    }

    console.error("Cancel friend request error:", error);
    return res.status(500).json({ message: "Unable to cancel friend request." });
  }
}