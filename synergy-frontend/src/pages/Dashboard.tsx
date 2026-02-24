import { useEffect, useState } from "react";
import { logout, getAccessToken } from "../auth/auth";

export default function Dashboard() {
  const [token, setToken] = useState<string|null>(null);

  useEffect(() => {
    getAccessToken().then(setToken).catch(() => setToken(null));
  }, []);

  return (
    <div className="page-bg">
      <div className="card" style={{ width: 520 }}>
        <div className="card-header">Dashboard</div>
        <div className="card-body">
          <div style={{ color: "var(--text)", fontWeight: 800, fontSize: 16 }}>
            Welcome to Global Credit Passport
          </div>
          <div className="hint" style={{ textAlign: "left" }}>
            Your session token (short preview):
          </div>

          <div style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
            color: "var(--text)",
            overflow: "auto",
            maxHeight: 160
          }}>
            {token ? token.slice(0, 180) + "..." : "No token yet (log in / sign up)."}
          </div>

          <button className="btn" onClick={() => logout()} style={{ marginTop: 18 }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
