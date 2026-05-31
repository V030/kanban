import { useEffect, useRef, useState } from "react";
import {
  checkEmail,
  register,
  requestEmailVerificationCode,
  verifyEmailVerificationCode,
} from "../../services/authService";
import { useNavigate } from "react-router-dom";
import "../styles/WorkspacePages.css";

const OTP_LENGTH = 6;
const REGISTER_DRAFT_KEY = "kanban:register-draft";

function loadRegisterDraft() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    const now = Date.now();
    const expiresAtMs = Number(parsed.expiresAtMs || 0);
    const resendAtMs = Number(parsed.resendAtMs || 0);
    let safeStep = [1, 2, 3].includes(Number(parsed.step)) ? Number(parsed.step) : 1;
    if (safeStep === 3 && !parsed.verificationToken) {
      safeStep = 2;
    }

    return {
      first_name: String(parsed.first_name || ""),
      last_name: String(parsed.last_name || ""),
      email: String(parsed.email || ""),
      step: safeStep,
      verificationToken: String(parsed.verificationToken || ""),
      codeSent: Boolean(parsed.codeSent),
      sentCodeEmail: String(parsed.sentCodeEmail || ""),
      showOtpEntry: Boolean(parsed.showOtpEntry),
      expiresAtMs,
      resendAtMs,
      expiresIn: Math.max(0, Math.ceil((expiresAtMs - now) / 1000)),
      resendIn: Math.max(0, Math.ceil((resendAtMs - now) / 1000)),
    };
  } catch {
    return {};
  }
}

function saveRegisterDraft(draft) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft));
}

function clearRegisterDraft() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(REGISTER_DRAFT_KEY);
}

