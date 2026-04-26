import { useState } from "react";
import { register } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import "../styles/WorkspacePages.css";

function RegisterForm() {
    const [first_name, setFirstName] = useState("");
    const [last_name, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await register(first_name, last_name, email, password);
      navigate("/main-page");
    } catch (err) {
      setError("Registration failed");
    }
  };

  async function toLogin () {
    navigate('/login');
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label htmlFor="register-first-name">First Name</label>
        <input
          id="register-first-name"
          type="text"
          placeholder="First name"
          value={first_name}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-last-name">Last Name</label>
        <input
          id="register-last-name"
          type="text"
          placeholder="Last name"
          value={last_name}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-confirm-password">Confirm Password</label>
        <input
          id="register-confirm-password"
          type="password"
          placeholder="Repeat password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <small>Use at least 8 characters to improve account security.</small>
      </div>

      <div className="auth-actions">
        <button className="btn btn-primary" type="submit">Create Account</button>
        <button className="btn btn-secondary" type="button" onClick={toLogin}>Back to Login</button>
      </div>

      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}

export default RegisterForm;