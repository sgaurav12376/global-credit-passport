// pages/Auth/signup/Signup.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { signup as signupApi } from "../../../services/authApi.js";

const isEmail = (v) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const onlyDigits = (v) => (v || "").replace(/\D/g, "");
const phoneOK = (v) => {
  const d = onlyDigits(v);
  return d.length >= 8 && d.length <= 15; // basic intl range
};
const passOK = (v) =>
  /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v) && String(v || "").length >= 8;

export default function Signup() {
  // ✅ All fields required by backend
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signin } = useAuth();
  const navigate = useNavigate();

  const valid = useMemo(() => {
    return (
      firstName.trim() &&
      lastName.trim() &&
      isEmail(email) &&
      passportNumber.trim() &&
      phoneOK(phoneNumber) &&
      passOK(password) &&
      confirmPassword === password
    );
  }, [firstName, lastName, email, passportNumber, phoneNumber, password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!valid) {
      if (!firstName) return setError("First name is required");
      if (!lastName) return setError("Last name is required");
      if (!email || !isEmail(email)) return setError("Valid email is required");
      if (!passportNumber) return setError("Passport number is required");
      if (!phoneOK(phoneNumber)) return setError("Enter a valid phone number (digits only)");
      if (!passOK(password)) return setError("Password must be 8+ chars with upper, lower, number, special");
      if (confirmPassword !== password) return setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const data = await signupApi({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        passportNumber: passportNumber.trim(),
        phoneNumber: onlyDigits(phoneNumber),
        password,
        confirmPassword,
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
          <div style={styles.row2}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={styles.input}
              autoComplete="given-name"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={styles.input}
              autoComplete="family-name"
            />
          </div>

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

          <div style={styles.row2}>
            <input
              type="text"
              placeholder="Passport Number"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
              style={styles.input}
            />
            <input
              type="tel"
              placeholder="Phone Number (digits only)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={styles.input}
              autoComplete="tel"
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              autoComplete="new-password"
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              autoComplete="new-password"
            />
          </div>

          <ul style={styles.rules}>
            <li>At least 8 characters</li>
            <li>1 uppercase, 1 lowercase, 1 number, 1 special character</li>
          </ul>

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
    maxWidth: 640,
    width: "100%",
  },
  heading: { textAlign: "center", color: "#2c3e50", fontSize: 28, fontWeight: 700, marginBottom: 8 },
  subtext: { textAlign: "center", fontSize: 14, color: "#6c7a89", marginBottom: 28 },
  formGroup: { marginBottom: 16 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  input: {
    width: "100%",
    padding: "13px 16px",
    backgroundColor: "#eaf2ff",
    border: "1px solid #cfe0ff",
    borderRadius: 8,
    fontSize: 15,
    outline: "none",
  },
  rules: { listStyle: "disc", margin: "6px 0 14px 18px", color: "#6b7280", fontSize: 13 },
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
  },
  error: { textAlign: "center", fontWeight: "bold", marginTop: 14, color: "#e74c3c" },
  footerNote: { textAlign: "center", fontSize: 13, color: "#888", marginTop: 18 },
  link: { color: "#3498db", textDecoration: "none" },
};
