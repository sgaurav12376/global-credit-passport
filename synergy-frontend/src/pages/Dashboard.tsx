import { useEffect, useMemo, useState } from "react";
import { logout, getAccessToken } from "../auth/auth";
import { useNavigate } from "react-router-dom";

const PASSPORT_LS_KEY = "gcp.passportInit";

export default function Dashboard() {
  const nav = useNavigate();
  const [token, setToken] = useState<string|null>(null);

  const passport = useMemo(() => {
    try {
      const raw = localStorage.getItem(PASSPORT_LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

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

          <div className="hint" style={{ textAlign: "left", marginTop: 10 }}>
            Passport status:
          </div>

          <div style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 12,
            fontSize: 13,
            color: "var(--text)"
          }}>
            <div><b>Status:</b> {passport?.status ?? "not_started"}</div>
            <div style={{ marginTop: 6 }}><b>Passport ID:</b> {passport?.passportId ?? "-"}</div>
            <div style={{ marginTop: 6 }}><b>Corridor:</b> {passport?.origin ?? "-"} → {passport?.destination ?? "-"}</div>
            <div style={{ marginTop: 6 }}><b>Purpose:</b> {passport?.purpose ?? "-"}</div>
          </div>

          <button
            className="btn"
            onClick={() => nav("/passport-init")}
            style={{ marginTop: 14 }}
          >
            {passport?.status === "complete" ? "View / Re-run Passport Init" : "Complete Passport Initialization"}
          </button>

          <div className="hint" style={{ textAlign: "left", marginTop: 14 }}>
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
