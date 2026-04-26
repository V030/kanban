import { useState } from "react";
import { login } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import "../styles/WorkspacePages.css";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault(); // stop page refresh

    try {
      await login(email, password);
      navigate("/main-page");
    } catch (err) {
      setError("Invalid email or password");
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
      </div>

      <div className="auth-actions">
        <button className="btn btn-primary" type="submit">Log In</button>
        <button className="btn btn-secondary" type="button" onClick={ toRegister }>Create Account</button>
      </div>

      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}

export default LoginForm;
