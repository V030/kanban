import { useState } from "react";
import { login, googleLogin } from "../../services/authService";
import { useToast } from "../../hooks/useToast";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from '@react-oauth/google';
import "../styles/WorkspacePages.css";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.showSuccess("Login successful!");
      navigate("/main-page");
    } catch (err) {
      toast.showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      await googleLogin(credentialResponse);
      toast.showSuccess("Google login successful!");
      navigate("/main-page");
    } catch (err) {
      toast.showError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.showError("Google login failed. Please try again.");
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
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link className="auth-inline-link" to="/forgot-password">
          Forgot Password?
        </Link>
      </div>

      <div className="auth-actions">
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={ toRegister } disabled={loading}>Create Account</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
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
