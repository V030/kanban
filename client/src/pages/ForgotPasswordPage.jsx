import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { requestPasswordResetOtp, verifyPasswordResetOtp, completePasswordResetWithToken } from "../services/authService";
import AuthBrand, { AuthLogo } from "../components/common/AuthBrand";
import "../components/styles/WorkspacePages.css";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.showValidationError("Email is required");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordResetOtp(email.trim());
      setStep("verify");
      toast.showInfo("If the email exists, a reset code has been sent.");
    } catch (requestError) {
      toast.showError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.showValidationError("Email is required");
      return;
    }

    if (!otp.trim()) {
      toast.showValidationError("Please enter the code");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPasswordResetOtp(email.trim(), otp.trim());
      setResetToken(res.resetToken);
      setStep("setPassword");
      toast.showSuccess("Code verified! Please enter your new password.");
    } catch (verifyError) {
      toast.showError(verifyError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (event) => {
    event.preventDefault();

    if (!newPassword) {
      toast.showValidationError("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      toast.showValidationError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.showValidationError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await completePasswordResetWithToken(resetToken, newPassword);
      toast.showSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      toast.showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-panel">
        <AuthBrand
          title="Reset access without losing the workspace flow."
          description="Request a one-time code for your account email, then set a new password that is different from the current one."
          items={[
            "Email-based OTP delivery",
            "Single-use reset code",
            "Protected against password reuse",
          ]}
        />

        <div className="auth-content">
          <AuthLogo className="auth-mobile-logo-row" />
          <h2>Forgot Password</h2>
          <p>{step === "request" ? "Enter your email to receive a reset code." : "Enter the code and choose a new password."}</p>

          {step === "request" && (
            <form className="auth-form" onSubmit={handleRequestOtp}>
              <div className="auth-field">
                <label htmlFor="forgot-email">Email</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="youremail@email.com"
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
          )}

          {step === "verify" && (
            <form className="auth-form" onSubmit={handleVerifyOtp}>
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

              <div className="auth-actions">
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setStep("request")}>
                  Change Email
                </button>
              </div>
            </form>
          )}

          {step === "setPassword" && (
            <form className="auth-form" onSubmit={handleSetPassword}>
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
                  Start Over
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
