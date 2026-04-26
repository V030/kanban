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
    try {
      const data = await getSentFriendRequests();
      setSentFriendRequests(data.sentFriendRequests || []);
    } catch (err) {
      console.error(err.message || "Failed to load sent requests");
    }
  };

  useEffect(() => {
    loadSentFriendRequests();
  }, []);

  const loadIncomingFriendRequests = async () => {
    try {
      const data = await getFriendRequests();
      setMyFriendRequests(data.myFriendRequests || []);
    } catch (err) {
      console.error(err.message || "Failed to load friend requests");
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
    <section className="page-shell friends-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Team Network</h1>
          <p className="page-subtitle">Manage collaborators, incoming requests, and outgoing invitations.</p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => setIsAddFriendOpen(true)}>
          Add Member
        </button>
      </header>

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
          <p className="status-text">Loading members...</p>
        ) : friendsError ? (
          <p className="status-text error">{friendsError}</p>
        ) : (
          <FriendsList friends={friends} />
        )
      ) : (
        <div className="requests-grid">
          <section>
            <h2 className="request-section-title">Incoming Requests ({myFriendRequests.length})</h2>
            <IncomingFriendRequests requests={myFriendRequests} />
          </section>

          <section>
            <h2 className="request-section-title">Sent Requests ({sentFriendRequests.length})</h2>
            <SentFriendRequests requests={sentFriendRequests} />
          </section>
        </div>
      )}

      <AddFriendsModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onCreated={handleFriendRequestCreated}
      />
    </section>
  );
}

export default Friends;
