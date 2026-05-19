import { useCallback, useRef, useState, useEffect } from "react";
import { useToast } from "../hooks/useToast";
import { getCurrentUser, changePassword, updateProfile } from "../services/authService";
import "../components/styles/WorkspacePages.css";
import "../components/styles/SkeletonLoading.css";
import normalizeProfileImage from "../utils/normalizeProfileImage";

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();
            image.onload = () => {
                const maxSize = 512;
                let width = image.width;
                let height = image.height;

                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext("2d");
                if (!context) {
                    reject(new Error("Failed to process selected image"));
                    return;
                }

                context.drawImage(image, 0, 0, width, height);
                const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.82);
                resolve(optimizedBase64);
            };

            image.onerror = () => reject(new Error("Failed to process selected image"));
            image.src = reader.result;
        };

        reader.onerror = () => reject(new Error("Failed to read selected image"));
        reader.readAsDataURL(file);
    });
}

function Profile() {
    const toast = useToast();
    const user = getCurrentUser();
    const avatarInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState("account");
    const [editFormData, setEditFormData] = useState({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        profileImageBase64: user?.profileImageBase64 || "",
        bio: user?.bio || "",
    });
    const [passwordFormData, setPasswordFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User";
    const initials = `${(user?.firstName || "").charAt(0)}${(user?.lastName || "").charAt(0)}`.toUpperCase() || "U";
    const accountImageSource = normalizeProfileImage(
        editFormData.profileImageBase64 || user?.profileImageBase64 || user?.profile_image_base64 || ""
    );

    // Reset image error when the source changes (new upload, remove, or user change)
    useEffect(() => {
        setImageError(false);
    }, [editFormData.profileImageBase64, user?.profileImageBase64, user?.profile_image_base64]);

    const handleProfileUpdate = useCallback(
        async (e) => {
            e.preventDefault();

            if (!editFormData.firstName.trim()) {
                toast.showValidationError("First name is required");
                return;
            }
            if (!editFormData.lastName.trim()) {
                toast.showValidationError("Last name is required");
                return;
            }
            if (!editFormData.email.trim()) {
                toast.showValidationError("Email is required");
                return;
            }

            setLoading(true);
            try {
                await updateProfile(
                    editFormData.firstName,
                    editFormData.lastName,
                    editFormData.email,
                    editFormData.profileImageBase64
                );
                toast.showSuccess("Profile updated successfully!");
            } catch (error) {
                toast.showError(error?.message || "Failed to update profile");
            } finally {
                setLoading(false);
            }
        },
        [editFormData, toast]
    );

    const handlePasswordChange = useCallback(
        async (e) => {
            e.preventDefault();

            // Validation
            if (!passwordFormData.currentPassword) {
                toast.showValidationError("Current password is required");
                return;
            }
            if (!passwordFormData.newPassword) {
                toast.showValidationError("New password is required");
                return;
            }
            if (passwordFormData.newPassword.length < 6) {
                toast.showValidationError("New password must be at least 6 characters");
                return;
            }
            if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
                toast.showValidationError("Passwords do not match");
                return;
            }

            setLoading(true);
            try {
                await changePassword(passwordFormData.currentPassword, passwordFormData.newPassword);
                toast.showSuccess("Password changed successfully!");
                setPasswordFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } catch (error) {
                toast.showError(error?.message || "Failed to change password");
            } finally {
                setLoading(false);
            }
        },
        [passwordFormData, toast]
    );

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleProfileImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.showValidationError("Please select a valid image file");
            return;
        }

        try {
            const base64 = await toBase64(file);
            setEditFormData((prev) => ({ ...prev, profileImageBase64: base64 }));
        } catch (error) {
            toast.showError(error?.message || "Failed to process selected image");
        }
    };

    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.showValidationError("Please choose a valid image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.showValidationError("Please choose an image smaller than 5MB.");
            return;
        }

        setLoading(true);

        try {
            const profileImageBase64 = await toBase64(file);
            await updateProfile(undefined, undefined, undefined, profileImageBase64);
            setEditFormData((prev) => ({ ...prev, profileImageBase64 }));
            toast.showSuccess("Profile picture updated successfully!");
        } catch (error) {
            toast.showError(error?.message || "Failed to update profile picture");
        } finally {
            setLoading(false);
            if (avatarInputRef.current) {
                avatarInputRef.current.value = "";
            }
        }
    };

    return (
        <section className="page-shell profile-page">
            <header className="profile-header workspace-hero">
                <div className="profile-hero-content">
                    <div className="profile-hero-main">
                        <div className="profile-hero-avatar-wrap">
                            {accountImageSource && !imageError ? (
                                <img
                                    src={accountImageSource}
                                    alt={fullName}
                                    className="profile-avatar-lg"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="profile-avatar-lg">{initials}</div>
                            )}
                        </div>

                        <div>
                            <p className="profile-hero-eyebrow">Account Center</p>
                            <h1 className="page-title">Account Settings</h1>
                            <p className="page-subtitle">Manage your profile details, password, and communication preferences.</p>
                        </div>
                    </div>

                    <div className="profile-hero-meta" aria-hidden="true">
                        <div className="profile-hero-chip">Secure workspace</div>
                        <div className="profile-hero-chip">Member profile</div>
                    </div>
                </div>

                <nav className="profile-tabs">
                    <button
                        className={`profile-tab ${activeTab === "account" ? "active" : ""}`}
                        onClick={() => setActiveTab("account")}
                    >
                        Account
                    </button>
                    <button
                        className={`profile-tab ${activeTab === "notifications" ? "active" : ""}`}
                        onClick={() => setActiveTab("notifications")}
                    >
                        Notifications
                    </button>
                    <button
                        className={`profile-tab ${activeTab === "privacy" ? "active" : ""}`}
                        onClick={() => setActiveTab("privacy")}
                    >
                        Privacy
                    </button>
                </nav>
            </header>

            {activeTab === "account" && (
                <div className="profile-content">
                    <div className="profile-photo-section">
                        <div className="section-title">PROFILE PHOTO</div>
                        <div className="photo-preview">
                            {accountImageSource && !imageError ? (
                                <img
                                    src={accountImageSource}
                                    alt={fullName}
                                    className="preview-img"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="preview-placeholder">{initials}</div>
                            )}
                        </div>
                        <div className="photo-size-hint">JPG, PNG or GIF. 1MB max.</div>
                        <div className="photo-actions">
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="profile-avatar-upload-input"
                                onChange={handleAvatarUpload}
                            />
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => avatarInputRef.current?.click()}
                                disabled={loading}
                            >
                                Change Photo
                            </button>
                            <button
                                type="button"
                                className="btn btn-text-danger"
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        await updateProfile(undefined, undefined, undefined, "");
                                        setEditFormData((prev) => ({ ...prev, profileImageBase64: "" }));
                                        toast.showSuccess("Profile picture removed");
                                    } catch (error) {
                                        toast.showError("Failed to remove profile picture");
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading || !accountImageSource}
                            >
                                Remove
                            </button>
                        </div>
                    </div>

                    <div className="profile-details-section">
                        <div className="section-title">PERSONAL DETAILS</div>
                        <form onSubmit={handleProfileUpdate} className="profile-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="firstName">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={editFormData.firstName}
                                        onChange={(e) => setEditFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="lastName">Last Name</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={editFormData.lastName}
                                        onChange={(e) => setEditFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="bio">Bio</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={editFormData.bio}
                                    onChange={(e) => setEditFormData((prev) => ({ ...prev, bio: e.target.value }))}
                                    disabled={loading}
                                    rows={4}
                                    placeholder="Tell us about yourself"
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" disabled={loading}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="profile-details-section full-width">
                        <div className="section-title">CHANGE PASSWORD</div>
                        <form onSubmit={handlePasswordChange} className="profile-form">
                            <div className="form-group">
                                <label htmlFor="currentPassword">Current Password</label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={passwordFormData.currentPassword}
                                    onChange={(e) => setPasswordFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                                    placeholder="Enter your current password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    name="newPassword"
                                    value={passwordFormData.newPassword}
                                    onChange={(e) => setPasswordFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
                                    placeholder="Enter new password (min. 6 characters)"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={passwordFormData.confirmPassword}
                                    onChange={(e) => setPasswordFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                    placeholder="Re-enter new password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" disabled={loading}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? "Updating..." : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === "notifications" && (
                <div className="profile-content">
                    <div className="profile-details-section full-width">
                        <div className="section-title">NOTIFICATIONS</div>
                        <p>Notification settings coming soon...</p>
                    </div>
                </div>
            )}

            {activeTab === "privacy" && (
                <div className="profile-content">
                    <div className="profile-details-section full-width">
                        <div className="section-title">PRIVACY</div>
                        <p>Privacy settings coming soon...</p>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Profile;