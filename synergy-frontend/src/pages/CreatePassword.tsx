import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestSetPassword, setPasswordWithCode } from "../auth/auth";

export default function CreatePassword() {
  const nav = useNavigate();
  const username = sessionStorage.getItem("gcp.username") || "";

  const [step, setStep] = useState<"request"|"confirm">("request");
  const [code, setCode] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [mfa, setMfa] = useState(false);

  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setErr(null);
    try {
      setLoading(true);
      await requestSetPassword(username);
      setStep("confirm");
    } catch (e:any) {
      setErr(e?.message ?? "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function onContinue() {
    setErr(null);
    if (p1.length < 8) return setErr("Password should be at least 8 characters.");
    if (p1 !== p2) return setErr("Passwords do not match.");
    if (code.trim().length < 6) return setErr("Enter the code.");
    try {
      setLoading(true);
      await setPasswordWithCode(username, code.trim(), p1);
      // MFA toggle is UI-only for now (enable later in Cognito + app)
      sessionStorage.setItem("gcp.mfaWanted", mfa ? "yes" : "no");
      nav("/purpose");
    } catch (e:any) {
      setErr(e?.message ?? "Failed to set password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-bg">
      <div className="card">
        <div className="card-header">Create a Password</div>
        <div className="card-body">
          <Link to="/verify" className="back">← Back</Link>
          <div className="hint">Set up your account security.</div>

          {step === "request" ? (
            <>
              <div className="label">Send code to set password</div>
              <button className="btn" onClick={sendOtp} disabled={loading}>
                {loading ? "Sending..." : "Send Code"}
              </button>
              {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 10 }}>{err}</div>}
              <div className="footer" style={{ marginTop: 14 }}>
                We’ll send a code to your verified contact.
              </div>
            </>
          ) : (
            <>
              <div className="label">Verification Code</div>
              <input className="input" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Enter code" />

              <div className="label">Create Password</div>
              <input className="input" type="password" value={p1} onChange={(e)=>setP1(e.target.value)} placeholder="Create Password" />

              <div className="label">Confirm Password</div>
              <input className="input" type="password" value={p2} onChange={(e)=>setP2(e.target.value)} placeholder="Confirm Password" />

              <label className="checkbox" style={{ marginTop: 12 }}>
                <input type="checkbox" checked={mfa} onChange={(e)=>setMfa(e.target.checked)} />
                <span>Enable Multi-Factor Authentication (MFA)</span>
              </label>

              {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 10 }}>{err}</div>}

              <button className="btn" onClick={onContinue} disabled={loading}>
                {loading ? "Saving..." : "Continue"}
              </button>

              <div className="footer" style={{ marginTop: 12 }}>
                <a className="link" href="#" onClick={(e)=>{e.preventDefault(); sendOtp();}}>Resend Code</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
