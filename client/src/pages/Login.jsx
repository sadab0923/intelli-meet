import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Sign in to IntelliMeet</h1>

        {error && <div style={styles.error}>{error}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p style={styles.footerText}>
          Don't have an account? <Link to="/signup" style={styles.link}>Sign up</Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  wrapper: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f0f0f",
  },
  card: {
    background: "#1a1a1a",
    padding: "32px",
    borderRadius: "12px",
    width: "320px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  title: { color: "#fff", fontSize: "20px", marginBottom: "8px" },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #333",
    background: "#111",
    color: "#fff",
  },
  button: {
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    background: "#2d5b8a",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
  error: {
    background: "#7a1f1f",
    color: "#fff",
    padding: "8px",
    borderRadius: "6px",
    fontSize: "13px",
  },
  footerText: { color: "#999", fontSize: "13px", textAlign: "center" },
  link: { color: "#5b9bd5" },
};
