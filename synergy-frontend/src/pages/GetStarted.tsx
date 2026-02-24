import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { startSignUp } from "/src/auth/auth.ts";
import type { SignUpIdentifier } from "/src/auth/auth.ts";

const COUNTRIES = [
  { code: "US", name: "United States", dial: "+1" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "AE", name: "UAE", dial: "+971" },
];

function toE164(dial: string, national: string) {
  const digits = national.replace(/[^\d]/g, "");
  return `${dial}${digits}`;
}

export default function GetStarted() {
  const nav = useNavigate();
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const selected = useMemo(() => COUNTRIES.find(c => c.code === country)!, [country]);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onContinue() {
    setErr(null);
    if (!agree) return setErr("Please accept Terms & Privacy Policy.");
    const hasEmail = email.trim().length > 0;
    const hasPhone = phone.trim().length > 0;

    if (!hasEmail && !hasPhone) return setErr("Enter email or phone number.");
    if (hasEmail && hasPhone) return setErr("Use either email OR phone.");

    const id: SignUpIdentifier =
      hasEmail
        ? { type: "email", value: email.trim().toLowerCase() }
        : { type: "phone", value: toE164(selected.dial, phone) };

    try {
      setLoading(true);
      const res = await startSignUp(id);

      // store username for next steps
      sessionStorage.setItem("gcp.username", res.username);
      sessionStorage.setItem("gcp.idType", id.type);
      sessionStorage.setItem("gcp.country", country);

      nav("/verify");
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-bg">
      <div className="card">
        <div className="card-header">Get Started</div>
        <div className="card-body">
          <div style={{ textAlign: "center", fontWeight: 700, color: "var(--text)" }}>
            Sign Up to Global Credit Passport
          </div>

          <div className="label">Select Your Country</div>
          <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>

          <div className="label">Mobile Number</div>
          <div className="row">
            <input className="input" value={selected.dial} readOnly />
            <input
              className="input"
              placeholder="Enter your mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
          </div>

          <div className="or">OR</div>

          <div className="label">Email</div>
          <input
            className="input"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
          />

          <label className="checkbox">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              I agree to the <a className="link" href="#" onClick={(e)=>e.preventDefault()}>Terms</a> &{" "}
              <a className="link" href="#" onClick={(e)=>e.preventDefault()}>Privacy Policy</a>
            </span>
          </label>

          {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 10 }}>{err}</div>}

          <button className="btn" onClick={onContinue} disabled={loading}>
            {loading ? "Please wait..." : "Continue"}
          </button>

          <div className="footer">
            Already have an account? <a className="link" href="/login">Log in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
