import React from "react";

function FriendsList({ friends = [] }) {
  if (friends.length === 0) {
    return <p className="friends-empty">No friends yet.</p>;
  }

  return (
    <div className="friends-list">
      {friends.map((friend) => (
        <div key={friend.id} className="friends-row friends-row-actions">
          <div className="friends-row-main">
            <div className="friends-avatar">{friend.initials}</div>
            <div className="friends-meta">
              <p className="friends-name">{friend.name}</p>
              <p className="friends-email">{friend.email}</p>
            </div>
          </div>

          <button type="button" className="friend-more-btn" aria-label="More actions">...</button>
        </div>
      ))}
    </div>
  );
}

export default FriendsList;
