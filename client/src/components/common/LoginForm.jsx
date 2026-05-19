import { useState } from "react";
import { login, googleLogin } from "../../services/authService";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import "../styles/WorkspacePages.css";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [formError, setFormError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault();
    // reset errors
    setEmailError("");
    setPasswordError("");
    setFormError("");

    // basic client-side validation
    if (!email.trim()) {
      setEmailError("Please enter your email");
      return;
    }
    if (!password) {
      setPasswordError("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/main-page");
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : "Login failed";
      // map common server messages to fields
      if (/email/i.test(msg)) {
        setEmailError(msg);
      } else if (/password/i.test(msg)) {
        setPasswordError(msg);
      } else {
        setFormError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      await googleLogin(credentialResponse);
      navigate("/main-page");
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : "Google login failed";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setFormError("Google login failed. Please try again.");
  };

  async function toRegister() {
    navigate("/register");
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          placeholder="name@company.com"
          value={email}
          className={emailError ? 'is-invalid' : ''}
          onChange={(e) => { setEmail(e.target.value); setEmailError(''); setFormError(''); }}
        />
        {emailError && <div className="field-error-text">{emailError}</div>}
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          placeholder="Enter password"
          value={password}
          className={passwordError ? 'is-invalid' : ''}
          onChange={(e) => { setPassword(e.target.value); setPasswordError(''); setFormError(''); }}
        />
        <Link className="auth-inline-link" to="/forgot-password">
          Forgot Password?
        </Link>
        {passwordError && <div className="field-error-text">{passwordError}</div>}
      </div>

      {formError && <div className="auth-error">{formError}</div>}

      <div className="auth-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={ toRegister } disabled={loading}>Create Account</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
        <hr style={{ flex: 1, borderColor: '#cccccc28' }} />
        <span style={{ margin: '0 10px', color: '#cccccce5', fontSize: '14px' }}>or</span>
        <hr style={{ flex: 1, borderColor: '#cccccc28' }} />
      </div>

      <div>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme="outline"
          size="large"
          width="auto"
        />
      </div>
    </form>
  );
}

export default LoginForm;
