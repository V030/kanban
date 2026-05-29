import React, { useEffect, useState, useRef } from "react";
import { useToast } from "../../hooks/useToast";
import {
  getProjectInvitations,
  acceptProjectInvitation,
  declineProjectInvitation,
} from "../../services/projectService";
import "./CreateProjectModal.css";

export default function ProjectInvitesModal({ isOpen, onClose }) {
  const toast = useToast();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingInviteIds, setPendingInviteIds] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    loadInvites();
  }, [isOpen]);

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      clearTimeout(timerRef.current);
      setShouldRender(true);
      setIsClosing(false);
      return;
    }

    if (shouldRender) {
      setIsClosing(true);
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 220);
    }

    return () => clearTimeout(timerRef.current);
  }, [isOpen, shouldRender]);

  async function loadInvites() {
    setLoading(true);

    try {
      const data = await getProjectInvitations();
      setInvites(data.projectInvitations || []);
    } catch (err) {
      toast.showError(err?.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(requestId) {
    const previousInvites = Array.isArray(invites) ? [...invites] : [];
    setInvites((prev) => (prev || []).filter((inv) => String(inv.id) !== String(requestId)));
    setPendingInviteIds((prev) => ({ ...prev, [String(requestId)]: "accept" }));

    try {
      await acceptProjectInvitation(requestId);
      toast.showSuccess("Invitation accepted!");
      await loadInvites();
    } catch (err) {
      setInvites(previousInvites);
      toast.showError(err?.message || "Failed to accept invitation");
    } finally {
      setPendingInviteIds((prev) => {
        const next = { ...prev };
        delete next[String(requestId)];
        return next;
      });
    }
  }

  async function handleDecline(requestId) {
    const previousInvites = Array.isArray(invites) ? [...invites] : [];
    setInvites((prev) => (prev || []).filter((inv) => String(inv.id) !== String(requestId)));
    setPendingInviteIds((prev) => ({ ...prev, [String(requestId)]: "decline" }));

    try {
      await declineProjectInvitation(requestId);
      toast.showSuccess("Invitation declined!");
      await loadInvites();
    } catch (err) {
      setInvites(previousInvites);
      toast.showError(err?.message || "Failed to decline invitation");
    } finally {
      setPendingInviteIds((prev) => {
        const next = { ...prev };
        delete next[String(requestId)];
        return next;
      });
    }
  }

  if (!shouldRender) return null;

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`}>
      <div className={`modal-content modal-content-wide${isClosing ? " is-closing" : ""}`}>
        <div className="modal-header">
          <h2>Project Invitations</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">You have pending invitations to collaborate on these projects. Review the invite details below and accept or decline when ready.</p>

          {loading && <p>Loading invitations...</p>}
          {!loading && invites.length === 0 && <p>No pending invitations right now.</p>}

          {!loading && invites.length > 0 && (
          <div className="invite-list">
            {invites.map((inv) => {
              const pendingAction = pendingInviteIds[String(inv.id)];
              const isPending = Boolean(pendingAction);
              const pendingLabel = pendingAction === "decline" ? "Declining..." : "Accepting...";

              return (
                <div key={inv.id} className="invite-row">
                  <div className="invite-main">
                    <div className="friend-initials large">{`${(inv.senderFirstName || "").charAt(0)}${(inv.senderLastName || "").charAt(0)}`.toUpperCase()}</div>
                    <div>
                      <p className="invite-sender">Project:</p>
                      <div className="invite-project-name">{inv.projectName}</div>
                      <div className="invite-sender">Invited by <b>{`${inv.senderFirstName || ""} ${inv.senderLastName || ""}`.trim() || inv.senderEmail}</b></div>
                      <div className="invite-date">On: {new Date(inv.requestedAt).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="invite-actions">
                    <button
                      className="accept-btn"
                      type="button"
                      onClick={() => handleAccept(inv.id)}
                      disabled={isPending}
                    >
                      {isPending && pendingAction === "accept" ? pendingLabel : "Accept"}
                    </button>
                    <button
                      className="decline-btn"
                      type="button"
                      onClick={() => handleDecline(inv.id)}
                      disabled={isPending}
                    >
                      {isPending && pendingAction === "decline" ? pendingLabel : "Decline"}
                    </button>
                  </div>
                </div>
              );
            })}
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
