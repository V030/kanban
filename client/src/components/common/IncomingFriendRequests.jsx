import React, { useEffect, useState } from "react";
import {
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from "../../services/friendService";


function IncomingFriendRequests({ requests = [] }) {
  const [myFriendRequests, setMyFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    loadMyFriendRequests();
  }, []);

  const handleAccept = async (requestId) => {
    setError("");
    try {
      await acceptFriendRequest(requestId);
      await loadMyFriendRequests();
    } catch (err) {
      setError(err.message || "Failed to accept friend request.");
    }
  };

  const handleDecline = async (requestId) => {
    setError("");
    try {
      await declineFriendRequest(requestId);
      await loadMyFriendRequests();
    } catch (err) {
      setError(err.message || "Failed to decline friend request.");
    }
  };

  if (loading) return <p>Loading sent friend requests...</p>;
  if (error) return <p className="friends-error">{error}</p>; 
  if (myFriendRequests.length === 0) {
    return <p className="friends-empty">No incoming requests.</p>;
  }

  return (
    <div className="friends-list">
      {myFriendRequests.map((friendRequests) => (
        <div key={friendRequests.id} className="friends-row friends-row-actions">
          <div className="friends-row-main">
            <div className="friends-avatar">{friendRequests.initials}</div>
            <div className="friends-meta">
                <p className="friends-name">{friendRequests.first_name} {friendRequests.last_name}</p>
                <p className="friends-email">{friendRequests.email}</p>
            </div>
          </div>

          <div className="request-actions">
            <button type="button" className="request-btn accept-btn" onClick={() => handleAccept(friendRequests.id)}>Accept</button>
            <button type="button" className="request-btn decline-btn" onClick={() => handleDecline(friendRequests.id)}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default IncomingFriendRequests;
