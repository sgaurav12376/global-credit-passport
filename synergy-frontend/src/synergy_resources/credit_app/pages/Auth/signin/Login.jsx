// src/synergy_resources/credit_app/pages/Auth/signin/Login.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  (import.meta?.env?.VITE_API_BASE ?? "");

/* --- Small helpers ------------------------------------------------------ */
const isEmail = (v) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
// strip all non-digits and allow 6-15 digits for international numbers
const normalizeDigits = (v) => (v || "").replace(/\D/g, "");
const isPhoneCore = (digits) => digits.length >= 6 && digits.length <= 15;
const hasUpper = (v) => /[A-Z]/.test(v);
const hasLower = (v) => /[a-z]/.test(v);
const hasNumber = (v) => /\d/.test(v);
const hasSpecial = (v) => /[^A-Za-z0-9]/.test(v);
const longEnough = (v) => (v || "").length >= 8;

/* A small list of popular dial codes. Add more if you want. */
const DIALS = [
  { cc: "IN", dial: "+91", label: "India" },
  { cc: "US", dial: "+1", label: "United States" },
  { cc: "GB", dial: "+44", label: "United Kingdom" },
  { cc: "AE", dial: "+971", label: "UAE" },
  { cc: "SG", dial: "+65", label: "Singapore" },
  { cc: "CA", dial: "+1", label: "Canada" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState("+91"); // default India
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [emailErr, setEmailErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [passErr, setPassErr] = useState("");
  const [formErr, setFormErr] = useState("");
  const [loading, setLoading] = useState(false);

  const { signin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // derived validations
  const phoneDigits = normalizeDigits(phone);
  const phoneOK = phone && isPhoneCore(phoneDigits);
  const emailOK = email && isEmail(email);
  const passOK =
    longEnough(password) && hasUpper(password) && hasLower(password) && hasNumber(password) && hasSpecial(password);

  const validForm = useMemo(
    () => passOK && (emailOK || phoneOK),
    [passOK, emailOK, phoneOK]
  );

  // live error text (only if field has content)
  const onEmailChange = (v) => {
    setEmail(v);
    setEmailErr(!v ? "" : isEmail(v) ? "" : "Enter a valid email address");
  };
  const onPhoneChange = (v) => {
    setPhone(v);
    const digits = normalizeDigits(v);
    setPhoneErr(!v ? "" : isPhoneCore(digits) ? "" : "Enter a valid phone number");
  };
  const onPassChange = (v) => {
    setPassword(v);
    setPassErr(!v ? "" : passOK ? "" : "Password does not meet the rules");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErr("");

    // final guard
    if (!validForm) {
      if (!password) setPassErr("Password is required");
      if (!email && !phone) setFormErr("Email or phone number is required");
      if (email && !emailOK) setEmailErr("Enter a valid email address");
      if (phone && !phoneOK) setPhoneErr("Enter a valid phone number");
      return;
    }

    const payload = {
      email: emailOK ? email : undefined,
      phoneNumber: !emailOK && phoneOK ? `${dial}${phoneDigits}` : undefined,
      password,
    };

    const url = `${API_BASE}/api/login`;
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // mode: "cors", credentials: "include", // <- enable if your API uses cookies
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

      const success =
        res.ok &&
        (data?.success === true ||
          /success/i.test(String(data?.message || "")) ||
          data?.token);

      if (success) {
        signin();
        const next = location.state?.from || "/score";
        navigate(next, { replace: true });
        return;
      }

      if (res.status === 401) {
        setFormErr("Invalid email/phone or password");
        return;
      }
      setFormErr(data?.message || raw || `Login failed (${res.status})`);
    } catch (err) {
      setFormErr(navigator.onLine ? "Error connecting to server" : "You appear to be offline");
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
          {/* Email */}
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

          <div style={styles.orSeparator}>or</div>

          {/* Phone with country dial code */}
          <div style={{ ...styles.formGroup, ...styles.inputRow }}>
            <select
              value={dial}
              onChange={(e) => setDial(e.target.value)}
              style={styles.ccSelect}
              aria-label="Country code"
            >
              {DIALS.map((d) => (
                <option key={d.cc} value={d.dial}>
                  {d.label} {d.dial}
                </option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              style={styles.input}
              autoComplete="tel"
              aria-invalid={!!phoneErr}
            />
          </div>
          {phoneErr ? <div style={styles.errSmall}>{phoneErr}</div> : null}
          {phoneOK ? (
            <div style={styles.hintSmall}>
              Will send <b>{dial}{phoneDigits}</b> to the server
            </div>
          ) : null}

          {/* Password */}
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

            {/* Password rule checklist */}
            <ul style={styles.rules}>
              <Rule ok={longEnough(password)}>At least 8 characters</Rule>
              <Rule ok={hasUpper(password)}>1 uppercase letter</Rule>
              <Rule ok={hasLower(password)}>1 lowercase letter</Rule>
              <Rule ok={hasNumber(password)}>1 number</Rule>
              <Rule ok={hasSpecial(password)}>1 special character</Rule>
            </ul>
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

/* tiny component for rule line */
function Rule({ ok, children }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontWeight: 900, color: ok ? "#10b981" : "#9ca3af" }}>
        {ok ? "✓" : "•"}
      </span>
      <span style={{ color: ok ? "#10b981" : "#6b7280" }}>{children}</span>
    </li>
  );
}

/* --- inline styles kept consistent with your current page ---------------- */
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

  /* phone row */
  inputRow: { display: "grid", gridTemplateColumns: "minmax(110px, 150px) 1fr", gap: 8, alignItems: "center" },
  ccSelect: {
    padding: "12px 10px",
    background: "#f5faff",
    border: "1px solid #cfe0ff",
    borderRadius: 8,
    fontSize: 14,
    color: "#1f2937",
  },

  rules: { listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 4 },

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

  errSmall: { color: "#e74c3c", fontSize: 12, marginTop: 6 },
  hintSmall: { color: "#6b7280", fontSize: 12, marginTop: 6 },

  error: { textAlign: "center", fontWeight: "bold", marginTop: 14, color: "#e74c3c" },
  footerNote: { textAlign: "center", fontSize: 13, color: "#888", marginTop: 18 },
  link: { color: "#3498db", textDecoration: "none" },
};