function OtpInput({ value, onChange, disabled = false, idPrefix = "register-otp" }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || "");

  const setDigit = (index, digit) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
  };

  const handleChange = (index, rawValue) => {
    const numeric = String(rawValue || "").replace(/\D/g, "");
    if (!numeric) {
      setDigit(index, "");
      return;
    }

    if (numeric.length > 1) {
      const next = digits.slice();
      numeric.slice(0, OTP_LENGTH).split("").forEach((digit, offset) => {
        if (index + offset < OTP_LENGTH) {
          next[index + offset] = digit;
        }
      });
      onChange(next.join(""));
      inputsRef.current[Math.min(index + numeric.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    setDigit(index, numeric);
    if (index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (digits[index]) {
        setDigit(index, "");
        return;
      }

      if (index > 0) {
        const next = digits.slice();
        next[index - 1] = "";
        onChange(next.join(""));
        inputsRef.current[index - 1]?.focus();
      }
    }

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

function RegisterForm({ onStepChange }) {
  const initialDraftRef = useRef(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = loadRegisterDraft();
  }
  const initialDraft = initialDraftRef.current;

  const [first_name, setFirstName] = useState(initialDraft.first_name || "");
  const [last_name, setLastName] = useState(initialDraft.last_name || "");
  const [email, setEmail] = useState(initialDraft.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(initialDraft.step || 1);
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState(initialDraft.verificationToken || "");
  const [codeSent, setCodeSent] = useState(Boolean(initialDraft.codeSent));
  const [sentCodeEmail, setSentCodeEmail] = useState(initialDraft.sentCodeEmail || "");
  const [showOtpEntry, setShowOtpEntry] = useState(Boolean(initialDraft.showOtpEntry));
  const [expiresIn, setExpiresIn] = useState(initialDraft.expiresIn || 0);
  const [resendIn, setResendIn] = useState(initialDraft.resendIn || 0);
  const [expiresAtMs, setExpiresAtMs] = useState(initialDraft.expiresAtMs || 0);
  const [resendAtMs, setResendAtMs] = useState(initialDraft.resendAtMs || 0);
  const [registeredUser, setRegisteredUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof onStepChange !== "function") return;

    const firstName = registeredUser?.firstName || first_name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (step === 4) {
      onStepChange({
        title: firstName ? `Welcome, ${firstName}!` : "Welcome!",
        subtitle: "Your account has been successfully created and your email has been verified.",
      });
      return;
    }

    if (step === 3) {
      onStepChange({
        title: "Create Password",
        subtitle: "One last step! Choose a secure password to finish setting up your account.",
      });
      return;
    }

    if (step === 2 && showOtpEntry) {
      onStepChange({
        title: "Email Verification",
        subtitle: normalizedEmail
          ? `Enter the 6-digit code sent to ${normalizedEmail}.`
          : "Enter the 6-digit code sent to your email.",
      });
      return;
    }

    if (step === 2) {
      onStepChange({
        title: "Email Address",
        subtitle: "Enter the email address you want to use for this account.",
      });
      return;
    }

    onStepChange({
      title: "Create Account",
      subtitle: "Start with a focused workspace designed for clarity.",
    });
  }, [email, first_name, onStepChange, registeredUser?.firstName, showOtpEntry, step]);

  useEffect(() => {
    if (!expiresIn && !resendIn) return undefined;
    const timer = window.setInterval(() => {
      setExpiresIn((value) => Math.max(0, value - 1));
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresIn, resendIn]);

  useEffect(() => {
    if (step === 4) return;

    saveRegisterDraft({
      first_name,
      last_name,
      email,
      step,
      verificationToken,
      codeSent,
      sentCodeEmail,
      showOtpEntry,
      expiresAtMs,
      resendAtMs,
    });
  }, [
    codeSent,
    email,
    expiresAtMs,
    first_name,
    last_name,
    resendAtMs,
    sentCodeEmail,
    showOtpEntry,
    step,
    verificationToken,
  ]);

  const resetVerification = () => {
    setOtp("");
    setOtpError("");
    setVerificationToken("");
    setCodeSent(false);
    setSentCodeEmail("");
    setShowOtpEntry(false);
    setExpiresIn(0);
    setResendIn(0);
    setExpiresAtMs(0);
    setResendAtMs(0);
  };

  const validateNameStep = () => {
    let ok = true;
    if (!first_name.trim()) { setFirstNameError("Please enter your first name"); ok = false; } else { setFirstNameError(""); }
    if (!last_name.trim()) { setLastNameError("Please enter your last name"); ok = false; } else { setLastNameError(""); }
    return ok;
  };

  const validateEmail = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const sendCode = async () => {
    if (!validateEmail()) return;

    setSendingCode(true);
    setCheckingEmail(true);
    setEmailError("");
    setOtpError("");
    setFormError("");

    try {
      await checkEmail(email.trim().toLowerCase());
      setCheckingEmail(false);
      const result = await requestEmailVerificationCode(email.trim().toLowerCase(), "registration");
      const normalizedEmail = email.trim().toLowerCase();
      setCodeSent(true);
      setSentCodeEmail(normalizedEmail);
      setShowOtpEntry(true);
      setVerificationToken("");
      setOtp("");
      const nextExpiresIn = result?.expiresInSeconds || 600;
      const nextResendIn = result?.resendAfterSeconds || 60;
      setExpiresIn(nextExpiresIn);
      setResendIn(nextResendIn);
      setExpiresAtMs(Date.now() + nextExpiresIn * 1000);
      setResendAtMs(Date.now() + nextResendIn * 1000);
    } catch (err) {
      setEmailError(err.message || "Unable to send verification code.");
    } finally {
      setCheckingEmail(false);
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Enter the 6-digit verification code");
      return;
    }

    setVerifyingCode(true);
    setOtpError("");
    setFormError("");

    try {
      const result = await verifyEmailVerificationCode(email.trim().toLowerCase(), otp, "registration");
      setVerificationToken(result.verificationToken);
      setShowOtpEntry(false);
      setStep(3);
    } catch (err) {
      setOtpError(err.message || "Invalid or expired verification code.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const next = async () => {
    if (step === 1) {
      if (!validateNameStep()) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      if (verificationToken) {
        setStep(3);
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const hasReusableCode = codeSent && sentCodeEmail === normalizedEmail && expiresIn > 0;

      if (showOtpEntry) {
        await verifyCode();
      } else if (hasReusableCode) {
        setShowOtpEntry(true);
      } else {
        await sendCode();
      }
    }
  };

  const previous = () => {
    if (step === 2 && showOtpEntry) {
      setShowOtpEntry(false);
      setOtpError("");
      return;
    }

    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step !== 3) {
      next();
      return;
    }

    setPasswordError("");
    setConfirmPasswordError("");
    setFormError("");

    if (!verificationToken) {
      setStep(2);
      setOtpError("Verify your email before creating your account");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }
    if ((password || "").length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await register(first_name, last_name, email.trim().toLowerCase(), password, verificationToken);
      setRegisteredUser(result?.user || { firstName: first_name });
      clearRegisterDraft();
      setStep(4);
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : "Registration failed";
      if (/verification|code/i.test(msg)) {
        setStep(2);
        setOtpError(msg);
      } else if (/email/i.test(msg)) {
        setEmailError(msg);
        setStep(2);
      } else if (/password/i.test(msg)) {
        setPasswordError(msg);
      } else {
        setFormError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  function toLogin() {
    clearRegisterDraft();
    navigate("/login");
  }

  if (step === 4) {
    return (
      <div className="auth-step-transition auth-success-actions" key="register-success">
        <button className="btn btn-primary" type="button" onClick={() => navigate("/main-page/dashboard")}>
          Continue to App
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-step-transition" key={`register-step-${step}-${showOtpEntry ? "otp" : "form"}`}>
        {step === 1 && (
          <>
            <div className="auth-field">
              <label htmlFor="register-first-name">First Name</label>
              <input
                id="register-first-name"
                type="text"
                placeholder="First name"
                value={first_name}
                className={firstNameError ? "is-invalid" : ""}
                onChange={(e) => { setFirstName(e.target.value); setFirstNameError(""); setFormError(""); }}
              />
              {firstNameError && <div className="field-error-text">{firstNameError}</div>}
            </div>

            <div className="auth-field">
              <label htmlFor="register-last-name">Last Name</label>
              <input
                id="register-last-name"
                type="text"
                placeholder="Last name"
                value={last_name}
                className={lastNameError ? "is-invalid" : ""}
                onChange={(e) => { setLastName(e.target.value); setLastNameError(""); setFormError(""); }}
              />
              {lastNameError && <div className="field-error-text">{lastNameError}</div>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="auth-field">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                placeholder="youremail@email.com"
                value={email}
                className={emailError ? "is-invalid" : ""}
                readOnly={showOtpEntry || !!verificationToken}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                  setFormError("");
                  resetVerification();
                }}
            />
            {emailError && <div className="field-error-text">{emailError}</div>}
          </div>

            {showOtpEntry && !verificationToken && (
              <div className="email-verification-section">
                {expiresIn > 0 && (
                  <div className="email-verification-meta">
                    <span>Enter the code from your inbox.</span>
                                      <button
                    className={`auth-text-action ${resendIn > 0 ? "is-disabled" : ""}`}
                    type="button"
                    onClick={sendCode}
                    disabled={sendingCode || verifyingCode || resendIn > 0}
                  >
                  {sendingCode ? "Sending..." : resendIn > 0 ? `Resend Code in ${resendIn}s` : "Resend Code"}
                </button>
                  </div>
                )}
                <>
                  <OtpInput value={otp} onChange={(value) => { setOtp(value); setOtpError(""); }} disabled={verifyingCode || expiresIn <= 0} />
                  {expiresIn <= 0 && <small className="field-error-text">Code expired. Please resend a new code.</small>}
                  {otpError && <div className="field-error-text">{otpError}</div>}
                </>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="auth-field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                placeholder="Create password"
                value={password}
                className={passwordError ? "is-invalid" : ""}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(""); setFormError(""); }}
              />
              {passwordError && <div className="field-error-text">{passwordError}</div>}
            </div>

            <div className="auth-field">
              <label htmlFor="register-confirm-password">Confirm Password</label>
              <input
                id="register-confirm-password"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                className={confirmPasswordError ? "is-invalid" : ""}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(""); setFormError(""); }}
              />
              <small>Use at least 8 characters to improve account security.</small>
              {confirmPasswordError && <div className="field-error-text">{confirmPasswordError}</div>}
            </div>
          </>
        )}

        {formError && <div className="auth-error">{formError}</div>}
      </div>

      <div className="auth-actions auth-actions-register">
        <button className="btn btn-ghost" type="button" onClick={previous} disabled={step === 1 || loading || checkingEmail || sendingCode || verifyingCode}>
          Previous
        </button>

        {step < 3 ? (
          <button
            className="btn btn-primary"
            type="button"
            onClick={next}
            disabled={loading || checkingEmail || sendingCode || verifyingCode}
          >
            {checkingEmail ? "Checking..." : step === 2 && showOtpEntry && !verificationToken ? "Verify Code" : "Next"}
          </button>
        ) : (
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        )}

        <button className="auth-text-action auth-login-link" type="button" onClick={toLogin} disabled={loading || checkingEmail || sendingCode || verifyingCode}>
          Back to Login
        </button>
      </div>
    </form>
  );
}

export default RegisterForm;
