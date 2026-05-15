import React, { useEffect, useState } from "react";
import FriendsList from "../components/common/FriendsList";
import IncomingFriendRequests from "../components/common/IncomingFriendRequests";
import SentFriendRequests from "../components/common/SentFriendRequests";
import AddFriendsModal from "../components/common/AddFriendsModal";
import { SkeletonAvatarWithText } from "../components/common/SkeletonComponents";
import { getFriends, getSentFriendRequests, getFriendRequests } from "../services/friendService";
import "../components/styles/FriendsPage.css";
import "../components/styles/SkeletonLoading.css";

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
        profileImageBase64: friend.profileImageBase64 || friend.profile_image_base64 || null,
      }));
      setFriends(mappedFriends);
    } catch (err) {
      setFriendsError(err.message || "Failed to load friends");
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => { loadFriends(); }, []);

  const loadSentFriendRequests = async () => {
    try {
      const data = await getSentFriendRequests();
      setSentFriendRequests(data.sentFriendRequests || []);
    } catch (err) {
      console.error(err.message || "Failed to load sent requests");
    }
  };

  useEffect(() => { loadSentFriendRequests(); }, []);

  const loadIncomingFriendRequests = async () => {
    try {
      const data = await getFriendRequests();
      setMyFriendRequests(data.myFriendRequests || []);
    } catch (err) {
      console.error(err.message || "Failed to load friend requests");
    }
  };

  useEffect(() => { loadIncomingFriendRequests(); }, []);

  const handleFriendRequestCreated = async () => {
    await loadFriends();
    await loadSentFriendRequests();
    await loadIncomingFriendRequests();
  };

  const handleIncomingRequestsChange = (nextRequests) => {
    setMyFriendRequests(Array.isArray(nextRequests) ? nextRequests : []);
  };

  const handleSentRequestsChange = (nextRequests) => {
    setSentFriendRequests(Array.isArray(nextRequests) ? nextRequests : []);
  };

  const handleOptimisticFriendAdd = (friend) => {
    if (!friend) return;
    setFriends((prev) => [friend, ...(prev || [])]);
  };

  const handleFriendRollback = (tempId) => {
    if (!tempId) return;
    setFriends((prev) => (prev || []).filter((item) => String(item?.id) !== String(tempId)));
  };

  const handleOptimisticSentCreate = (request) => {
    if (!request) return;
    setSentFriendRequests((prev) => [request, ...(prev || [])]);
  };

  const handleSentCreateResolved = (tempId, createdRequest) => {
    if (!tempId) return;
    setSentFriendRequests((prev) =>
      (prev || []).map((item) => {
        if (String(item?.id) !== String(tempId)) return item;
        if (!createdRequest) return { ...item, isPending: false };
        return { ...item, ...createdRequest, isPending: false };
      })
    );
  };

  const handleSentCreateFailed = (tempId) => {
    if (!tempId) return;
    setSentFriendRequests((prev) => (prev || []).filter((item) => String(item?.id) !== String(tempId)));
  };

  const totalRequests = myFriendRequests.length + sentFriendRequests.length;

  return (
    <section className="page-shell friends-page">
      <header className="workspace-hero">
        <div className="workspace-hero-content">
          <div>
            <h1 className="page-title">Team Network</h1>
            <p className="page-subtitle">Manage collaborators, incoming requests, and outgoing invitations.</p>
          </div>

          <button type="button" className="btn btn-primary" onClick={() => setIsAddFriendOpen(true)}>
            Add Member
          </button>
        </div>
      </header>

      <section className="friends-shell">
        {/* ── Tabs ── */}
        <div className="friends-tabs">
          <button
            type="button"
            className={`friends-tab ${activeTab === "friends" ? "active" : ""}`}
            onClick={() => setActiveTab("friends")}
          >
            My Friends
            <span className="friends-tab-badge">{friends.length}</span>
          </button>

          <button
            type="button"
            className={`friends-tab ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            Friend Requests
            {totalRequests > 0 && (
              <span className="friends-tab-badge">{totalRequests}</span>
            )}
          </button>
        </div>

        {/* ── Tab content ── */}
        <div className="friends-tab-content">
          {activeTab === "friends" ? (
            friendsLoading ? (
              <div className="skeleton-list">
                <SkeletonAvatarWithText />
                <SkeletonAvatarWithText />
                <SkeletonAvatarWithText />
                <SkeletonAvatarWithText />
              </div>
            ) : friendsError ? (
              <p className="friends-error">{friendsError}</p>
            ) : (
              <FriendsList friends={friends} />
            )
          ) : (
            <div className="requests-grid">
              <section>
                <h2
                  className="request-section-title"
                  data-count={myFriendRequests.length}
                >
                  Incoming
                </h2>
                <IncomingFriendRequests
                  requests={myFriendRequests}
                  onRequestsChange={handleIncomingRequestsChange}
                  onFriendOptimisticAdd={handleOptimisticFriendAdd}
                  onFriendRollback={handleFriendRollback}
                  onSync={handleFriendRequestCreated}
                />
              </section>

              <section>
                <h2
                  className="request-section-title"
                  data-count={sentFriendRequests.length}
                >
                  Sent
                </h2>
                <SentFriendRequests
                  requests={sentFriendRequests}
                  onRequestsChange={handleSentRequestsChange}
                  onSync={handleFriendRequestCreated}
                />
              </section>
            </div>
          )}
        </div>
      </section>

      <AddFriendsModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onCreated={handleFriendRequestCreated}
        onOptimisticCreate={handleOptimisticSentCreate}
        onCreateResolved={handleSentCreateResolved}
        onCreateFailed={handleSentCreateFailed}
      />
    </section>
  );
}

export default Friends;