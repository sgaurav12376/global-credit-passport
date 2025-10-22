// src/synergy_resources/credit_app/pages/Auth/signup/Signup.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { signup as signupApi } from "../../../services/authApi.js";

/* ----------------------- helpers & constants ----------------------- */
const countries = [
  { code: "IN", name: "India",           dial: "+91", idLabel: "PAN",  idHint: "AAAAA9999A", idRe: /^[A-Z]{5}\d{4}[A-Z]$/ },
  { code: "US", name: "United States",   dial: "+1",  idLabel: "SSN",  idHint: "123-45-6789", idRe: /^\d{3}-?\d{2}-?\d{4}$/ },
  { code: "GB", name: "United Kingdom",  dial: "+44", idLabel: "NINO", idHint: "QQ123456C",  idRe: /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i },
  { code: "CA", name: "Canada",          dial: "+1",  idLabel: "SIN",  idHint: "123-456-789", idRe: /^\d{3}-?\d{3}-?\d{3}$/ },
];

const emailOK  = (v) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const nameOK   = (v) => !!v && /^[a-zA-Z][a-zA-Z\s'.-]{0,40}$/.test(v.trim());
const onlyDig  = (v) => (v || "").replace(/\D/g, "");
const passOK   = (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v) && String(v||"").length >= 8;
const adultOK  = (iso) => {
  if (!iso) return false;
  const d = new Date(iso), n = new Date();
  const age = n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
  return age >= 18;
};

function InfoTip({ title, lines }) {
  return (
    <span className="qwrap" aria-label={title}>
      <span className="q">?</span>
      <span className="qt">
        <strong className="qt-title">{title}</strong>
        <ul className="qt-list">
          {lines.map((l,i)=><li key={i}>{l}</li>)}
        </ul>
      </span>
    </span>
  );
}

/* ---------------------------- Manual Form ---------------------------- */
function ManualForm({ onBack }) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [dob,       setDob]       = useState("");
  const [gender,    setGender]    = useState("");
  const [ctry,      setCtry]      = useState("");      // keep empty to show placeholder
  const [nationalId,setNationalId]= useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");

  const [errs, setErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { signin } = useAuth();
  const navigate = useNavigate();

  const selectedCountry = useMemo(
    () => countries.find(c => c.code === ctry) || null,
    [ctry]
  );

  const phoneOK = (v) => {
    const d = onlyDig(v);
    if (!ctry) return d.length >= 8 && d.length <= 15;
    if (ctry === "IN") return d.length === 10;
    if (ctry === "US" || ctry === "CA") return d.length === 10;
    if (ctry === "GB") return d.length >= 10 && d.length <= 11;
    return d.length >= 8 && d.length <= 15;
  };

  const validate = () => {
    const e = {};
    if (!nameOK(firstName)) e.firstName = "Only letters, spaces, ' . - (max 41 chars)";
    if (!nameOK(lastName))  e.lastName  = "Only letters, spaces, ' . - (max 41 chars)";
    if (!emailOK(email))    e.email     = "Enter a valid email address";
    if (!phoneOK(phone))    e.phone     = `Enter a valid phone number${selectedCountry ? ` for ${selectedCountry.name}` : ""}`;
    if (!dob || !adultOK(dob)) e.dob    = "Must be a valid date and 18+ years old";
    if (!gender)            e.gender    = "Select a gender";
    if (!ctry)              e.ctry      = "Select country";
    if (ctry && selectedCountry && !selectedCountry.idRe.test(nationalId)) e.nationalId = `Invalid ${selectedCountry.idLabel} format`;
    if (!passOK(password))  e.password  = "8+ chars incl. upper/lower/number/special";
    if (confirm !== password) e.confirm = "Passwords do not match";
    return e;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const eMap = validate();
    setErrs(eMap);
    if (Object.keys(eMap).length) return;

    setSubmitting(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        dateOfBirth: dob,
        gender,
        country:   ctry,
        phoneNumber: onlyDig(phone),
        nationalId,
        password,
        confirmPassword: confirm,
      };
      const res = await signupApi(payload);
      if (res?.success === false) {
        setErrs({ form: res?.message || "Signup failed" });
        return;
      }
      signin();
      navigate("/score", { replace: true });
    } catch (err) {
      setErrs({ form: err?.message || "Error connecting to server" });
    } finally {
      setSubmitting(false);
    }
  };

  const dialText = selectedCountry ? selectedCountry.dial : "+";

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header-row">
          <button type="button" className="back-btn" onClick={onBack}>← Go Back</button>
          <div />
        </div>

        <h2 className="auth-title">
          Create your account{" "}
          <InfoTip
            title="What to know"
            lines={[
              "Password must meet all rules.",
              "Phone is validated against your selected country.",
              "ID format depends on the country (e.g., PAN for India, SSN for USA)."
            ]}
          />
        </h2>
        <p className="auth-sub">Sign up to get started</p>

        {/* 5 rows × 2 columns = 10 placeholders/fields */}
        <form onSubmit={onSubmit} noValidate className="form-grid">
          {/* Row 1 */}
          <div className="field">
            <label className="label">
              First name <InfoTip title="First name" lines={["Letters only; spaces, apostrophe, dot and hyphen allowed."]} />
            </label>
            <input className="input" placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
            {errs.firstName && <div className="err">{errs.firstName}</div>}
          </div>
          <div className="field">
            <label className="label">
              Last name <InfoTip title="Last name" lines={["Letters only; spaces, apostrophe, dot and hyphen allowed."]} />
            </label>
            <input className="input" placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
            {errs.lastName && <div className="err">{errs.lastName}</div>}
          </div>

          {/* Row 2 */}
          <div className="field">
            <label className="label">
              Email address <InfoTip title="Email" lines={["Provide a valid email (we’ll send notifications here)."]} />
            </label>
            <input className="input" placeholder="name@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
            {errs.email && <div className="err">{errs.email}</div>}
          </div>
          <div className="field">
            <label className="label">
              Phone <InfoTip title="Phone" lines={[`Validated for your selected country`, `Use digits only; we’ll prepend ${dialText}`]} />
            </label>
            <div className="phone-wrap">
              <span className="dial">{dialText}</span>
              <input className="input phone-input" placeholder="Phone number" value={phone} onChange={(e)=>setPhone(e.target.value)} />
            </div>
            {errs.phone && <div className="err">{errs.phone}</div>}
          </div>

          {/* Row 3 */}
          <div className="field">
            <label className="label">
              Date of birth <InfoTip title="Date of birth" lines={["You must be 18+ years old."]} />
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e)=>setDob(e.target.value)}
              className={`input ${dob ? "" : "empty"}`}
            />
            {errs.dob && <div className="err">{errs.dob}</div>}
          </div>
          <div className="field">
            <label className="label">Gender</label>
            <select
              value={gender}
              onChange={(e)=>setGender(e.target.value)}
              className={`input ${gender ? "" : "empty"}`}
            >
              <option value="" disabled>Select gender</option>
              <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
            </select>
            {errs.gender && <div className="err">{errs.gender}</div>}
          </div>

          {/* Row 4 */}
          <div className="field">
            <label className="label">Country</label>
            <select
              value={ctry}
              onChange={(e)=>setCtry(e.target.value)}
              className={`input ${ctry ? "" : "empty"}`}
            >
              <option value="" disabled>Select country</option>
              {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            {errs.ctry && <div className="err">{errs.ctry}</div>}
          </div>
          <div className="field">
            <label className="label">
              {selectedCountry?.idLabel || "ID"}{" "}
              <InfoTip
                title={`${selectedCountry?.idLabel || "ID"} format`}
                lines={[
                  selectedCountry?.idHint || "Use your national ID format",
                  "Used only for credit profile verification."
                ]}
              />
            </label>
            <input
              className="input"
              placeholder={selectedCountry?.idHint || "Your national ID"}
              value={nationalId}
              onChange={(e)=>setNationalId(e.target.value)}
            />
            {errs.nationalId && <div className="err">{errs.nationalId}</div>}
          </div>

          {/* Row 5 */}
          <div className="field">
            <label className="label">
              Password{" "}
              <InfoTip
                title="Password rules"
                lines={["At least 8 characters","1 uppercase, 1 lowercase, 1 number, 1 special character"]}
              />
            </label>
            <input className="input" type="password" placeholder="Create a password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            {errs.password && <div className="err">{errs.password}</div>}
          </div>
          <div className="field">
            <label className="label">Confirm password</label>
            <input className="input" type="password" placeholder="Re-enter password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
            {errs.confirm && <div className="err">{errs.confirm}</div>}
          </div>

          {errs.form && <div className="err" role="alert">{errs.form}</div>}

          {/* Centered Sign Up button */}
          <div className="btn-row">
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? "Creating account..." : "Sign Up"}
            </button>
          </div>

          <div className="form-foot">
            Already have an account? <Link to="/login" className="link">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------- Automated Section -------------------------- */
