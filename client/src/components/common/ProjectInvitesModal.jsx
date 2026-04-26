import React, { useEffect, useState } from "react";
import {
  getProjectInvitations,
  acceptProjectInvitation,
  declineProjectInvitation,
} from "../../services/projectService";
import "./CreateProjectModal.css";

export default function ProjectInvitesModal({ isOpen, onClose }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    loadInvites();
  }, [isOpen]);

  async function loadInvites() {
    setLoading(true);
    setError("");

    try {
      const data = await getProjectInvitations();
      setInvites(data.projectInvitations || []);
    } catch (err) {
      setError(err?.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(requestId) {
    setError("");
    setActionLoadingId(requestId);

    try {
      await acceptProjectInvitation(requestId);
      await loadInvites();
    } catch (err) {
      setError(err?.message || "Failed to accept invitation");
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleDecline(requestId) {
    setError("");
    setActionLoadingId(requestId);

    try {
      await declineProjectInvitation(requestId);
      await loadInvites();
    } catch (err) {
      setError(err?.message || "Failed to decline invitation");
    } finally {
      setActionLoadingId("");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-wide">
        <div className="modal-header">
          <h2>Project Invitations</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">You have pending invitations to collaborate on these projects. Review the invite details below and accept or decline when ready.</p>

          {loading && <p>Loading invitations...</p>}
          {error && <p className="error-message">{error}</p>}
          {!loading && !error && invites.length === 0 && <p>No pending invitations right now.</p>}

          {!loading && !error && invites.length > 0 && (
          <div className="invite-list">
            {invites.map((inv) => (
              <div key={inv.id} className="invite-row">
                <div className="invite-main">
                  <div className="friend-initials large">{`${(inv.senderFirstName || "").charAt(0)}${(inv.senderLastName || "").charAt(0)}`.toUpperCase()}</div>
                  <div>
                    <div className="invite-project-name">{inv.projectName}</div>
                    <div className="invite-sender">Invited by {`${inv.senderFirstName || ""} ${inv.senderLastName || ""}`.trim() || inv.senderEmail}</div>
                  </div>
                </div>

                <div className="invite-actions">
                  <div className="invite-date">{new Date(inv.requestedAt).toLocaleString()}</div>
                  <button
                    className="accept-btn"
                    type="button"
                    onClick={() => handleAccept(inv.id)}
                    disabled={actionLoadingId === inv.id}
                  >
                    {actionLoadingId === inv.id ? "Working..." : "Accept"}
                  </button>
                  <button
                    className="decline-btn"
                    type="button"
                    onClick={() => handleDecline(inv.id)}
                    disabled={actionLoadingId === inv.id}
                  >
                    {actionLoadingId === inv.id ? "Working..." : "Decline"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
