import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../auth/auth";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setErr(null);
    try {
      setLoading(true);
      await login(username.trim(), password);

      // 🔥 Route based on purpose + passport initialization
      const purpose = localStorage.getItem("gcp.purpose");
      const initRaw = localStorage.getItem("gcp.passportInit");
      const init = initRaw ? JSON.parse(initRaw) : null;
      const isComplete = init?.status === "complete";

      if (!purpose) nav("/purpose");
      else if (!isComplete) nav("/passport-init");
      else nav("/dashboard");

    } catch (e:any) {
      setErr(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-bg">
      <div className="card">
        <div className="card-header">Log in</div>
        <div className="card-body">
          <div className="label">Email or Phone</div>
          <input
            className="input"
            value={username}
            onChange={(e)=>setUsername(e.target.value)}
            placeholder="Email or +E.164 phone"
          />

          <div className="label">Password</div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            placeholder="Password"
          />

          {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 10 }}>{err}</div>}

          <button className="btn" onClick={onLogin} disabled={loading}>
            {loading ? "Signing in..." : "Continue"}
          </button>

          <div className="footer">
            <Link className="link" to="/reset-password">Forgot password?</Link>
          </div>
          <div className="footer">
            New here? <Link className="link" to="/get-started">Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
