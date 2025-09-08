import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");      // -> phoneNumber in payload
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email && !phone) {
      setError("Email or phone number is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || undefined,
          phoneNumber: phone || undefined,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // success → mark authed & go to /score
      if (res.ok && (data?.success === true || data?.message === "Login successful")) {
        signin();
        const next = location.state?.from || "/score";
        navigate(next, { replace: true });
        return;
      }

      setError(data?.message || "Login failed");
    } catch {
      setError("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Welcome Back</h2>
        <p style={styles.subtext}>Log in to manage your credit profile</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.orSeparator}>or</div>

          <div style={styles.formGroup}>
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>

          {error ? <p style={styles.error}>{error}</p> : null}
        </form>

        <div style={styles.footerNote}>
          Don’t have an account?{" "}
          <Link to="/register" style={styles.link}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  body: {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    background: "linear-gradient(135deg, #eef2f3, #8fd3f4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
    padding: 40,
    maxWidth: 520,
    width: "100%",
  },
  heading: { textAlign: "center", color: "#2c3e50", fontSize: 28, fontWeight: 700, marginBottom: 8 },
  subtext: { textAlign: "center", fontSize: 14, color: "#6c7a89", marginBottom: 28 },
  formGroup: { marginBottom: 18 },
  input: {
    width: "100%",
    padding: "13px 16px",
    backgroundColor: "#eaf2ff",
    border: "1px solid #cfe0ff",
    borderRadius: 8,
    fontSize: 15,
    outline: "none",
  },
  orSeparator: { textAlign: "center", fontSize: 13, color: "#999", margin: "14px 0" },
  primaryBtn: {
    width: "100%",
    padding: "12px",
    background: "#3498db",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 2,
  },
  error: { textAlign: "center", fontWeight: "bold", marginTop: 14, color: "#e74c3c" },
  footerNote: { textAlign: "center", fontSize: 13, color: "#888", marginTop: 18 },
  link: { color: "#3498db", textDecoration: "none" },
};
