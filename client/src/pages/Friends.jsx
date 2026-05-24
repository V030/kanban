import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "../hooks/useToast";
import HeroActionButton from "../components/common/HeroActionButton";
import { AddFriendIcon } from "../components/common/AppIcons";
import FriendsList from "../components/common/FriendsList";
import IncomingFriendRequests from "../components/common/IncomingFriendRequests";
import SentFriendRequests from "../components/common/SentFriendRequests";
import AddFriendsModal from "../components/common/AddFriendsModal";
import { SkeletonAvatarWithText } from "../components/common/SkeletonComponents";
import { getFriends, getSentFriendRequests, getFriendRequests, removeFriend } from "../services/friendService";
import ConfirmModal from "../components/common/ConfirmModal";
import "../components/styles/FriendsPage.css";
import "../components/styles/SkeletonLoading.css";

function Friends() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("friends");
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState([]);
  const [myFriendRequests, setMyFriendRequests] = useState([]);

  const [friendsLoading, setFriendsLoading] = useState(false);
  const [pendingFriendRemovalId, setPendingFriendRemovalId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [candidateFriend, setCandidateFriend] = useState(null);

  const loadFriends = useCallback(async (options = {}) => {
    const silent = options.silent === true;
    if (!silent) {
      setFriendsLoading(true);
    }

    try {
      const data = await getFriends();
      const mappedFriends = (data.friends || []).map((friend) => ({
        id: friend.id,
        friendshipId: (() => {
          const raw = friend.friendshipId || friend.friendship_id || null;
          const n = Number(raw);
          return Number.isInteger(n) && n > 0 ? n : null;
        })(),
        initials: `${(friend.firstName || "").charAt(0)}${(friend.lastName || "").charAt(0)}`.toUpperCase(),
        name: `${friend.firstName || ""} ${friend.lastName || ""}`.trim(),
        email: friend.email,
        profileImageBase64: friend.profileImageBase64 || friend.profile_image_base64 || null,
      }));
      setFriends(mappedFriends);
    } catch (err) {
      toast.showError(err.message || "Failed to load friends");
    } finally {
      if (!silent) {
        setFriendsLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const loadSentFriendRequests = useCallback(async () => {
    try {
      const data = await getSentFriendRequests();
      setSentFriendRequests(data.sentFriendRequests || []);
    } catch (err) {
      toast.showError(err.message || "Failed to load sent requests");
    }
  }, [toast]);

  useEffect(() => { loadSentFriendRequests(); }, [loadSentFriendRequests]);

  const loadIncomingFriendRequests = useCallback(async () => {
    try {
      const data = await getFriendRequests();
      setMyFriendRequests(data.myFriendRequests || []);
    } catch (err) {
      toast.showError(err.message || "Failed to load friend requests");
    }
  }, [toast]);

  useEffect(() => { loadIncomingFriendRequests(); }, [loadIncomingFriendRequests]);

  useEffect(() => {
    const handleRealtime = (event) => {
      const detail = event?.detail || {};
      const type = String(detail.type || "").toLowerCase();
      const relevant = new Set(["friend_request", "friend_request_accepted"]);
      if (!relevant.has(type)) return;

      loadFriends({ silent: true });
      loadSentFriendRequests();
      loadIncomingFriendRequests();
    };

    window.addEventListener("notifications:push", handleRealtime);
    return () => window.removeEventListener("notifications:push", handleRealtime);
  }, [loadFriends, loadSentFriendRequests, loadIncomingFriendRequests]);

  const handleFriendRequestCreated = async () => {
    await loadFriends({ silent: true });
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

  // Open confirmation modal for unfriend
  const handleUnfriend = (friend) => {
    if (!friend) return;
    setCandidateFriend(friend);
    setConfirmOpen(true);
  };

  const performUnfriend = async () => {
    const friend = candidateFriend;
    setConfirmOpen(false);
    setCandidateFriend(null);
    const fid = friend?.friendshipId != null ? Number(friend.friendshipId) : null;

    let target = null;
    if (fid && Number.isInteger(fid) && fid > 0) {
      target = fid;
    } else if (friend?.id && String(friend.id).includes("-")) {
      // Fallback: treat friend.id as UUID and call delete with that param
      target = friend.id;
    } else {
      toast.showError("Unable to remove this friend right now (invalid friendship id).");
      return;
    }

    setPendingFriendRemovalId(String(friend.id || target));

    try {
      await removeFriend(target);
      toast.showSuccess("Friend removed successfully.");
      await loadFriends({ silent: true });
    } catch (err) {
      toast.showError(err.message || "Failed to remove friend");
    } finally {
      setPendingFriendRemovalId("");
    }
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
            <h1 className="page-title">Your Network</h1>
            <p className="page-subtitle">Manage network, requests, and outgoing invitations.</p>
          </div>

          <HeroActionButton
            icon={<AddFriendIcon />}
            label="Add Friend"
            variant="primary"
            onClick={() => setIsAddFriendOpen(true)}
          />
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
              <>
                <div style={{ textAlign: "center" }}>
                  <p className="status-text">Loading friends...</p>
                </div>
                <div className="skeleton-list">
                  <SkeletonAvatarWithText />
                  <SkeletonAvatarWithText />
                  <SkeletonAvatarWithText />
                  <SkeletonAvatarWithText />
                </div>
              </>
            ) : (
              <FriendsList
                friends={friends}
                onUnfriend={handleUnfriend}
                pendingFriendRemovalId={pendingFriendRemovalId}
              />
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
      
        <div className="page-footer-strip">
          <p>Friend requests and network updates stay in sync in real time.</p>
          
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

      <ConfirmModal
        isOpen={confirmOpen}
        title="Remove Friend"
        message={`Remove ${candidateFriend?.name || "this friend"} from your friends list?`}
        confirmLabel="Unfriend"
        cancelLabel="Cancel"
        onConfirm={performUnfriend}
        onCancel={() => { setConfirmOpen(false); setCandidateFriend(null); }}
      />
    </section>
  );
}

export default Friends;