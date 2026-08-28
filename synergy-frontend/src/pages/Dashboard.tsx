import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLatestPassport, getPassportHistory, initPassport } from "../api/passport";
import type { PassportView } from "../api/passport";
import { getAccessToken, logout } from "../auth/auth";

const PASSPORT_LS_KEY = "gcp.passportInit";

function uiStatus(status?: string) {
  if (!status) return "Not started";
  if (status === "ACTIVE") return "Complete";
  if (status === "IN_PROGRESS" || status === "DRAFT") return "In progress";
  return status.replaceAll("_", " ").toLowerCase();
}

export default function Dashboard() {
  const nav = useNavigate();
  const [passport, setPassport] = useState<PassportView | null>(null);
  const [history, setHistory] = useState<PassportView[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingUpdate, setCreatingUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken();
        if (!token) {
          nav("/login");
          return;
        }
        const [latest, all] = await Promise.all([
          getLatestPassport(),
          getPassportHistory(),
        ]);
        setPassport(latest);
        setHistory(all);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load passports.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [nav]);

  async function openSetup(source?: PassportView, supersedes = false) {
    setError(null);
    setCreatingUpdate(true);
    try {
      let newPassportId: string | undefined;
      if (source && supersedes) {
        const result = await initPassport({
          purpose: source.purpose,
          originCountry: source.originCountry,
          destCountry: source.destCountry,
          fullName: source.fullName || undefined,
          dob: source.dob || undefined,
          supersedesPassportId: source.passportId,
        });
        newPassportId = result.passportId;
      }

      const draft = source ? {
        status: "in_progress",
        origin: source.originCountry,
        destination: source.destCountry,
        fullName: source.fullName || "",
        dob: source.dob || "",
        purpose: source.purpose,
        passportId: supersedes ? newPassportId : source.passportId,
        supersedesPassportId: supersedes ? source.passportId : source.supersedesPassportId,
        startStep: supersedes ? 1 : undefined,
        sources: {
          creditBureau: supersedes ? false : source.creditReportConnected,
          bank: source.plaidConnected,
        },
        updatedAt: new Date().toISOString(),
      } : { status: "not_started" };
      localStorage.setItem(PASSPORT_LS_KEY, JSON.stringify(draft));
      if (source?.purpose) {
        localStorage.setItem("gcp.purpose", source.purpose.toLowerCase());
      }
      nav(source ? "/passport-init" : "/purpose");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to create the updated passport."
      );
    } finally {
      setCreatingUpdate(false);
    }
  }

  return (
    <div className="page-bg">
      <div className="card" style={{ width: 560 }}>
        <div className="card-header">Dashboard</div>
        <div className="card-body">
          <div style={{ color: "var(--text)", fontWeight: 800, fontSize: 16 }}>
            Welcome to Global Credit Passport
          </div>

          {loading && <div className="hint" style={{ marginTop: 12 }}>Loading passport...</div>}
          {error && <div style={{ color: "#b00020", fontSize: 13, marginTop: 12 }}>{error}</div>}

          {!loading && !passport && (
            <>
              <div className="hint" style={{ marginTop: 12 }}>No passport has been started.</div>
              <button className="btn" onClick={() => void openSetup()} style={{ marginTop: 14 }}>
                Start Passport
              </button>
            </>
          )}

          {passport && (
            <>
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, fontSize: 13, color: "var(--text)", marginTop: 12, textAlign: "left" }}>
                <div><b>Status:</b> {uiStatus(passport.status)}</div>
                <div style={{ marginTop: 6 }}><b>Passport ID:</b> {passport.passportId}</div>
                <div style={{ marginTop: 6 }}><b>Corridor:</b> {passport.originCountry} → {passport.destCountry}</div>
                <div style={{ marginTop: 6 }}><b>Purpose:</b> {passport.purpose}</div>
                <div style={{ marginTop: 6 }}>
                  <b>Sources:</b>{" "}
                  {passport.creditReportConnected ? "Credit bureau" : ""}
                  {passport.creditReportConnected && passport.plaidConnected ? ", " : ""}
                  {passport.plaidConnected ? "Bank/Open Banking" : ""}
                  {!passport.creditReportConnected && !passport.plaidConnected ? "None" : ""}
                </div>
                <div style={{ marginTop: 6 }}><b>Updated:</b> {new Date(passport.updatedAt).toLocaleString()}</div>
              </div>

              {passport.status === "ACTIVE" ? (
                <button
                  className="btn"
                  onClick={() => void openSetup(passport, true)}
                  disabled={creatingUpdate}
                  style={{ marginTop: 14 }}
                >
                  {creatingUpdate ? "Creating updated passport..." : "Create Updated Passport"}
                </button>
              ) : (
                <button className="btn" onClick={() => void openSetup(passport)} style={{ marginTop: 14 }}>
                  Resume Passport Setup
                </button>
              )}
            </>
          )}

          {history.length > 1 && (
            <details style={{ marginTop: 14, textAlign: "left" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Passport history ({history.length})</summary>
              <div style={{ maxHeight: 170, overflowY: "auto", display: "grid", gap: 6, marginTop: 8 }}>
                {history.map((item) => (
                  <div key={item.passportId} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8, fontSize: 11 }}>
                    <b>{item.originCountry} → {item.destCountry}</b> · {uiStatus(item.status)}
                    <div>{item.passportId}</div>
                    <div>{new Date(item.updatedAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          <button className="btn" onClick={() => logout()} style={{ marginTop: 18 }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
