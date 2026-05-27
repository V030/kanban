import { addFriend as addFriendModel, 
         getFriends as getFriendsModel,
         getSentFriendRequests as getSentRequests,
         getIncomingFriendRequests as getMyFriendRequests,
         acceptFriendRequest as acceptFriendRequestModel,
         declineFriendRequest as declineFriendRequestModel,
          cancelFriendRequest as cancelFriendRequestModel,
        removeFriend as removeFriendModel,
        removeFriendByUserIds as removeFriendByUserIdsModel,
        } from "../models/friendModel.js";
import { createNotification, getUserSummary } from "../models/notificationModel.js";

function buildActorPayload(actor) {
  if (!actor) return null;

  return {
    id: actor.id,
    name: actor.displayName || actor.name || actor.email || "Someone",
    profileImageBase64: actor.profileImageBase64 || null,
    profilePictureUrl: actor.profilePictureUrl || null,
  };
}

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

    try {
      const requester = await getUserSummary(requesterId);
      const recipientId = friendRequest?.recipient?.id || friendRequest?.recipient_id;
      if (requester && recipientId) {
        await createNotification({
          type: "friend_request",
          message: `${requester.displayName} sent you a friend request.`,
          payload: {
            actor: buildActorPayload(requester),
            requesterId,
            requestId: friendRequest?.id || null,
          },
          recipientUserId: recipientId,
          url: "/main-page/friends",
        });
      }
    } catch (notifyError) {
      console.error("Friend request notification error:", notifyError);
    }

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

    try {
      const recipient = await getUserSummary(userId);
      if (recipient && result?.requester_id) {
        await createNotification({
          type: "friend_request_accepted",
          message: `${recipient.displayName} accepted your friend request.`,
          payload: {
            actor: buildActorPayload(recipient),
            requestId,
            recipientId: userId,
          },
          recipientUserId: result.requester_id,
          url: "/main-page/friends",
        });
      }
    } catch (notifyError) {
      console.error("Friend request accepted notification error:", notifyError);
    }

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

export async function removeFriend(req, res) {
  const userId = req.user?.userId;
  const { friendshipId } = req.params;

  if (!userId) return res.status(401).json({ message: "Authentication required" });
  if (!friendshipId) return res.status(400).json({ message: "Friendship ID is required" });

  try {
    let removed;

    // If friendshipId looks like a numeric id, use the existing remove by id.
    const asNumber = Number(friendshipId);
    if (Number.isInteger(asNumber) && asNumber > 0) {
      removed = await removeFriendModel({ friendshipId: asNumber, userId });
    } else {
      // Otherwise treat it as the other user's UUID and attempt to remove by user ids.
      removed = await removeFriendByUserIdsModel({ userId, otherUserId: friendshipId });
    }
    return res.status(200).json({ message: "Friend removed", friendship: removed });
  } catch (error) {
    if (error?.code === "INVALID_FRIENDSHIP") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "FRIENDSHIP_NOT_FOUND") {
      return res.status(404).json({ message: "Friendship not found." });
    }

    console.error("Remove friend error:", error);
    return res.status(500).json({ message: "Unable to remove friend." });
  }
}