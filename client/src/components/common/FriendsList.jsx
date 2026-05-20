import React, { useEffect, useRef, useState } from "react";
import normalizeProfileImage from "../../utils/normalizeProfileImage";

function getFriendDisplayInitials(friend) {
  const first = friend?.firstName || friend?.first_name || friend?.name?.split?.(" ")?.[0] || "";
  const last = friend?.lastName || friend?.last_name || friend?.name?.split?.(" ")?.[1] || "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || (friend?.initials || "U");
}

function FriendsList({ friends = [], onUnfriend, pendingFriendRemovalId = "" }) {
  const [openMenuId, setOpenMenuId] = useState("");
  const menuWrapRef = useRef(null);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!openMenuId) return;
      if (event.target?.closest?.(".friend-more-menu-wrap")) return;
      setOpenMenuId("");
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [openMenuId]);

  if (friends.length === 0) {
    return (
      <div className="empty-state-card friends-empty-state">
        <h3>No friends yet</h3>
        <p>Your friends list will appear here once you connect with people.</p>
      </div>
    );
  }

  return (
    <div className="friends-list">
      {friends.map((friend) => (
        <div key={friend.id} className="friends-row friends-row-actions">
          <div className="friends-row-main">
            {(() => {
              const src = normalizeProfileImage(
                friend?.profileImageBase64 ||
                friend?.profile_image_base64 ||
                friend?.avatar ||
                friend?.avatarUrl ||
                friend?.imageUrl ||
                friend?.profileImage ||
                null
              );

              return src ? (
                <div className="friends-avatar"><img src={src} alt={friend.name || friend.email || "Profile"} /></div>
              ) : (
                <div className="friends-avatar">{friend.initials || getFriendDisplayInitials(friend)}</div>
              );
            })()}
            <div className="friends-meta">
              <p className="friends-name">{friend.name}</p>
              <p className="friends-email">{friend.email}</p>
              {friend.isPending && <p className="friends-pending">Pending...</p>}
            </div>
          </div>

          <div className="friend-more-menu-wrap" ref={openMenuId === String(friend.id) ? menuWrapRef : null}>
            <button
              type="button"
              className="friend-more-btn"
              aria-label="More actions"
              aria-expanded={openMenuId === String(friend.id)}
              aria-haspopup="menu"
              onClick={() => {
                setOpenMenuId((current) => (current === String(friend.id) ? "" : String(friend.id)));
              }}
              disabled={friend.isPending || pendingFriendRemovalId === String(friend.id)}
            >
              ...
            </button>

            {openMenuId === String(friend.id) && (
              <div className="friend-more-menu" role="menu" aria-label={`Actions for ${friend.name || friend.email || "friend"}`}>
                <button
                  type="button"
                  className="friend-more-menu-item friend-more-menu-item--danger"
                  role="menuitem"
                  onClick={() => {
                    setOpenMenuId("");
                    onUnfriend?.(friend);
                  }}
                  disabled={pendingFriendRemovalId === String(friend.id)}
                >
                  {pendingFriendRemovalId === String(friend.id) ? "Removing..." : "Unfriend"}
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default FriendsList;
