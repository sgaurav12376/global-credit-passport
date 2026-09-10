import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLatestPassport, getPassportHistory, getPassportOutput } from "../api/passport";
import type { PassportOutput, PassportView } from "../api/passport";
import { getAccessToken, logout } from "../auth/auth";

const PASSPORT_LS_KEY = "gcp.passportInit";

function sourceCount(passport: PassportView) {
  return Number(passport.creditReportConnected) + Number(passport.plaidConnected);
}

function uiStatus(status?: string) {
  return status === "ACTIVE" ? "Ready" : status === "IN_PROGRESS" || status === "DRAFT" ? "In progress" : "Not started";
}

function identityLabel(status?: string | null, sandbox = true) {
  const normalized = (status || "").replace("ENTRUST_", "");
  if (normalized === "APPROVED") return "Verified";
  if (normalized === "DECLINED") return sandbox ? "Sandbox result recorded" : "Verification declined";
  if (normalized === "PROCESSING" || normalized === "AWAITING_INPUT") return "Verification in progress";
  if (normalized === "ERROR" || normalized === "ABANDONED") return "Verification incomplete";
  return "Profile provided";
}

function reasonLabel(reason?: string) {
  if (!reason) return "Unavailable";
  return reason.toLowerCase().replaceAll("_", " ");
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
  const [output, setOutput] = useState<PassportOutput | null>(null);
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
        const published = passports.find((item) => item.status === "ACTIVE");
        if (published) setOutput(await getPassportOutput(published.passportId));
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
        <div className="source-summary-row"><div><span className={active.creditReportConnected ? "dot ready" : "dot"}/><p><b>Credit history</b><small>{active.creditReportConnected ? "Connected" : "Not added"}</small></p></div><div><span className={active.plaidConnected ? "dot ready" : "dot"}/><p><b>Bank information</b><small>{active.plaidConnected ? "Connected" : "Not added"}</small></p></div><div><span className={active.identityStatus === "ENTRUST_APPROVED" ? "dot ready" : "dot warning"}/><p><b>Identity</b><small>{identityLabel(active.identityStatus)}</small></p></div></div>
        {draft && active.passportId !== draft.passportId ? <>
          <div className="inline-notice">You have an unfinished update. Your current passport remains available.</div>
          <button className="btn primary-action" onClick={() => open(draft, "edit")}>Continue update</button>
        </> : <button className="btn primary-action" onClick={() => open(active, "view", 4)}>Open passport</button>}
      </section>
      {output && <section className="simple-card passport-summary-card">
        <div className="summary-heading"><div><span className="eyebrow">UNIFIED OUTPUT</span><h2>Global Credit Passport</h2><p>{output.schemaVersion}</p></div><span className="status-pill light">✓ {output.document.status}</span></div>
        <div className="source-summary-row">
          <div><span className={output.document.coverage.creditBureauAvailable ? "dot ready" : "dot"}/><p><b>Surepass</b><small>{output.document.coverage.creditBureauAvailable ? "Included" : "Not included"}</small></p></div>
          <div><span className={output.document.coverage.openBankingAvailable ? "dot ready" : "dot"}/><p><b>Plaid</b><small>{output.document.coverage.openBankingAvailable ? "Included" : "Not included"}</small></p></div>
          <div><span className={output.document.identityVerification.status === "APPROVED" ? "dot ready" : "dot warning"}/><p><b>Entrust</b><small>{identityLabel(output.document.identityVerification.status, output.document.identityVerification.sandboxSimulation)}{output.document.identityVerification.sandboxSimulation ? " · non-blocking" : ""}</small></p></div>
        </div>
        {output.document.evidenceCoverage && <div className="evidence-panel">
          <div className="evidence-title"><div><span className="eyebrow">EVIDENCE COVERAGE</span><h3>{output.document.evidenceCoverage.coveragePercent}% available</h3></div><span className={output.document.evidenceCoverage.sufficientForRiskAssessment ? "status-pill light" : "status-pill evidence-pending"}>{output.document.evidenceCoverage.sufficientForRiskAssessment ? "Sufficient evidence" : "More evidence needed"}</span></div>
          <div className="coverage-track"><span style={{ width: `${output.document.evidenceCoverage.coveragePercent}%` }}/></div>
          <div className="coverage-domains">{["IDENTITY", "CREDIT", "CASHFLOW"].map((domain) => { const item = output.document.evidenceCoverage?.domains[domain]; return <div key={domain}><b>{domain.charAt(0) + domain.slice(1).toLowerCase()}</b><small>{item?.available ? `${item.evidenceCount} record${item.evidenceCount === 1 ? "" : "s"} · ${item.bestCompletenessPercent}% complete` : "Not available"}</small></div>; })}</div>
          {output.document.creditReconciliation && output.document.creditReconciliation.bureauCount > 0 && <div className="bureau-comparison"><b>Native bureau scores</b><div>{output.document.creditReconciliation.nativeScores.map((score) => <span key={`${score.provider}-${score.bureau}`}><strong>{score.value ?? "—"}</strong><small>{score.bureau}{score.minimum != null && score.maximum != null ? ` · ${score.minimum}–${score.maximum}` : ""}</small></span>)}</div>{output.document.creditReconciliation.bureauCount > 1 && <p>Scores are preserved in their native bureau models and are not averaged.</p>}</div>}
        </div>}
        {output.document.riskAssessment && <div className="risk-panel">
          <div className="risk-head"><div><span className="eyebrow">RISK INTELLIGENCE</span><h3>{output.document.riskAssessment.riskIndex ?? "—"}<small>/100 GCP risk index</small></h3><p>{output.document.riskAssessment.riskIndex == null ? "Insufficient evidence to calculate" : output.document.riskAssessment.riskBand.replaceAll("_", " ")}</p></div><div className="confidence-score"><b>{output.document.riskAssessment.confidence.score}%</b><span>{output.document.riskAssessment.confidence.band.toLowerCase()} confidence</span></div></div>
          <div className="risk-dimensions">{output.document.riskAssessment.dimensions.map((dimension) => <div key={dimension.key}><span><b>{dimension.label}</b><small>{dimension.available ? dimension.band.toLowerCase() : reasonLabel(dimension.reasonCodes[0])}</small></span><strong>{dimension.score ?? "—"}</strong></div>)}</div>
          <p className="risk-disclosure">Pilot risk intelligence only. This is not a lender approval decision. Missing dimensions are not treated as zero.</p>
          <details className="explainability-panel">
            <summary>How my assessment was calculated</summary>
            <div className="explainability-content">
              <section>
                <span className="eyebrow">RISK CALCULATION</span>
                <h4>Available dimensions only</h4>
                {output.document.riskAssessment.calculationTrace ? <>
                  <div className="formula-box">
                    <code>({output.document.riskAssessment.dimensions.filter((item) => item.available).map((item) => `${item.score} × ${item.configuredWeight}`).join(" + ")}) ÷ {output.document.riskAssessment.calculationTrace.availableConfiguredWeight} = {output.document.riskAssessment.riskIndex}</code>
                    <small>{output.document.riskAssessment.calculationTrace.availableConfiguredWeight} of {output.document.riskAssessment.calculationTrace.totalConfiguredWeight} configured weight was usable. Missing dimensions were excluded.</small>
                  </div>
                  <div className="audit-dimension-list">{output.document.riskAssessment.dimensions.map((item) => <div key={item.key}><span><b>{item.label}</b><small>{item.available ? `${item.score}/100 · ${item.configuredWeight}% weight` : `${item.configuredWeight}% weight · excluded: ${reasonLabel(item.reasonCodes[0])}`}</small></span><em>{item.available ? "Included" : "Excluded"}</em></div>)}</div>
                </> : <p className="audit-muted">This legacy output predates the calculation trace. Regenerate the passport to create a V2 audit record.</p>}
              </section>
              <section>
                <span className="eyebrow">CONFIDENCE</span>
                <h4>{output.document.riskAssessment.confidence.score}% {output.document.riskAssessment.confidence.band.toLowerCase()} confidence</h4>
                <div className="confidence-components">
                  {[ ["Evidence coverage", output.document.riskAssessment.confidence.coverageComponent], ["Completeness", output.document.riskAssessment.confidence.completenessComponent], ["Freshness", output.document.riskAssessment.confidence.freshnessComponent], ["Consistency", output.document.riskAssessment.confidence.consistencyComponent], ["Identity assurance", output.document.riskAssessment.confidence.identityAssuranceComponent], ["Analytical availability", output.document.riskAssessment.confidence.analyticalAvailabilityComponent] ].map(([label, value]) => <div key={String(label)}><span>{label}</span><b>{value}%</b></div>)}
                </div>
                <p className="audit-muted">Confidence measures the strength and usability of evidence. It does not increase or decrease the risk index.</p>
              </section>
              <p className="borrower-audit-note">Your detailed evidence provenance and audit record are securely retained with this passport and are not displayed here.</p>
            </div>
          </details>
        </div>}
      </section>}
      <details className="history-disclosure"><summary>Activity and passport history</summary><div className="version-list">{history.filter((item) => item.status !== "CANCELLED").map((item) => <button key={item.passportId} onClick={() => open(item, "view")}><span><b>{item.originCountry} → {item.destCountry}</b><small>{new Date(item.updatedAt).toLocaleString()}</small></span><em>{uiStatus(item.status)}</em></button>)}</div></details>
    </>}
  </main></div>;
}
