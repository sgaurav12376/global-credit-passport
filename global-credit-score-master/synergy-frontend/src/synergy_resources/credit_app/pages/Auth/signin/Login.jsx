// pages/Auth/signin/Login.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { login as loginApi } from "../../../services/authApi.js";

const isEmail = (v) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const longEnough = (v) => (v || "").length >= 8;

export default function Login() {
  // ✅ Email + Password only (backend requirement)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailErr, setEmailErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [formErr, setFormErr] = useState("");
  const [loading, setLoading] = useState(false);

  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const emailOK = email && isEmail(email);
  const passOK = longEnough(password);
  const validForm = useMemo(() => emailOK && passOK, [emailOK, passOK]);

  const onEmailChange = (v) => {
    setEmail(v);
    setEmailErr(!v ? "" : isEmail(v) ? "" : "Enter a valid email address");
  };
  const onPassChange = (v) => {
    setPassword(v);
    setPassErr(!v ? "" : longEnough(v) ? "" : "Password must be at least 8 characters");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErr("");

    if (!validForm) {
      if (!email) setEmailErr("Email is required");
      if (!password) setPassErr("Password is required");
      if (email && !emailOK) setEmailErr("Enter a valid email address");
      if (password && !passOK) setPassErr("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const data = await loginApi({ email: email.trim(), password });
      // Consider token in data if your backend returns it
      signin();
      const next = location.state?.from || "/score";
      navigate(next, { replace: true });
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Login failed";
      setFormErr(/401|invalid/i.test(String(msg)) ? "Invalid email or password" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Welcome Back</h2>
        <p style={styles.subtext}>Log in to manage your credit profile</p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.formGroup}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              style={styles.input}
              autoComplete="email"
              aria-invalid={!!emailErr}
            />
            {emailErr ? <div style={styles.errSmall}>{emailErr}</div> : null}
          </div>

          <div style={styles.formGroup}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => onPassChange(e.target.value)}
              style={styles.input}
              autoComplete="current-password"
              aria-invalid={!!passErr}
            />
            {passErr ? <div style={styles.errSmall}>{passErr}</div> : null}
          </div>

          <button type="submit" style={styles.primaryBtn} disabled={loading || !validForm}>
            {loading ? "Logging in..." : "Log In"}
          </button>

          {formErr ? <p style={styles.error}>{formErr}</p> : null}
        </form>

        <div style={styles.footerNote}>
          Don’t have an account?{" "}
          <Link to="/signup" style={styles.link}>Sign Up</Link>
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
  errSmall: { color: "#e74c3c", fontSize: 12, marginTop: 6 },
  error: { textAlign: "center", fontWeight: "bold", marginTop: 14, color: "#e74c3c" },
  footerNote: { textAlign: "center", fontSize: 13, color: "#888", marginTop: 18 },
  link: { color: "#3498db", textDecoration: "none" },
};
