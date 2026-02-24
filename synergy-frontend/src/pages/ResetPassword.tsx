import { useState } from "react";
import { Link } from "react-router-dom";
import { requestSetPassword, setPasswordWithCode } from "../auth/auth";

export default function ResetPassword() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [phase, setPhase] = useState<"request"|"confirm">("request");

  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setErr(null);
    try {
      setLoading(true);
      await requestSetPassword(username.trim());
      setPhase("confirm");
    } catch (e:any) {
      setErr(e?.message ?? "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setErr(null);
    if (p1 !== p2) return setErr("Passwords do not match.");
    try {
      setLoading(true);
      await setPasswordWithCode(username.trim(), code.trim(), p1);
      setErr(null);
      alert("Password updated. Please login.");
    } catch (e:any) {
      setErr(e?.message ?? "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-bg">
      <div className="card">
        <div className="card-header">Reset Password</div>
        <div className="card-body">
          <Link to="/login" className="back">← Back</Link>

          {phase === "request" ? (
            <>
              <div className="label">Email or Phone</div>
              <input className="input" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Email or +E.164 phone" />
              {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 10 }}>{err}</div>}
              <button className="btn" onClick={send} disabled={loading}>
                {loading ? "Sending..." : "Send Code"}
              </button>
            </>
          ) : (
            <>
              <div className="label">Code</div>
              <input className="input" value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Enter code" />
              <div className="label">New Password</div>
              <input className="input" type="password" value={p1} onChange={(e)=>setP1(e.target.value)} placeholder="New password" />
              <div className="label">Confirm Password</div>
              <input className="input" type="password" value={p2} onChange={(e)=>setP2(e.target.value)} placeholder="Confirm password" />
              {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 10 }}>{err}</div>}
              <button className="btn" onClick={confirm} disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
