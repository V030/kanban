import React, { useEffect, useState } from "react";
import { getSentFriendRequests, cancelFriendRequest } from "../../services/friendService";
import normalizeProfileImage from "../../utils/normalizeProfileImage";

function SentFriendRequests({ requests, onRequestsChange, onSync }) {
  const [sentFriendRequests, setSentFriendRequests] = useState(Array.isArray(requests) ? requests : []);
  const [loading, setLoading] = useState(!Array.isArray(requests));
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState({});

  const loadSentFriendRequests = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getSentFriendRequests();
      setSentFriendRequests(data.sentFriendRequests || []);
    } catch (err) {
      setError(err?.message || "Failed to load friend requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Array.isArray(requests)) {
      loadSentFriendRequests();
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(requests)) return;
    setSentFriendRequests(requests);
    setLoading(false);
  }, [requests]);

  const handleCancel = async (requestId) => {
    setError("");
    const previousRequests = Array.isArray(sentFriendRequests) ? [...sentFriendRequests] : [];
    const nextRequests = previousRequests.filter((req) => String(req?.id) !== String(requestId));

    try {
      setSentFriendRequests(nextRequests);
      onRequestsChange?.(nextRequests);
      setPendingIds((prev) => ({ ...prev, [String(requestId)]: true }));

      await cancelFriendRequest(requestId);
      await onSync?.();
    } catch (err) {
      setSentFriendRequests(previousRequests);
      onRequestsChange?.(previousRequests);
      setError(err?.message || "Failed to cancel friend request.");
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev };
        delete next[String(requestId)];
        return next;
      });
    }
  };

  if (loading) return <p className="status-text">Loading sent requests...</p>;
  if (error) return <p className="friends-error">{error}</p>;
  if (sentFriendRequests.length === 0) return <p className="friends-empty">No sent requests.</p>;

  return (
    <div className="friends-list">
      {sentFriendRequests.map((sentRequests) => {
        const displayName = `${sentRequests.first_name || ""} ${sentRequests.last_name || ""}`.trim() || sentRequests.email || "Pending request";
        const src = normalizeProfileImage(sentRequests?.profileImageBase64 || sentRequests?.profile_image_base64);

        return (
          <div key={sentRequests.id} className="friends-row friends-row-actions">
            <div className="friends-row-main">
              {src ? (
                <div className="friends-avatar"><img src={src} alt={displayName} /></div>
              ) : (
                <div className="friends-avatar">{`${(sentRequests.first_name || "").charAt(0)}${(sentRequests.last_name || "").charAt(0)}`.toUpperCase()}</div>
              )}
              <div className="friends-meta">
                <p className="friends-name">{displayName}</p>
                <p className="friends-email">{sentRequests.email}</p>
                {sentRequests.isPending && <p className="friends-pending">Pending...</p>}
              </div>
            </div>

            <button
              type="button"
              className="request-btn decline-btn"
              onClick={() => handleCancel(sentRequests.id)}
              disabled={pendingIds[String(sentRequests.id)]}
            >
              {pendingIds[String(sentRequests.id)] ? "Updating..." : "Cancel"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default SentFriendRequests;
