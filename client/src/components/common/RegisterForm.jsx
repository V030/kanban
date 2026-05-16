import { useState } from "react";
import { register } from "../../services/authService";
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
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.showValidationError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register(first_name, last_name, email, password);
      toast.showSuccess("Account created successfully!");
      navigate("/main-page");
    } catch (err) {
      toast.showError(err.message);
    } finally {
      setLoading(false);
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
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={toLogin} disabled={loading}>Back to Login</button>
      </div>
    </form>
  );
}

export default RegisterForm;