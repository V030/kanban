import { useState } from "react";
import { login } from "../../services/authService";
import { useToast } from "../../hooks/useToast";
import { Link, useNavigate } from "react-router-dom";
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
    </form>
  );
}

export default LoginForm;