function AutomatedBlock({ onBack }) {
  const accountCreated = () => {
    alert("You have created your account.");
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header-row">
          <button type="button" className="back-btn" onClick={onBack}>← Go Back</button>
          <div />
        </div>
        <h3 className="auth-title">Automated Sign Up</h3>
        <p className="auth-sub">
          You can skip manual entry and upload country-specific documents.
          <br /> Accepted: Driver’s License, Passport, or National ID Card.
        </p>

        <div className="upload-block">
          <h4>📂 Origin Country Document</h4>
          <p>Please upload a valid government-issued ID from your origin country.</p>
          <input type="file" id="originDoc" accept=".pdf,.jpg,.jpeg,.png" required />
          <p className="note">Files must be clear and under 5MB.</p>
        </div>

        <div className="upload-block">
          <h4>📂 Destination Country Document</h4>
          <p>Please upload a valid government-issued ID from your destination country.</p>
          <input type="file" id="destinationDoc" accept=".pdf,.jpg,.jpeg,.png" required />
          <p className="note">Files must be clear and under 5MB.</p>
        </div>

        <button className="primary" onClick={accountCreated}>Sign Up</button>
      </div>
      <footer className="signup-footer">
        <div>© 2025 Global Credit App</div>
        <div className="links">
          <a href="#">Terms</a><a href="#">Privacy</a><a href="#">About</a><a href="#">Contact</a>
        </div>
        <div className="newsletter">
          <input type="text" placeholder="Subscribe newsletter…" />
          <button>→</button>
        </div>
        <div className="social">
          <a href="#"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg" width="18" alt="linkedin" /></a>
          <a href="#"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/twitter.svg" width="18" alt="twitter" /></a>
          <a href="#"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg" width="18" alt="gmail" /></a>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------------- Root --------------------------------- */
export default function Signup() {
  const [option, setOption] = useState(null); // null | 'manual' | 'automated'

  return (
    <>
      <div className="signup-page">
        {!option && (
          <div className="choice-shell">
            <div className="choice-card">
              <h2>Create Your Account</h2>
              <p>How do you want to proceed?</p>
              <div className="choice-buttons">
                <button className="primary" onClick={() => setOption("manual")}>Manual</button>
                <button className="secondary" onClick={() => setOption("automated")}>Automated</button>
              </div>
            </div>
          </div>
        )}

        {option === "manual" && <ManualForm onBack={() => setOption(null)} />}
        {option === "automated" && <AutomatedBlock onBack={() => setOption(null)} />}
      </div>

      {/* Inlined CSS for this page */}
      <style>{`
        /* page shells */
        .signup-page { min-height: 100vh; background: linear-gradient(135deg,#eef2f3,#8fd3f4); }
        .choice-shell { min-height: 100vh; display:grid; place-items:center; padding:24px; }
        .choice-card {
          width: 715px; max-width: 95vw; background:#fff; border-radius:14px;
          box-shadow:0 20px 50px rgba(0,0,0,.12); padding:24px; text-align:center;
        }

        /* buttons */
        .primary { height:40px; padding:0 16px; border:none; border-radius:8px; cursor:pointer; background:#3498db; color:#fff; font-weight:700; font-size:15px; }
        .secondary { height:40px; padding:0 16px; border-radius:8px; cursor:pointer; background:#e0f2fe; color:#1e40af; font-weight:700; font-size:15px; border:1px solid #93c5fd; }
        .choice-buttons { display:flex; gap:12px; justify-content:center; margin-top:14px; }
        .back-btn { height:34px; padding:0 12px; border-radius:8px; border:1px solid #cfe0ff; background:#eaf2ff; cursor:pointer; }

        /* manual/automated shared card shell */
        .auth-shell { min-height: 100vh; display:grid; place-items:center; padding:16px; }
        .auth-card { width:715px; max-width:95vw; background:#fff; border-radius:14px; box-shadow:0 20px 50px rgba(0,0,0,.12); padding:22px; }
        .auth-title { margin:0; text-align:center; font-size:22px; color:#1f2937; display:flex; align-items:center; justify-content:center; gap:6px; }
        .auth-sub { margin:6px 0 14px; text-align:center; font-size:13px; color:#6b7280; }
        .auth-header-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }

        /* form grid (5 rows × 2 columns) */
        .form-grid {
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:10px;
        }
        .field { display:grid; gap:6px; }
        .label { font-size:12px; color:#374151; display:flex; align-items:center; gap:6px; }
        .input {
          height:38px; padding:8px 12px; border:1px solid #cfe0ff; background:#eaf2ff;
          border-radius:8px; font-size:14px; outline:none; color:#111827;
        }

        /* center the Sign Up button */
        .btn-row { grid-column: 1 / -1; display:flex; justify-content:center; }

        /* select/date placeholder color */
        .input.empty { color:#9aa6b2; }

        /* phone adornment */
        .phone-wrap { display:flex; align-items:center; gap:6px; }
        .dial {
          min-width:52px; height:38px; background:#eef6ff; border:1px solid #cfe0ff; color:#2563eb;
          font-weight:600; border-radius:8px; display:grid; place-items:center; font-size:13px;
        }
        .phone-input { flex:1; }

        /* errors + misc */
        .err { color:#e11d48; font-size:12px; margin-top:-2px; }
        .form-foot { grid-column:1 / -1; text-align:center; font-size:13px; color:#6b7280; margin-top:6px; }
        .link { color:#3498db; text-decoration:none; }

        /* tooltip */
        .qwrap { position: relative; display:inline-flex; align-items:center; margin-left:6px; }
        .q {
          width:18px; height:18px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center;
          background:#e2f0ff; color:#2563eb; font-weight:700; font-size:12px; border:1px solid #bfdbfe;
        }
        .qt {
          position:absolute; left:22px; top:-6px; transform:translateY(-100%); min-width:220px; max-width:320px;
          background:#111827; color:#fff; padding:10px 12px; border-radius:8px; font-size:12px; line-height:1.35;
          box-shadow:0 10px 30px rgba(0,0,0,.25); display:none; z-index:20; white-space:normal;
        }
        .qwrap:hover .qt { display:block; }
        .qt-title { display:block; margin-bottom:6px; font-weight:700; }
        .qt-list { margin:0; padding-left:16px; }

        /* automated block extras */
        .upload-block { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin-bottom:10px; }
        .note { color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0; font-size:12px; padding:6px 8px; border-radius:8px; }

        .signup-footer {
          display:grid; gap:10px; place-items:center; padding:16px; color:#6b7280;
        }
        .signup-footer .links { display:flex; gap:12px; }
        .signup-footer .newsletter { display:flex; gap:6px; }
        .signup-footer .newsletter input { padding:8px 10px; border:1px solid #e5e7eb; border-radius:8px; }
        .signup-footer .newsletter button { border:1px solid #cfe0ff; background:#eaf2ff; border-radius:8px; padding:0 10px; }
        .signup-footer .social { display:flex; gap:10px; }
      `}</style>
    </>
  );
}
