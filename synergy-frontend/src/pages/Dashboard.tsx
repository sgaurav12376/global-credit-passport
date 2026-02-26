import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getAccessToken } from "../auth/auth";

type PassportInit = {
  status: "not_started" | "in_progress" | "complete";
  origin?: string;
  destination?: string;
  fullName?: string;
  dob?: string;
  sources?: { creditBureau?: boolean; bank?: boolean };
  updatedAt?: string;
};

function loadInit(): PassportInit | null {
  try {
    const raw = localStorage.getItem("gcp.passportInit");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const nav = useNavigate();
  const [token, setToken] = useState<string | null>(null);

  const init = useMemo(() => loadInit(), []);
  const isComplete = init?.status === "complete";

  useEffect(() => {
    getAccessToken().then(setToken).catch(() => setToken(null));
  }, []);

  return (
    <div className="page-bg">
      <div className="card" style={{ width: 560 }}>
        <div className="card-header">Dashboard</div>
        <div className="card-body">
          <div style={{ color: "var(--text)", fontWeight: 800, fontSize: 16 }}>
            Welcome to Global Credit Passport
          </div>

          {!isComplete && (
            <div style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              color: "var(--text)"
            }}>
              <div style={{ fontWeight: 800 }}>Next step: Initialize your Passport</div>
              <div className="hint" style={{ textAlign: "left", marginTop: 6 }}>
                Your account is created, but your Passport isn’t generated yet. Complete setup to unlock score preview.
              </div>
              <button className="btn" style={{ marginTop: 12 }} onClick={() => nav("/passport-init")}>
                Continue setup
              </button>
            </div>
          )}

          {isComplete && (
            <div style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              color: "var(--text)"
            }}>
              <div style={{ fontWeight: 800 }}>Passport Status: Active ✅</div>
              <div className="hint" style={{ textAlign: "left", marginTop: 6 }}>
                Corridor: {init?.origin || "-"} → {init?.destination || "-"} • Sources:{" "}
                {(init?.sources?.creditBureau ? "Bureau" : "")}
                {(init?.sources?.creditBureau && init?.sources?.bank ? " + " : "")}
                {(init?.sources?.bank ? "Bank" : "")}
              </div>
            </div>
          )}

          <div className="hint" style={{ textAlign: "left", marginTop: 16 }}>
            Your session token (short preview):
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              color: "var(--text)",
              overflow: "auto",
              maxHeight: 160,
            }}
          >
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
