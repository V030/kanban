import { useState } from "react";
import { register, checkEmail } from "../../services/authService";
import { useToast } from "../../hooks/useToast";
import { useNavigate } from "react-router-dom";
import "../styles/WorkspacePages.css";

function RegisterForm() {
    const [first_name, setFirstName] = useState("");
    const [last_name, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: name, 2: email, 3: password
    const [firstNameError, setFirstNameError] = useState("");
    const [lastNameError, setLastNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [formError, setFormError] = useState("");
    const [checkingEmail, setCheckingEmail] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const goto = (s) => setStep((prev) => {
      const next = Number(s);
      if (Number.isNaN(next)) return prev;
      return Math.max(1, Math.min(3, next));
    });

    const next = async () => {
      if (step === 1) {
        let ok = true;
        if (!first_name.trim()) { setFirstNameError("Please enter your first name"); ok = false; } else { setFirstNameError(""); }
        if (!last_name.trim()) { setLastNameError("Please enter your last name"); ok = false; } else { setLastNameError(""); }
        if (!ok) return;
      }
      if (step === 2) {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setEmailError("Please enter a valid email address");
          return;
        }

        // Check email availability with backend
        setCheckingEmail(true);
        try {
          await checkEmail(email.trim());
          setEmailError(""); // Email is available, clear any previous error
        } catch (err) {
          setCheckingEmail(false);
          setEmailError(err.message || "Email is already taken");
          return; // Prevent navigation to Step 3
        }
        setCheckingEmail(false);
      }
      setStep((s) => Math.min(3, s + 1));
    };

    const previous = () => {
      setStep((s) => Math.max(1, s - 1));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      // ensure on final step
      if (step !== 3) {
        next();
        return;
      }

      // clear previous errors
      setPasswordError(""); setConfirmPasswordError(""); setFormError("");

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
        await register(first_name, last_name, email, password);
        navigate("/main-page");
      } catch (err) {
        const msg = (err && err.message) ? String(err.message) : 'Registration failed';
        // map to field if possible
        if (/email/i.test(msg)) {
          setEmailError(msg);
        } else if (/password/i.test(msg)) {
          setPasswordError(msg);
        } else if (/name/i.test(msg)) {
          setFormError(msg);
        } else {
          setFormError(msg);
        }
      } finally {
        setLoading(false);
      }
    };

    function toLogin () {
      navigate('/login');
    }

    return (
      <form className="auth-form" onSubmit={handleSubmit}>
        {step === 1 && (
          <>
            <div className="auth-field">
              <label htmlFor="register-first-name">First Name</label>
              <input
                id="register-first-name"
                type="text"
                placeholder="First name"
                value={first_name}
                className={firstNameError ? 'is-invalid' : ''}
                onChange={(e) => { setFirstName(e.target.value); setFirstNameError(''); setFormError(''); }}
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
                className={lastNameError ? 'is-invalid' : ''}
                onChange={(e) => { setLastName(e.target.value); setLastNameError(''); setFormError(''); }}
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
                placeholder="name@company.com"
                value={email}
                className={emailError ? 'is-invalid' : ''}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); setFormError(''); }}
              />
              {emailError && <div className="field-error-text">{emailError}</div>}
            </div>
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
                className={passwordError ? 'is-invalid' : ''}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); setFormError(''); }}
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
                className={confirmPasswordError ? 'is-invalid' : ''}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(''); setFormError(''); }}
              />
              <small>Use at least 8 characters to improve account security.</small>
              {confirmPasswordError && <div className="field-error-text">{confirmPasswordError}</div>}
            </div>
          </>
        )}

        {formError && <div className="auth-error">{formError}</div>}

        <div className="auth-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" type="button" onClick={previous} disabled={step === 1 || loading || checkingEmail}>
            Previous
          </button>

          {step < 3 ? (
            <>
              <button 
                className="btn btn-primary" 
                type="button" 
                onClick={next} 
                disabled={loading || checkingEmail}
              >
                {checkingEmail ? "Checking..." : "Next"}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </>
          )}

          <button className="btn btn-ghost" type="button" onClick={toLogin} disabled={loading || checkingEmail}>
            Back to Login
          </button>
        </div>
      </form>
    );
}

export default RegisterForm;