import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { verifySignUp } from "../auth/auth";
import OtpInput from "../components/OtpInput";

export default function Verify() {
  const nav = useNavigate();
  const username = sessionStorage.getItem("gcp.username") || "";
  const idType = sessionStorage.getItem("gcp.idType") || "email";

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onVerify() {
    setErr(null);
    if (code.length !== 6) return setErr("Enter the 6-digit code.");

    try {
      setLoading(true);
      await verifySignUp(username, code);
      nav("/create-password");
    } catch (e: any) {
      setErr(e?.message ?? "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-bg">
      <div className="card">
        <div className="card-header">Verify Your {idType === "phone" ? "Phone" : "Email"}</div>
        <div className="card-body">
          <Link to="/get-started" className="back">← Back</Link>

          <div className="hint">
            Enter the 6-digit code sent to your {idType === "phone" ? "number" : "email"}.
          </div>

          <div className="otp">
            <OtpInput length={6} value={code} onChange={setCode} autoFocus />
          </div>

          {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 8 }}>{err}</div>}

          <button className="btn" onClick={onVerify} disabled={loading}>
            {loading ? "Verifying..." : "Continue"}
          </button>

          <div className="footer" style={{ marginTop: 16 }}>
            Didn’t receive the code?{" "}
            <a className="link" href="#" onClick={(e) => e.preventDefault()}>
              Resend Code
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
