import React, { useEffect, useState } from "react";
import FriendsList from "../components/common/FriendsList";
import IncomingFriendRequests from "../components/common/IncomingFriendRequests";
import SentFriendRequests from "../components/common/SentFriendRequests";
import AddFriendsModal from "../components/common/AddFriendsModal";
import { getFriends, getSentFriendRequests, getFriendRequests } from "../services/friendService";
import "../components/styles/FriendsPage.css";

function Friends() {
  const [activeTab, setActiveTab] = useState("friends");
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [myFriendRequests, setMyFriendRequests] = useState([]);

  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [sentLoading, setSentLoading] = useState(false);
  const [sentError, setSentError] = useState("");

  const loadFriends = async () => {
    setFriendsLoading(true);
    setFriendsError("");

    try {
      const data = await getFriends();
      const mappedFriends = (data.friends || []).map((friend) => ({
        id: friend.id,
        initials: `${(friend.firstName || "").charAt(0)}${(friend.lastName || "").charAt(0)}`.toUpperCase(),
        name: `${friend.firstName || ""} ${friend.lastName || ""}`.trim(),
        email: friend.email,
      }));
      setFriends(mappedFriends);
    } catch (err) {
      setFriendsError(err.message || "Failed to load friends");
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const loadSentFriendRequests = async () => {
    setSentLoading(true);
    setSentError("");

    try {
      const data = await getSentFriendRequests();
      setSentFriendRequests(data.sentFriendRequests || []);
    } catch (err) {
      setSentError(err.message || "Failed to load sent requests");
    } finally {
      setSentLoading(false);
    }
  };

  useEffect(() => {
    loadSentFriendRequests();
  }, []);

  const loadIncomingFriendRequests = async () => {
    setSentLoading(true);
    setSentError("");

    try {
      const data = await getFriendRequests();
      setMyFriendRequests(data.myFriendRequests || []);
    } catch (err) {
      setSentError(err.message || "Failed to load friend requests");
    } finally {
      setSentLoading(false);
    }
  };

  useEffect(() => {
    loadIncomingFriendRequests();
  }, [])

  const handleFriendRequestCreated = async () => {
    await loadFriends();
    await loadSentFriendRequests();
    await loadIncomingFriendRequests();
  };

  return (
    <div className="friends-page">
      <h1 className="friends-title">Friends</h1>
      <p className="friends-subtitle">Connect with team members and collaborate.</p>

      <button type="button" className="friends-add-btn" onClick={() => setIsAddFriendOpen(true)}>
        + Add Friend
      </button>

      <div className="friends-tabs">
        <button
          type="button"
          className={`friends-tab ${activeTab === "friends" ? "active" : ""}`}
          onClick={() => setActiveTab("friends")}
        >
          My Friends ({friends.length})
        </button>

        <button
          type="button"
          className={`friends-tab ${activeTab === "requests" ? "active" : ""}`}
          onClick={() => setActiveTab("requests")}
        >
          Friend Requests ({myFriendRequests.length + sentFriendRequests.length})
        </button>
      </div>

      {activeTab === "friends" ? (
        friendsLoading ? (
          <p>Loading friends...</p>
        ) : friendsError ? (
          <p className="friends-error">{friendsError}</p>
        ) : (
          <FriendsList friends={friends} />
        )
      ) : (
        <div className="requests-grid">
          <section>
            <h2 className="request-section-title">INCOMING REQUESTS ({myFriendRequests.length})</h2>
            <IncomingFriendRequests requests={myFriendRequests} />
          </section>

          <section>
            <h2 className="request-section-title">SENT REQUESTS ({sentFriendRequests.length})</h2>
            <SentFriendRequests requests={sentFriendRequests} />
          </section>
        </div>
      )}

      <AddFriendsModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onCreated={handleFriendRequestCreated}
      />
    </div>
  );
}

export default Friends;
