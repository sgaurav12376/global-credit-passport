import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLatestPassport, getPassportHistory } from "../api/passport";
import type { PassportView } from "../api/passport";
import { getAccessToken, logout } from "../auth/auth";

const PASSPORT_LS_KEY = "gcp.passportInit";

function sourceCount(passport: PassportView) {
  return Number(passport.creditReportConnected) + Number(passport.plaidConnected);
}

function uiStatus(status?: string) {
  return status === "ACTIVE" ? "Ready" : status === "IN_PROGRESS" || status === "DRAFT" ? "In progress" : "Not started";
}

function stepForSection(section?: string | null): 1 | 2 | 3 | 4 {
  if (section === "IDENTITY") return 2;
  if (section === "FINANCIAL") return 3;
  if (section === "REVIEW" || section === "OVERVIEW") return 4;
  return 1;
}

export default function Dashboard() {
  const nav = useNavigate();
  const [latest, setLatest] = useState<PassportView | null>(null);
  const [history, setHistory] = useState<PassportView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const active = useMemo(() => history.find((item) => item.status === "ACTIVE") || latest, [history, latest]);
  const draft = useMemo(() => history.find((item) => item.status === "IN_PROGRESS" || item.status === "DRAFT"), [history]);

  useEffect(() => {
    async function load() {
      try {
        if (!await getAccessToken()) return nav("/login");
        const [latestPassport, passports] = await Promise.all([getLatestPassport(), getPassportHistory()]);
        setLatest(latestPassport); setHistory(passports);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to load your passport.");
      } finally { setLoading(false); }
    }
    void load();
  }, [nav]);

  function open(source: PassportView, mode: "view" | "edit", startStep = stepForSection(source.currentSection)) {
    localStorage.setItem(PASSPORT_LS_KEY, JSON.stringify({
      status: "in_progress", mode, origin: source.originCountry, destination: source.destCountry,
      fullName: source.fullName || "", dob: source.dob || "", purpose: source.purpose,
      passportId: source.passportId, supersedesPassportId: source.supersedesPassportId,
      identityStatus: source.identityStatus, identityCompletedAt: source.identityCompletedAt,
      startStep, sources: { creditBureau: source.creditReportConnected, bank: source.plaidConnected },
      updatedAt: new Date().toISOString(),
    }));
    localStorage.setItem("gcp.purpose", source.purpose.toLowerCase());
    nav("/passport-init");
  }

  return <div className="page-bg workspace-bg"><main className="simple-dashboard">
    <header className="simple-topbar"><div><span className="brand-mark">GCP</span><b>Global Credit Passport</b></div><button className="text-button" onClick={() => logout()}>Sign out</button></header>
    {loading && <section className="simple-card empty-state">Loading your passport…</section>}
    {error && <div className="alert-error">{error}</div>}
    {!loading && !latest && <section className="simple-card welcome-card"><span className="eyebrow">GET STARTED</span><h1>Build your credit passport</h1><p>Verify who you are and bring your financial information together in one place.</p><button className="btn primary-action" onClick={() => nav("/purpose")}>Get started</button><small>Usually takes about 5–10 minutes</small></section>}
    {active && <>
      <section className="greeting"><span className="eyebrow">YOUR PASSPORT</span><h1>Welcome back{active.fullName ? `, ${active.fullName.split(" ")[0]}` : ""}</h1><p>Everything important is summarized below.</p></section>
      <section className="simple-card passport-summary-card">
        <div className="summary-heading"><div><span className="status-pill light">✓ {uiStatus(active.status)}</span><h2>{active.originCountry} <span>→</span> {active.destCountry}</h2><p>{active.purpose.charAt(0) + active.purpose.slice(1).toLowerCase()} passport</p></div><div className="passport-score"><b>{sourceCount(active)}</b><span>verified data sources</span></div></div>
        <div className="source-summary-row"><div><span className={active.creditReportConnected ? "dot ready" : "dot"}/><p><b>Credit history</b><small>{active.creditReportConnected ? "Connected" : "Not added"}</small></p></div><div><span className={active.plaidConnected ? "dot ready" : "dot"}/><p><b>Bank information</b><small>{active.plaidConnected ? "Connected" : "Not added"}</small></p></div><div><span className="dot ready"/><p><b>Identity</b><small>Profile completed</small></p></div></div>
        {draft && active.passportId !== draft.passportId ? <>
          <div className="inline-notice">You have an unfinished update. Your current passport remains available.</div>
          <button className="btn primary-action" onClick={() => open(draft, "edit")}>Continue update</button>
        </> : <button className="btn primary-action" onClick={() => open(active, "view", 4)}>Open passport</button>}
      </section>
      <details className="history-disclosure"><summary>Activity and passport history</summary><div className="version-list">{history.filter((item) => item.status !== "CANCELLED").map((item) => <button key={item.passportId} onClick={() => open(item, "view")}><span><b>{item.originCountry} → {item.destCountry}</b><small>{new Date(item.updatedAt).toLocaleString()}</small></span><em>{uiStatus(item.status)}</em></button>)}</div></details>
    </>}
  </main></div>;
}
