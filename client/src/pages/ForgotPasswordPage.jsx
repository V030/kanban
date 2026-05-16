import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestPasswordResetOtp, resetPasswordWithOtp } from "../services/authService";
import "../components/styles/WorkspacePages.css";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordResetOtp(email.trim());
      setStep("reset");
      setMessage("If the email exists, a reset code has been sent.");
    } catch (requestError) {
      setError(requestError.message || "Failed to request password reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!otp.trim()) {
      setError("OTP is required");
      return;
    }

    if (!newPassword) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOtp(email.trim(), otp.trim(), newPassword);
      setMessage("Password reset successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1400);
    } catch (resetError) {
      setError(resetError.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <aside className="auth-brand">
          <div>
            <h1>Reset access without losing the workspace flow.</h1>
            <p>
              Request a one-time code for your account email, then set a new password that is different from the current one.
            </p>
          </div>
          <div className="auth-brand-list">
            <span>Email-based OTP delivery</span>
            <span>Single-use reset code</span>
            <span>Protected against password reuse</span>
          </div>
        </aside>

        <div className="auth-content">
          <h2>Forgot Password</h2>
          <p>{step === "request" ? "Enter your email to receive a reset code." : "Enter the code and choose a new password."}</p>

          {message && <p className="auth-error" style={{ color: "var(--color-success)" }}>{message}</p>}
          {error && <p className="auth-error">{error}</p>}

          {step === "request" ? (
            <form className="auth-form" onSubmit={handleRequestOtp}>
              <div className="auth-field">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="auth-actions">
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Code"}
                </button>
                <Link className="btn btn-secondary" to="/login">
                  Back to Login
                </Link>
              </div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="auth-field">
                <label htmlFor="forgot-email-confirm">Email</label>
                <input
                  id="forgot-email-confirm"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="forgot-otp">OTP</label>
                <input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="forgot-new-password">New Password</label>
                <input
                  id="forgot-new-password"
                  type="password"
                  placeholder="Create a new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="forgot-confirm-password">Confirm Password</label>
                <input
                  id="forgot-confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              <div className="auth-actions">
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setStep("request")}>
                  Change Email
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;