import React, { useEffect, useState } from "react";
import {
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from "../../services/friendService";


function IncomingFriendRequests({
  requests,
  onRequestsChange,
  onFriendOptimisticAdd,
  onFriendRollback,
  onSync,
}) {
  const [myFriendRequests, setMyFriendRequests] = useState(Array.isArray(requests) ? requests : []);
  const [loading, setLoading] = useState(!Array.isArray(requests));
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState({});

  const loadMyFriendRequests = async () => {
    setLoading(true);
    setError("");

    try{
      const data = await getFriendRequests();
      setMyFriendRequests(data.myFriendRequests || []);
    } catch (err) {
      setError(err.message || "Failed loading friend requests.")
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Array.isArray(requests)) {
      loadMyFriendRequests();
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(requests)) return;
    setMyFriendRequests(requests);
    setLoading(false);
  }, [requests]);

  const handleAccept = async (requestId) => {
    setError("");
    const previousRequests = Array.isArray(myFriendRequests) ? [...myFriendRequests] : [];
    const requestItem = previousRequests.find((req) => String(req?.id) === String(requestId));
    const nextRequests = previousRequests.filter((req) => String(req?.id) !== String(requestId));
    const tempFriendId = `temp-friend-${requestId}`;
    const optimisticFriend = requestItem
      ? {
          id: tempFriendId,
          initials: `${(requestItem.first_name || "").charAt(0)}${(requestItem.last_name || "").charAt(0)}`.toUpperCase(),
          name: `${requestItem.first_name || ""} ${requestItem.last_name || ""}`.trim(),
          email: requestItem.email,
          isPending: true,
        }
      : null;
    try {
      setMyFriendRequests(nextRequests);
      onRequestsChange?.(nextRequests);
      if (optimisticFriend) {
        onFriendOptimisticAdd?.(optimisticFriend);
      }
      setPendingIds((prev) => ({ ...prev, [String(requestId)]: true }));

      await acceptFriendRequest(requestId);
      await onSync?.();
    } catch (err) {
      setMyFriendRequests(previousRequests);
      onRequestsChange?.(previousRequests);
      onFriendRollback?.(tempFriendId);
      setError(err.message || "Failed to accept friend request.");
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev };
        delete next[String(requestId)];
        return next;
      });
    }
  };

  const handleDecline = async (requestId) => {
    setError("");
    const previousRequests = Array.isArray(myFriendRequests) ? [...myFriendRequests] : [];
    const nextRequests = previousRequests.filter((req) => String(req?.id) !== String(requestId));
    try {
      setMyFriendRequests(nextRequests);
      onRequestsChange?.(nextRequests);
      setPendingIds((prev) => ({ ...prev, [String(requestId)]: true }));

      await declineFriendRequest(requestId);
      await onSync?.();
    } catch (err) {
      setMyFriendRequests(previousRequests);
      onRequestsChange?.(previousRequests);
      setError(err.message || "Failed to decline friend request.");
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev };
        delete next[String(requestId)];
        return next;
      });
    }
  };

  if (loading) return <p className="status-text">Loading incoming requests...</p>;
  if (error) return <p className="friends-error">{error}</p>; 
  if (myFriendRequests.length === 0) {
    return <p className="friends-empty">No incoming requests.</p>;
  }

  return (
    <div className="friends-list">
      {myFriendRequests.map((friendRequests) => (
        <div key={friendRequests.id} className="friends-row friends-row-actions">
          <div className="friends-row-main">
            <div className="friends-avatar">{`${(friendRequests.first_name || "").charAt(0)}${(friendRequests.last_name || "").charAt(0)}`.toUpperCase()}</div>
            <div className="friends-meta">
                <p className="friends-name">{friendRequests.first_name} {friendRequests.last_name}</p>
                <p className="friends-email">{friendRequests.email}</p>
                {friendRequests.isPending && <p className="friends-pending">Pending...</p>}
            </div>
          </div>

          <div className="request-actions">
            <button
              type="button"
              className="request-btn accept-btn"
              onClick={() => handleAccept(friendRequests.id)}
              disabled={pendingIds[String(friendRequests.id)]}
            >
              {pendingIds[String(friendRequests.id)] ? "Updating..." : "Accept"}
            </button>
            <button
              type="button"
              className="request-btn decline-btn"
              onClick={() => handleDecline(friendRequests.id)}
              disabled={pendingIds[String(friendRequests.id)]}
            >
              {pendingIds[String(friendRequests.id)] ? "Updating..." : "Decline"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default IncomingFriendRequests;
