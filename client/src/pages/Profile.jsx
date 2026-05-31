import { useCallback, useRef, useState, useEffect } from "react";
import { useToast } from "../hooks/useToast";
import {
    getCurrentUser,
    changePassword,
    updateProfile,
    requestProfileEmailVerificationCode,
    verifyProfileEmailVerificationCode,
} from "../services/authService";
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

const OTP_LENGTH = 6;

function formatCountdown(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function OtpInput({ value, onChange, disabled = false, idPrefix = "profile-email-otp" }) {
    const inputsRef = useRef([]);
    const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || "");

    const updateAt = (index, digit) => {
        const next = digits.slice();
        next[index] = digit;
        onChange(next.join(""));
    };

    const handleChange = (index, rawValue) => {
        const numeric = String(rawValue || "").replace(/\D/g, "");
        if (!numeric) {
            updateAt(index, "");
            return;
        }

        if (numeric.length > 1) {
            const next = digits.slice();
            numeric.slice(0, OTP_LENGTH).split("").forEach((digit, offset) => {
                if (index + offset < OTP_LENGTH) next[index + offset] = digit;
            });
            onChange(next.join(""));
            inputsRef.current[Math.min(index + numeric.length, OTP_LENGTH - 1)]?.focus();
            return;
        }

        updateAt(index, numeric);
        if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, event) => {
        if (event.key === "Backspace" && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus();
        if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            inputsRef.current[index - 1]?.focus();
        }
        if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
            event.preventDefault();
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handlePaste = (event) => {
        const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (pasted.length !== OTP_LENGTH) return;
        event.preventDefault();
        onChange(pasted);
        inputsRef.current[OTP_LENGTH - 1]?.focus();
    };

    return (
        <div className="otp-input-group" role="group" aria-label="Six digit verification code" onPaste={handlePaste}>
            {digits.map((digit, index) => (
                <input
                    key={`${idPrefix}-${index}`}
                    ref={(node) => { inputsRef.current[index] = node; }}
                    id={`${idPrefix}-${index}`}
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={digit}
                    disabled={disabled}
                    aria-label={`Verification code digit ${index + 1}`}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                />
            ))}
        </div>
    );
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
    const [emailOtp, setEmailOtp] = useState("");
    const [emailOtpToken, setEmailOtpToken] = useState("");
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [emailOtpExpiresIn, setEmailOtpExpiresIn] = useState(0);
    const [emailOtpResendIn, setEmailOtpResendIn] = useState(0);
    const [emailOtpLoading, setEmailOtpLoading] = useState(false);
    const [emailOtpError, setEmailOtpError] = useState("");

    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User";
    const initials = `${(user?.firstName || "").charAt(0)}${(user?.lastName || "").charAt(0)}`.toUpperCase() || "U";
    const accountImageSource = normalizeProfileImage(
        editFormData.profileImageBase64 || user?.profileImageBase64 || user?.profile_image_base64 || ""
    );

    // Reset image error when the source changes (new upload, remove, or user change)
    useEffect(() => {
        setImageError(false);
    }, [editFormData.profileImageBase64, user?.profileImageBase64, user?.profile_image_base64]);

    useEffect(() => {
        if (!emailOtpExpiresIn && !emailOtpResendIn) return undefined;
        const timer = window.setInterval(() => {
            setEmailOtpExpiresIn((value) => Math.max(0, value - 1));
            setEmailOtpResendIn((value) => Math.max(0, value - 1));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [emailOtpExpiresIn, emailOtpResendIn]);

    const emailChanged = String(editFormData.email || "").trim().toLowerCase() !== String(user?.email || "").trim().toLowerCase();

    const resetEmailVerification = useCallback(() => {
        setEmailOtp("");
        setEmailOtpToken("");
        setEmailOtpSent(false);
        setEmailOtpExpiresIn(0);
        setEmailOtpResendIn(0);
        setEmailOtpError("");
    }, []);

    const sendEmailChangeCode = useCallback(async () => {
        const nextEmail = String(editFormData.email || "").trim().toLowerCase();
        if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
            setEmailOtpError("Enter a valid new email address");
            return;
        }

        setEmailOtpLoading(true);
        setEmailOtpError("");

        try {
            const result = await requestProfileEmailVerificationCode(nextEmail);
            setEmailOtpSent(true);
            setEmailOtp("");
            setEmailOtpToken("");
            setEmailOtpExpiresIn(result?.expiresInSeconds || 600);
            setEmailOtpResendIn(result?.resendAfterSeconds || 60);
            toast.showInfo("Verification code sent.");
        } catch (error) {
            setEmailOtpError(error?.message || "Unable to send verification code.");
        } finally {
            setEmailOtpLoading(false);
        }
    }, [editFormData.email, toast]);

    const verifyEmailChangeCode = useCallback(async () => {
        const nextEmail = String(editFormData.email || "").trim().toLowerCase();
        if (!/^\d{6}$/.test(emailOtp)) {
            setEmailOtpError("Enter the 6-digit verification code");
            return;
        }

        setEmailOtpLoading(true);
        setEmailOtpError("");

        try {
            const result = await verifyProfileEmailVerificationCode(nextEmail, emailOtp);
            setEmailOtpToken(result.verificationToken);
            toast.showSuccess("Email verified.");
        } catch (error) {
            setEmailOtpError(error?.message || "Invalid or expired verification code.");
        } finally {
            setEmailOtpLoading(false);
        }
    }, [editFormData.email, emailOtp, toast]);

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
            if (emailChanged && !emailOtpToken) {
                toast.showValidationError("Please verify your new email before saving.");
                return;
            }

            setLoading(true);
            try {
                await updateProfile(
                    editFormData.firstName,
                    editFormData.lastName,
                    editFormData.email,
                    editFormData.profileImageBase64,
                    emailChanged ? emailOtpToken : undefined
                );
                toast.showSuccess("Profile updated successfully!");
                resetEmailVerification();
            } catch (error) {
                toast.showError(error?.message || "Failed to update profile");
            } finally {
                setLoading(false);
            }
        },
        [editFormData, emailChanged, emailOtpToken, resetEmailVerification, toast]
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
        if (name === "email") resetEmailVerification();
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
                        <div>
                            <h1 className="page-title">Account Settings</h1>
                            <p className="page-subtitle">Manage your profile details, password, and communication preferences.</p>
                        </div>
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
                        disabled
                    >
                        Notifications
                    </button>
                    <button
                        className={`profile-tab ${activeTab === "privacy" ? "active" : ""}`}
                        onClick={() => setActiveTab("privacy")}
                        disabled
                    >
                        Privacy
                    </button>
                </nav>
            </header>

            {activeTab === "account" && (
                <div className="profile-content profile-account-layout">
                    <section className="profile-settings-card">
                        <div className="section-title">PERSONAL DETAILS</div>
                        <form onSubmit={handleProfileUpdate} className="profile-form profile-settings-form">
                            <div className="profile-inline-photo">
                                {accountImageSource && !imageError ? (
                                    <img
                                        src={accountImageSource}
                                        alt={fullName}
                                        className="profile-inline-avatar"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="profile-inline-avatar">{initials}</div>
                                )}

                                <div className="profile-photo-copy">
                                    <div className="profile-photo-name">{fullName}</div>
                                    <div className="profile-photo-actions">
                                        <button
                                            type="button"
                                            className="profile-photo-link"
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={loading}
                                        >
                                            Change
                                        </button>
                                        <span aria-hidden="true">|</span>
                                        <button
                                            type="button"
                                            className="profile-photo-link profile-photo-link-danger"
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
                            </div>

                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="profile-avatar-upload-input"
                                onChange={handleAvatarUpload}
                            />

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="firstName">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={editFormData.firstName}
                                        onChange={handleEditInputChange}
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
                                        onChange={handleEditInputChange}
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
                                    onChange={handleEditInputChange}
                                    disabled={loading}
                                    required
                                />
                            </div>

                            {emailChanged && (
                                <div className="email-verification-section profile-email-verification">
                                    <div className="email-verification-header">
                                        <div>
                                            <strong>Email Verification</strong>
                                            {emailOtpToken ? (
                                                <span>New email verified</span>
                                            ) : emailOtpSent && emailOtpExpiresIn > 0 ? (
                                                <span>Code expires in {formatCountdown(emailOtpExpiresIn)}</span>
                                            ) : (
                                                <span>Verify this address before saving</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={sendEmailChangeCode}
                                            disabled={loading || emailOtpLoading || (emailOtpSent && emailOtpResendIn > 0)}
                                        >
                                            {emailOtpLoading && !emailOtpSent ? "Sending..." : emailOtpSent ? "Resend Code" : "Send Code"}
                                        </button>
                                    </div>

                                    {emailOtpSent && !emailOtpToken && (
                                        <>
                                            <OtpInput
                                                value={emailOtp}
                                                onChange={(value) => { setEmailOtp(value); setEmailOtpError(""); }}
                                                disabled={loading || emailOtpLoading || emailOtpExpiresIn <= 0}
                                            />
                                            {emailOtpResendIn > 0 && <small>Resend available in {emailOtpResendIn}s</small>}
                                            {emailOtpExpiresIn <= 0 && <small className="field-error-text">Code expired. Please resend a new code.</small>}
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm"
                                                onClick={verifyEmailChangeCode}
                                                disabled={loading || emailOtpLoading || emailOtp.length !== OTP_LENGTH || emailOtpExpiresIn <= 0}
                                            >
                                                {emailOtpLoading ? "Verifying..." : "Verify Code"}
                                            </button>
                                        </>
                                    )}

                                    {emailOtpError && <div className="field-error-text">{emailOtpError}</div>}
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="bio">Bio</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={editFormData.bio}
                                    onChange={handleEditInputChange}
                                    disabled={loading}
                                    rows={4}
                                    placeholder="Tell us about yourself"
                                />
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={loading}
                                    onClick={() => setEditFormData({
                                        firstName: user?.firstName || "",
                                        lastName: user?.lastName || "",
                                        email: user?.email || "",
                                        profileImageBase64: user?.profileImageBase64 || "",
                                        bio: user?.bio || "",
                                    })}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading || (emailChanged && !emailOtpToken)}>
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="profile-settings-card">
                        <div className="section-title">CHANGE PASSWORD</div>
                        <form onSubmit={handlePasswordChange} className="profile-form profile-settings-form profile-password-form">
                            <div className="form-group">
                                <label htmlFor="currentPassword">Current Password</label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    name="currentPassword"
                                    value={passwordFormData.currentPassword}
                                    onChange={handlePasswordInputChange}
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
                                    onChange={handlePasswordInputChange}
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
                                    onChange={handlePasswordInputChange}
                                    placeholder="Re-enter new password"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={loading}
                                    onClick={() => setPasswordFormData({ currentPassword: "", newPassword: "", confirmPassword: "" })}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? "Updating..." : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {activeTab === "notifications" && (
                <div className="profile-content profile-secondary-layout">
                    <div className="profile-details-section full-width profile-secondary-card">
                        <div className="section-title">NOTIFICATIONS</div>
                        <p>Notification settings coming soon...</p>
                    </div>
                </div>
            )}

            {activeTab === "privacy" && (
                <div className="profile-content profile-secondary-layout">
                    <div className="profile-details-section full-width profile-secondary-card">
                        <div className="section-title">PRIVACY</div>
                        <p>Privacy settings coming soon...</p>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Profile;
