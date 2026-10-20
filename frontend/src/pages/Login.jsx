import { useState } from "react";
import axios from "axios";
import collegeLogo from "../../college-logo.png";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8003";

export default function Login({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email,
          password,
        }
      );

      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      onLogin(user);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img
          src={collegeLogo}
          alt="College AI"
          className="auth-logo"
        />

        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Sign in to continue to College AI
        </p>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Email</label>

          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="auth-divider">
          <span>New to College AI?</span>
        </div>

        <button
          className="switch-auth"
          onClick={onShowRegister}
        >
          Create an account
        </button>
      </div>
    </div>
  );
}