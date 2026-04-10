import React, { useEffect, useState } from "react";
import { getSentFriendRequests,
         cancelFriendRequest,
       } from "../../services/friendService";


function SentFriendRequests() {
    const [sentFriendRequests, setSentFriendRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadSentFriendRequests = async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getSentFriendRequests();
            setSentFriendRequests(data.sentFriendRequests || []);
        } catch (err) {
            setError(err.message || "Failed to load friend requests");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSentFriendRequests();
    }, []);

    
    const handleCancel = async (requestId) => {
        setError("");
        try {
            await cancelFriendRequest(requestId);
            await loadSentFriendRequests();
        } catch (err) {
            setError(err.message || "Failed to cancel friend request.");
        }
    }

    if (loading) return <p>Loading sent friend requests...</p>;
    if (error) return <p className="friends-error">{error}</p>; 
    if (sentFriendRequests.length === 0) {
        return <p className="friends-empty">No sent requests.</p>;
    }

    return (
        <div className="friends-list">
        {sentFriendRequests.map((sentRequests) => (
            <div key={sentRequests.id} className="friends-row friends-row-actions">
            <div className="friends-row-main">
                <div className="friends-avatar">{sentRequests.initials}</div>
                <div className="friends-meta">
                    <p className="friends-name">{sentRequests.first_name} {sentRequests.last_name}</p>
                    <p className="friends-email">{sentRequests.last_name}</p>
                </div>
            </div>

            <button type="button" className="request-btn decline-btn" onClick={() => handleCancel(sentRequests.id)}>Cancel</button>
            </div>
        ))}
        </div>
    );
    }

export default SentFriendRequests;
