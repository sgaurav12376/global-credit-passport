// src/synergy_resources/credit_app/pages/Auth/signup/Signup.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { signup as signupApi } from "../../../services/authApi.js";

const isEmail = (v) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPhone = (v) => !!v && /^[0-9+()\-\s]{8,}$/.test(v.trim());

export default function Signup() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signin } = useAuth();
  const navigate = useNavigate();

  const valid = useMemo(() => {
    const mailOK = email && isEmail(email);
    const phoneOK = phone && isPhone(phone);
    return !!password && (mailOK || phoneOK);
  }, [email, phone, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!valid) {
      if (!password) return setError("Please enter a password");
      if (!email && !phone) return setError("Please enter email or phone");
      if (email && !isEmail(email)) return setError("Enter a valid email address");
      if (phone && !isPhone(phone)) return setError("Enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const data = await signupApi({
        email: email || undefined,
        phoneNumber: phone || undefined,
        password,
      });

      if (data?.success === false) {
        setError(data?.message || "Signup failed");
        return;
      }

      signin();
      navigate("/score", { replace: true });
    } catch (err) {
      setError(err?.message || "Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Create your account</h2>
        <p style={styles.subtext}>Sign up to get started</p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={styles.formGroup}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              autoComplete="email"
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
              autoComplete="tel"
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
              autoComplete="new-password"
            />
          </div>

          <button type="submit" style={styles.primaryBtn} disabled={loading || !valid}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>

          {error ? <p style={styles.error}>{error}</p> : null}
        </form>

        <div style={styles.footerNote}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>Sign in</Link>
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
