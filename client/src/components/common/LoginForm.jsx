import { useState } from "react";
import { login } from "../../services/authService";
import { useNavigate } from "react-router-dom";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault(); // stop page refresh

    try {
      await login(email, password);
      alert("Login success");
      navigate("/main-page");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  async function toRegister() {
    navigate("/register");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">Login</button>
      <button type="button" onClick={ toRegister }>Register</button>      

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}

export default LoginForm;
