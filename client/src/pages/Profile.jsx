import { useMemo, useState } from "react";
import { getCurrentUser } from "../services/authService";
import "../components/styles/WorkspacePages.css";

function Profile() {
    const user = useMemo(() => getCurrentUser(), []);
    const [preferences, setPreferences] = useState({
        boardUpdates: true,
        memberInvites: true,
        compactCards: false,
    });

    const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Workspace user";
    const initials = `${(user?.first_name || "").charAt(0)}${(user?.last_name || "").charAt(0)}`.toUpperCase() || "TU";

    const updatePreference = (name) => {
        setPreferences((prev) => ({ ...prev, [name]: !prev[name] }));
    };

    return (
        <section className="page-shell profile-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Profile & Settings</h1>
                    <p className="page-subtitle">
                        Keep your account details and workspace preferences organized in one place.
                    </p>
                </div>
                <div className="profile-header-actions">
                    <button type="button" className="btn btn-secondary">
                        Security
                    </button>
                    <button type="button" className="btn btn-primary">
                        Save Preferences
                    </button>
                </div>
            </header>

            <div className="profile-grid">
                <section className="profile-card">
                    <div className="profile-banner">
                        <div className="profile-avatar">{initials}</div>
                        <div>
                            <h2>{fullName}</h2>
                            <p>{user?.email || "No email available"}</p>
                        </div>
                    </div>

                    <div className="info-row">
                        <h4>Role</h4>
                        <p>{user?.role || "member"}</p>
                    </div>

                    <div className="info-row">
                        <h4>Workspace Access</h4>
                        <p>Manage boards, collaborate on tasks, and monitor project progress.</p>
                    </div>

                    <div className="info-row">
                        <h4>Session</h4>
                        <p>Your session is authenticated and active for this browser.</p>
                    </div>
                </section>

                <section className="profile-card">
                      <h2>Notification Preferences</h2>
                    <p>Choose what matters most so updates stay useful and focused.</p>

                    <label className="profile-switch">
                        <span>Board status updates</span>
                        <input
                            type="checkbox"
                            checked={preferences.boardUpdates}
                            onChange={() => updatePreference("boardUpdates")}
                        />
                    </label>

                    <label className="profile-switch">
                        <span>Member invitation alerts</span>
                        <input
                            type="checkbox"
                            checked={preferences.memberInvites}
                            onChange={() => updatePreference("memberInvites")}
                        />
                    </label>

                    <label className="profile-switch">
                        <span>Compact task card mode</span>
                        <input
                            type="checkbox"
                            checked={preferences.compactCards}
                            onChange={() => updatePreference("compactCards")}
                        />
                    </label>
                </section>
            </div>
        </section>
    );
}

export default Profile;