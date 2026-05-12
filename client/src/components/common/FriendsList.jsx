import React from "react";
import normalizeProfileImage from "../../utils/normalizeProfileImage";

function getFriendDisplayInitials(friend) {
  const first = friend?.firstName || friend?.first_name || friend?.name?.split?.(" ")?.[0] || "";
  const last = friend?.lastName || friend?.last_name || friend?.name?.split?.(" ")?.[1] || "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || (friend?.initials || "U");
}

function FriendsList({ friends = [] }) {
  if (friends.length === 0) {
    return <p className="friends-empty">No friends yet.</p>;
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

          <button type="button" className="friend-more-btn" aria-label="More actions" disabled={friend.isPending}>...</button>
        </div>
      ))}
    </div>
  );
}

export default FriendsList;
