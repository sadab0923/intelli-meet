import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Create your IntelliMeet account</h1>

        {error && <div style={styles.error}>{error}</div>}

        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          required
        />
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
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          minLength={6}
          required
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Creating account…" : "Sign up"}
        </button>

        <p style={styles.footerText}>
          Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
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
