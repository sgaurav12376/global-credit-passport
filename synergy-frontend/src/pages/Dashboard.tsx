import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLatestPassport, getPassportHistory, getPassportOutput, getPassportShares, subscribeBorrowerReviewEvents } from "../api/passport";
import type { PassportOutput, PassportShareSummary, PassportView, ReviewStatus } from "../api/passport";
import { getAccessToken, logout } from "../auth/auth";
import PassportSharing from "../components/PassportSharing";
import OpenBankingEvidence from "../components/OpenBankingEvidence";
import { friendlyBureauLabel, friendlyEvidenceSource, friendlyObservedValue } from "../lib/evidenceLabels";

const PASSPORT_LS_KEY = "gcp.passportInit";

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

function purposeLabel(value?: string) {
  const normalized = (value || "").toUpperCase();
  const labels: Record<string, string> = {
    LOAN: "Loan",
    MORTGAGE: "Mortgage",
    RENTAL: "Rental",
    CREDIT_CARD: "Credit application",
    EMPLOYMENT: "Employment",
  };
  return labels[normalized] || (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "Financial");
}

function countryLabel(code?: string) {
  const labels: Record<string, string> = {
    IN: "India", US: "United States", CA: "Canada", GB: "United Kingdom", UK: "United Kingdom",
    SG: "Singapore", AE: "United Arab Emirates", AU: "Australia", DE: "Germany", FR: "France",
  };
  return labels[(code || "").toUpperCase()] || code || "Destination country";
}

function borrowerProfileBand(value?: string | null) {
  const labels: Record<string, string> = {
    LOW_RISK: "Strong observed profile",
    MODERATE_LOW_RISK: "Mixed observed profile",
    MODERATE_RISK: "Developing observed profile",
    MODERATE_HIGH_RISK: "Observed profile needs attention",
    HIGH_RISK: "Observed profile needs attention",
  };
  return value ? labels[value] || value.replaceAll("_", " ").toLowerCase() : "Not enough evidence";
}

function reviewStatusLabel(status?: ReviewStatus) {
  const labels: Record<ReviewStatus, string> = {
    NOT_OPENED: "Shared · awaiting lender",
    VIEWED: "Profile viewed",
    UNDER_REVIEW: "Under lender review",
    INFORMATION_REQUESTED: "Information requested",
    COMPLETED: "Review completed",
  };
  return status ? labels[status] : "Not shared yet";
}

function stepForSection(section?: string | null): 1 | 2 | 3 | 4 {
  if (section === "IDENTITY") return 2;
  if (section === "FINANCIAL") return 3;
  if (section === "REVIEW" || section === "OVERVIEW") return 4;
  return 1;
}

function domainLabel(domain: string) {
  const labels: Record<string, string> = { CREDIT: "Credit history", CASHFLOW: "Banking and cash flow" };
  return labels[domain] || domain.charAt(0) + domain.slice(1).toLowerCase();
}

function evidenceStatusLabel(available: boolean, domain: string, isOrigin: boolean) {
  if (available) return "Available";
  if (domain === "CREDIT" && !isOrigin) return "No local credit file included";
  if (domain === "CASHFLOW" && isOrigin) return "Provider connection not yet available";
  return "Not connected";
}

function reconciliationMetricLabel(metric: string) {
  const labels: Record<string, string> = {
    totalAccounts: "Total accounts", activeAccounts: "Active accounts",
    closedAccounts: "Closed accounts", overdueOrDefaultAccounts: "Overdue/default accounts",
    securedAccounts: "Secured accounts", unsecuredAccounts: "Unsecured accounts",
    currentBalance: "Reported balance", sanctionedAmount: "Reported credit amount",
    creditHistoryMonths: "Credit-history length", recentEnquiries: "Recent enquiries",
    maximumDaysPastDue: "Maximum days past due", writtenOffAccounts: "Written-off accounts",
  };
  return labels[metric] || reasonLabel(metric);
}

function reconciliationRange(metric: string, minimum: number, maximum: number) {
  if (metric === "creditHistoryMonths") return `${minimum}–${maximum} months`;
  if (metric === "currentBalance" || metric === "sanctionedAmount") {
    return `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(minimum)}–${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(maximum)}`;
  }
  return `${minimum}–${maximum}`;
}

export default function Dashboard() {
  const nav = useNavigate();
  const [dashboardView, setDashboardView] = useState<"overview" | "financial" | "score" | "sharing">("overview");
  const [openRecordSections, setOpenRecordSections] = useState<Record<string, boolean>>({});
  const [showAssessmentDetails, setShowAssessmentDetails] = useState(false);
  const [latest, setLatest] = useState<PassportView | null>(null);
  const [history, setHistory] = useState<PassportView[]>([]);
  const [output, setOutput] = useState<PassportOutput | null>(null);
  const [shares, setShares] = useState<PassportShareSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const active = useMemo(() => history.find((item) => item.status === "ACTIVE") || latest, [history, latest]);
  const draft = useMemo(() => history.find((item) => item.status === "IN_PROGRESS" || item.status === "DRAFT"), [history]);
  const applicationPurpose = purposeLabel(active?.purpose);
  const currentApplication = useMemo(() => shares.find((share) => share.status === "ACTIVE") || null, [shares]);
  const latestLenderAccess = useMemo(() => shares[0] || null, [shares]);
  const assessmentDimensions = output?.document.riskAssessment?.dimensions || [];
  const assessmentExplanations = output?.document.riskAssessment?.dimensionExplanations || [];
  const positiveDimensions = assessmentDimensions.filter((item) => item.available && item.score != null && item.score >= 70).slice(0, 4);
  const attentionDimensions = assessmentDimensions.filter((item) => item.available && item.score != null && item.score < 70).slice(0, 3);
  const consistencyScore = output?.document.riskAssessment?.confidence.consistencyComponent;
  const financialEvidence = useMemo(() => {
    if (!output || !active) return null;
    const origin = active.originCountry.toUpperCase();
    const destination = active.destCountry.toUpperCase();
    const evidence = output.document.normalizedEvidence || [];
    const hasEvidence = (domain: string, country: string) => evidence.some((item) => item.domain === domain && item.countryCode.toUpperCase() === country);
    const creditCountry = evidence.find((item) => item.domain === "CREDIT")?.countryCode.toUpperCase() || origin;
    const cashflowCountry = evidence.find((item) => item.domain === "CASHFLOW")?.countryCode.toUpperCase() || destination;
    const available = (domain: string, country: string) => hasEvidence(domain, country)
      || (domain === "CREDIT" && output.document.coverage.creditBureauAvailable && creditCountry === country)
      || (domain === "CASHFLOW" && output.document.coverage.openBankingAvailable && cashflowCountry === country);
    const cells = [
      { country: origin, domain: "CREDIT", available: available("CREDIT", origin), isOrigin: true },
      { country: origin, domain: "CASHFLOW", available: available("CASHFLOW", origin), isOrigin: true },
      { country: destination, domain: "CREDIT", available: available("CREDIT", destination), isOrigin: false },
      { country: destination, domain: "CASHFLOW", available: available("CASHFLOW", destination), isOrigin: false },
    ];
    return { origin, destination, cells };
  }, [active, output]);

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

  useEffect(() => {
    if (!output?.passportId) return;
    const loadShares = async () => {
      try { setShares(await getPassportShares(output.passportId)); }
      catch { setShares([]); }
    };
    void loadShares();
    return subscribeBorrowerReviewEvents(output.passportId, () => void loadShares());
  }, [output?.passportId]);

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

  const viewHeading = {
    overview: { eyebrow: "HOME", title: "Your application overview", description: "See your status, next action and supporting financial profile in one place." },
    financial: { eyebrow: "RECORDS", title: "Your supporting information", description: "Review the credit and financial-account records carried in your passport." },
    score: { eyebrow: "ASSESSMENT", title: "How your profile was assessed", description: "Understand the factors that contributed to your profile index." },
    sharing: { eyebrow: "SHARING & HISTORY", title: "Lender access", description: "Share your profile, complete lender requests and review previous access." },
  }[dashboardView];

  const evidenceEnvironment = output?.document.evidenceEnvironment;
  const testEvidence = evidenceEnvironment
    ? evidenceEnvironment.creditSimulated || Boolean(evidenceEnvironment.creditProviderTest) || evidenceEnvironment.openBankingSandbox || evidenceEnvironment.identitySandbox
    : Boolean(output?.document.coverage.creditBureauSimulated || output?.document.identityVerification.sandboxSimulation);
  const testEvidenceDescriptions = output ? [
    (evidenceEnvironment?.creditSimulated ?? output.document.coverage.creditBureauSimulated)
      ? `${countryLabel(active?.originCountry)} credit history is simulated` : null,
    evidenceEnvironment?.creditProviderTest
      ? `${countryLabel(active?.originCountry)} credit history uses provider test data` : null,
    evidenceEnvironment?.openBankingSandbox
      ? `${countryLabel(active?.destCountry)} open-banking information uses sandbox data` : null,
    (evidenceEnvironment?.identitySandbox ?? output.document.identityVerification.sandboxSimulation)
      ? "Identity verification uses a sandbox result" : null,
  ].filter(Boolean) : [];

  return <div className="page-bg workspace-bg"><main className="simple-dashboard">
    <header className="simple-topbar"><div><span className="brand-mark">GCP</span><b>Global Credit Passport</b></div><button className="text-button" onClick={() => logout()}>Sign out</button></header>
    {loading && <section className="simple-card empty-state">Loading your passport…</section>}
    {error && <div className="alert-error">{error}</div>}
    {!loading && !latest && <section className="simple-card welcome-card"><span className="eyebrow">GET STARTED</span><h1>Build your credit passport</h1><p>Verify who you are and bring your financial information together in one place.</p><button className="btn primary-action" onClick={() => nav("/purpose")}>Get started</button><small>Usually takes about 5–10 minutes</small></section>}
    {active && <>
      <section className="greeting"><span className="eyebrow">WELCOME BACK</span><h1>{active.fullName ? active.fullName.split(" ")[0] : "Your financial journey"}</h1><p>Carry your financial profile across borders.</p></section>
      <section className="simple-card journey-card">
        <div className="journey-card-header"><div><span className="eyebrow">CROSS-BORDER FINANCIAL PROFILE</span><h2>{active.fullName ? `${active.fullName}’s` : "Your"} Global Credit Passport</h2><p>Identity, credit and financial information standardized for destination-country lender review.</p></div><span className="status-pill light">✓ Ready to share securely</span></div>
        <div className="cross-border-route" aria-label={`${active.originCountry} to ${active.destCountry} financial journey`}>
          <div className="route-country"><span>Financial history from</span><b>{active.originCountry}</b><small>{countryLabel(active.originCountry)} evidence</small></div>
          <div className="route-progress"><span className="route-line"/><span className="route-plane" aria-hidden="true">✈</span><strong>GCP standardized profile</strong><small>Identity · credit · cash flow</small></div>
          <div className="route-country destination"><span>Applying in</span><b>{active.destCountry}</b><small>{countryLabel(active.destCountry)} · {applicationPurpose}</small></div>
        </div>
        <details className="passport-preparation"><summary>How your financial profile was prepared</summary><div className="passport-progress" aria-label="Financial profile preparation progress"><div className={active.creditReportConnected && active.plaidConnected ? "complete" : ""}><span>1</span><p><b>Financial information collected</b><small>Credit and account evidence</small></p></div><div className={active.identityStatus ? "complete" : ""}><span>2</span><p><b>Identity verification recorded</b><small>{identityLabel(active.identityStatus)}</small></p></div><div className={output ? "complete" : ""}><span>3</span><p><b>Evidence standardized</b><small>Cross-border format prepared</small></p></div><div className={active.status === "ACTIVE" ? "complete" : ""}><span>4</span><p><b>Profile ready</b><small>Available to share securely</small></p></div></div></details>
        {draft && active.passportId !== draft.passportId ? <>
          <div className="inline-notice">You have an unfinished update. Your current passport remains available.</div>
          <button className="btn primary-action" onClick={() => open(draft, "edit")}>Continue update</button>
        </> : <button className="btn journey-update-action" onClick={() => open(active, "view", 4)}>Review financial information</button>}
      </section>
      {output && <nav className="passport-navigation" aria-label="Passport sections">
        {[
          ["overview", "Home"],
          ["financial", "Records"],
          ["score", "Assessment"],
          ["sharing", "Sharing & history"],
        ].map(([key, label]) => <button key={key} type="button" className={dashboardView === key ? "active" : ""} aria-current={dashboardView === key ? "page" : undefined} onClick={() => setDashboardView(key as typeof dashboardView)}>{label}</button>)}
      </nav>}
      {output && <section className="simple-card passport-summary-card">
        <div className="summary-heading tab-heading"><div><span className="eyebrow">{viewHeading.eyebrow}</span><h2>{viewHeading.title}</h2><p>{viewHeading.description}</p></div></div>
        {dashboardView === "overview" && (testEvidence ? <div className="simulation-warning"><b>PILOT TEST REPORT</b><span>{testEvidenceDescriptions.join(". ")}. This report is for development testing only and must not be used for a lending decision.</span></div> : <div className="simulation-warning"><b>PILOT ASSESSMENT</b><span>This profile uses provider-supplied evidence processed through GCP’s pilot assessment framework. The profile index is not a credit score, approval recommendation or lending decision.</span></div>)}
        {dashboardView === "overview" && <>
        <section className={`borrower-command-status ${currentApplication?.review.status === "INFORMATION_REQUESTED" ? "action-required" : ""}`}>
          {currentApplication ? <>
            <div><span className="eyebrow">APPLICATION STATUS</span><h3>{currentApplication.recipientName} is reviewing your profile</h3><p>{reviewStatusLabel(currentApplication.review.status)} · {currentApplication.purpose}</p>{currentApplication.review.borrowerMessage && <small>Lender message: {currentApplication.review.borrowerMessage}</small>}</div>
            <div className="command-status-action"><span><small>Access ends</small><b>{new Date(currentApplication.expiresAt).toLocaleDateString()}</b></span><button type="button" onClick={() => setDashboardView("sharing")}>{currentApplication.review.status === "INFORMATION_REQUESTED" ? "Complete lender request" : "View lender activity"}</button></div>
          </> : <>
            <div><span className="eyebrow">APPLICATION STATUS</span><h3>Your profile is ready for lender review</h3><p>No lender currently has active access.</p>{latestLenderAccess && <small>Previous access for {latestLenderAccess.recipientName} ended {new Date(latestLenderAccess.expiresAt).toLocaleDateString()}.</small>}</div>
            <div className="command-status-action"><button type="button" onClick={() => setDashboardView("sharing")}>Share with a lender</button></div>
          </>}
        </section>
        {output.document.riskAssessment && <div className="command-profile-grid">
          <article className="command-score"><span>Profile index</span><strong>{output.document.riskAssessment.riskIndex ?? "—"}<small>/100</small></strong><b>{borrowerProfileBand(output.document.riskAssessment.riskBand)}</b></article>
          <article><span>What lenders should notice</span><div className="command-signal-columns"><div><small>Needs review</small>{attentionDimensions.slice(0, 2).map((dimension) => <b key={dimension.key}>{dimension.label}</b>)}</div><div><small>Supporting</small>{positiveDimensions.slice(0, 2).map((dimension) => <b key={dimension.key}>{dimension.label}</b>)}</div></div></article>
          <article><span>Supporting information</span><strong>{output.document.riskAssessment.confidence.score}%</strong><b>ready for assessment</b><small>{consistencyScore != null && consistencyScore < 60 ? `Bureau agreement ${consistencyScore}% · review differences` : "Records are substantially complete"}</small></article>
        </div>}
        {financialEvidence && <section className="command-evidence"><header><span className="eyebrow">INFORMATION INCLUDED</span><button type="button" onClick={() => setDashboardView("financial")}>Review records</button></header><div>
          <article><span className="country-chip">{financialEvidence.origin}</span><p><b>{countryLabel(financialEvidence.origin)} credit history</b><small>{output.document.creditReconciliation?.bureauCount || 0} bureau record{output.document.creditReconciliation?.bureauCount === 1 ? "" : "s"} included</small></p></article>
          <article><span className="country-chip">{financialEvidence.destination}</span><p><b>{countryLabel(financialEvidence.destination)} banking and cash flow</b><small>{output.document.coverage.openBankingAvailable ? "Connected account analysis included" : "Not connected"}</small></p></article>
        </div></section>}
        </>}
        {dashboardView === "financial" && financialEvidence && <div className="financial-records-view">
          <div className="record-summary-grid">
            <article><span className="country-chip">{financialEvidence.origin}</span><div><small>SOURCE-COUNTRY CREDIT</small><b>{output.document.creditReconciliation?.bureauCount || 0} bureau record{output.document.creditReconciliation?.bureauCount === 1 ? "" : "s"}</b><p>{output.document.creditReconciliation?.nativeScores.map((score) => `${friendlyBureauLabel(score.bureau)} ${score.value ?? "—"}`).join(" · ") || "No credit record included"}</p></div></article>
            <article><span className="country-chip">{financialEvidence.destination}</span><div><small>DESTINATION FINANCES</small><b>{output.document.coverage.openBankingAvailable ? "Banking and cash flow included" : "No accounts connected"}</b><p>{output.document.coverage.openBankingAvailable ? "Income, outflows and recurring obligations analyzed" : "Connect eligible accounts to add this evidence"}</p></div></article>
          </div>
          <details className="records-detail-section corridor-evidence-section" onToggle={(event) => { const open = event.currentTarget.open; setOpenRecordSections((current) => ({ ...current, coverage: open })); }}>
            <summary><span><b>Cross-border evidence coverage</b><small>See included and unavailable categories by country</small></span><em>View map</em></summary>
            {openRecordSections.coverage && <div className="records-detail-content">
            <div className="section-heading-row"><div><span className="eyebrow">CROSS-BORDER EVIDENCE MAP</span><h3>Information included in your profile</h3><p>This map shows what is available from each country. An unavailable category is not treated as negative information.</p></div><div className="included-evidence-summary"><span>Included evidence</span><b>{countryLabel(financialEvidence.origin)} credit history</b><b>{countryLabel(financialEvidence.destination)} banking and cash flow</b></div></div>
            <div className="corridor-evidence-matrix">
              {[financialEvidence.origin, financialEvidence.destination].map((country) => <section key={country}>
                <header><span>{country === financialEvidence.origin ? "Financial history from" : "Applying in"}</span><b>{countryLabel(country)}</b><small>{country}</small></header>
                {financialEvidence.cells.filter((item) => item.country === country).map((item) => <div className={`evidence-cell ${item.available ? "available" : "unavailable"}`} key={`${item.country}-${item.domain}`}>
                  <span className="evidence-cell-icon" aria-hidden="true">{item.available ? "✓" : "○"}</span><p><b>{domainLabel(item.domain)}</b><small>{evidenceStatusLabel(item.available, item.domain, item.isOrigin)}</small></p><em>{item.available ? "Included" : "Not included"}</em>
                </div>)}
              </section>)}
            </div>
            </div>}
          </details>

          <details className="records-detail-section financial-evidence-section" onToggle={(event) => { const open = event.currentTarget.open; setOpenRecordSections((current) => ({ ...current, credit: open })); }}>
            <summary><span><b>{countryLabel(financialEvidence.origin)} credit records</b><small>Native bureau scores, selected assessment record and bureau differences</small></span><em>View credit details</em></summary>
            {openRecordSections.credit && <div className="records-detail-content">
            <div className="financial-section-title"><span className="country-chip">{financialEvidence.origin}</span><div><span className="eyebrow">SOURCE-COUNTRY RECORD</span><h3>{countryLabel(financialEvidence.origin)} credit history</h3><p>Your existing credit record, preserved in its original scoring model and standardized for review.</p></div></div>
            {output.document.creditReconciliation && output.document.creditReconciliation.bureauCount > 0 ? <>
              <div className="bureau-score-heading"><div><b>Native bureau scores</b><p>Each score remains in its original bureau model. GCP does not average or convert these scores into a U.S. credit score.</p></div><span>{output.document.creditReconciliation.bureauCount} bureau records</span></div>
              <div className="native-score-row">{output.document.creditReconciliation.nativeScores.map((score) => <article key={`${score.provider}-${score.bureau}`}><span>{friendlyBureauLabel(score.bureau)}</span><strong>{score.value ?? "—"}</strong><b>Native score</b><small>{score.minimum != null && score.maximum != null ? `Original range ${score.minimum}–${score.maximum}` : "Original scale retained"}</small></article>)}</div>
              {output.document.riskAssessment?.assessmentEvidence && <div className="assessment-evidence-banner"><div><span className="eyebrow">SELECTED FOR ASSESSMENT</span><b>{friendlyBureauLabel(output.document.riskAssessment.assessmentEvidence.sourceSystem)} structured record</b><p>This was the most complete eligible record under the configured selection policy. Other bureau records remain separate and visible above.</p></div><small>{output.document.riskAssessment.assessmentEvidence.completenessPercent}% complete</small></div>}
              {output.document.creditReconciliation.summaryRanges && Object.entries(output.document.creditReconciliation.summaryRanges).some(([, range]) => range.disagreement) && <details className="bureau-difference-panel"><summary><span><b>Cross-bureau differences identified</b><small>Values can differ because bureaus may receive updates at different times.</small></span><em>Review differences</em></summary><div>{Object.entries(output.document.creditReconciliation.summaryRanges).filter(([, range]) => range.disagreement).map(([metric, range]) => <p key={metric}><b>{reconciliationMetricLabel(metric)}</b><span>{reconciliationRange(metric, range.minimum, range.maximum)}</span><small>Reported by {range.reportingBureaus} bureaus</small></p>)}</div></details>}
            </> : <div className="evidence-placeholder"><b>No source-country credit record is included</b><p>Connect an available credit-data provider to add this category.</p></div>}
            </div>}
          </details>

          <details className="records-detail-section financial-evidence-section" onToggle={(event) => { const open = event.currentTarget.open; setOpenRecordSections((current) => ({ ...current, banking: open })); }}>
            <summary><span><b>{countryLabel(financialEvidence.destination)} financial accounts</b><small>Income, cash flow, account coverage and connected institutions</small></span><em>View banking details</em></summary>
            {openRecordSections.banking && <div className="records-detail-content">
              <div className="financial-section-title"><span className="country-chip">{financialEvidence.destination}</span><div><span className="eyebrow">DESTINATION-COUNTRY RECORD</span><h3>{countryLabel(financialEvidence.destination)} income and cash flow</h3><p>Observed account activity used to describe income, recurring obligations and available cash flow.</p></div></div>
              {output.document.coverage.openBankingAvailable ? <OpenBankingEvidence passportId={output.passportId}/> : <div className="evidence-placeholder"><b>No destination-country financial accounts are connected</b><p>Connect eligible accounts to add income and cash-flow evidence.</p></div>}
            </div>}
          </details>
          <p className="records-footnote">Categories shown as unavailable in the corridor map are not scored as zero. The destination lender applies its own eligibility and underwriting policy.</p>
          <div className="tab-next-action"><button type="button" onClick={() => setDashboardView("score")}>Continue to financial assessment</button></div>
        </div>}
        {dashboardView === "score" && output.document.riskAssessment && <div className="risk-panel">
          <div className="risk-head"><div><h3>{output.document.riskAssessment.riskIndex ?? "—"}<small>/100 profile index</small></h3><p>{output.document.riskAssessment.riskIndex == null ? "Insufficient evidence to calculate" : borrowerProfileBand(output.document.riskAssessment.riskBand)}</p></div><div className="confidence-score"><b>{output.document.riskAssessment.confidence.score}%</b><span>supporting information ready</span>{consistencyScore != null && <small>Cross-bureau consistency: {consistencyScore}%{consistencyScore < 60 ? " · review needed" : ""}</small>}</div></div>
          <div className="assessment-first-view">
            <section className="attention"><span>Needs attention</span>{attentionDimensions.length ? attentionDimensions.map((dimension) => { const explanation = assessmentExplanations.find((item) => item.dimensionKey === dimension.key); return <div key={dimension.key}><p><b>{dimension.label}</b><small>{explanation ? friendlyObservedValue(explanation.standardizedMetric, explanation.observedValue, explanation.unit) : reasonLabel(dimension.reasonCodes[0])}</small></p><strong>{dimension.score}/100</strong></div>; }) : <p>No factors currently require attention.</p>}</section>
            <section className="positive"><span>Supporting indicators</span>{positiveDimensions.slice(0, 4).map((dimension) => { const explanation = assessmentExplanations.find((item) => item.dimensionKey === dimension.key); return <div key={dimension.key}><p><b>{dimension.label}</b><small>{explanation ? friendlyObservedValue(explanation.standardizedMetric, explanation.observedValue, explanation.unit) : reasonLabel(dimension.reasonCodes[0])}</small></p><strong>{dimension.score}/100</strong></div>; })}</section>
          </div>
          <div className="assessment-interpretation"><b>What this assessment indicates</b><p>{attentionDimensions.length > 0 ? `Factors needing attention—${attentionDimensions.map((item) => item.label.toLowerCase()).join(" and ")}—reduced the profile index. Positive indicators—${positiveDimensions.map((item) => item.label.toLowerCase()).join(", ")}—provided offsetting evidence.` : "The available credit and cash-flow factors provide a consistently positive observed profile."}</p></div>
          <p className="risk-disclosure">The GCP financial profile index is not a credit score, approval recommendation or lending decision. Missing factors are excluded rather than scored as zero.</p>
          <details className="explainability-panel organized-explainability" onToggle={(event) => { const open = event.currentTarget.open; setShowAssessmentDetails(open); }}>
            <summary>View all assessment factors and methodology</summary>
            {showAssessmentDetails && <div className="explainability-content">
              {output.document.riskAssessment.assessmentEvidence && <div className="assessment-evidence-banner"><div><span className="eyebrow">CREDIT FACTOR SOURCE</span><b>{friendlyBureauLabel(output.document.riskAssessment.assessmentEvidence.sourceSystem)} structured record</b><p>The credit factors below use this selected bureau record. All native bureau scores remain separate and are not averaged.</p></div><small>{output.document.riskAssessment.assessmentEvidence.completenessPercent}% complete</small></div>}
              <div className="risk-factor-table"><div className="risk-factor-header"><span>Assessment factor</span><span>Observed result</span><span>Score</span><span>Evidence source</span></div>{output.document.riskAssessment.dimensions.map((dimension) => { const explanation = output.document.riskAssessment?.dimensionExplanations?.find((item) => item.dimensionKey === dimension.key); return <div key={dimension.key}><span><b>{dimension.label}</b><small>{!dimension.available ? "Not scored" : dimension.score != null && dimension.score < 70 ? "Needs attention" : "Positive indicator"}</small></span><span>{explanation ? friendlyObservedValue(explanation.standardizedMetric, explanation.observedValue, explanation.unit) : reasonLabel(dimension.reasonCodes[0])}</span><strong>{dimension.score == null ? "—" : `${dimension.score}/100`}</strong><span>{friendlyEvidenceSource(explanation?.sourceProvider, explanation?.sourceCountry, explanation?.evidenceStatus === "SYNTHETIC")}{explanation?.sourceSystem && explanation.sourceDomain === "CREDIT" ? ` · ${friendlyBureauLabel(explanation.sourceSystem)}` : ""}</span></div>; })}</div>
              <section>
                <span className="eyebrow">PROFILE INDEX</span>
                <h4>How the profile index was calculated</h4>
                {output.document.riskAssessment.calculationTrace && output.document.riskAssessment.calculationTrace.availableConfiguredWeight > 0 && output.document.riskAssessment.riskIndex != null ? <>
                  <details className="technical-methodology"><summary>View calculation and weights</summary><div className="technical-methodology-content"><div className="formula-box">
                    <code>({output.document.riskAssessment.dimensions.filter((item) => item.available).map((item) => `${item.score} × ${item.configuredWeight}`).join(" + ")}) ÷ {output.document.riskAssessment.calculationTrace.availableConfiguredWeight} = {output.document.riskAssessment.riskIndex}</code>
                    <small>{output.document.riskAssessment.calculationTrace.availableConfiguredWeight} of {output.document.riskAssessment.calculationTrace.totalConfiguredWeight} configured weight was usable. Missing dimensions were excluded.</small>
                  </div>
                  <div className="audit-dimension-list">{output.document.riskAssessment.dimensions.map((item) => <div key={item.key}><span><b>{item.label}</b><small>{item.available ? `${item.score}/100 · ${item.configuredWeight}% weight` : `${item.configuredWeight}% weight · excluded: ${reasonLabel(item.reasonCodes[0])}`}</small></span><em>{item.available ? "Included" : "Excluded"}</em></div>)}</div>
                  </div></details>
                  {Boolean(output.document.riskAssessment.dimensionExplanations?.length) && <details className="technical-methodology"><summary>View scoring thresholds</summary><div className="threshold-summary-list">{output.document.riskAssessment.dimensionExplanations?.map((item) => <div key={item.dimensionKey}><b>{reasonLabel(item.dimensionKey)}</b><span>{item.scoringRule}</span></div>)}</div></details>}
                  {output.document.riskAssessment.crossBorderContext && <details className="technical-methodology"><summary>View cross-border interpretation</summary><div className="cross-border-context"><p>{output.document.riskAssessment.crossBorderContext.currencyTreatment}</p><p>{output.document.riskAssessment.crossBorderContext.destinationPolicyTreatment}</p></div></details>}
                </> : output.document.riskAssessment.calculationTrace ? <div className="formula-box"><b>No scorable dimensions are currently available.</b><small>Connected evidence did not contain the structured metrics required by the current rules. No risk index was calculated.</small></div> : <p className="audit-muted">This legacy output predates the calculation trace. Regenerate the passport to create a current audit record.</p>}
              </section>
              <details className="technical-methodology evidence-readiness-details">
                <summary>View evidence-quality details</summary>
                <div className="technical-methodology-content"><h4>{output.document.riskAssessment.confidence.score}% evidence readiness</h4>
                <div className="confidence-components">
                  {[ ["Evidence coverage", output.document.riskAssessment.confidence.coverageComponent], ["Completeness", output.document.riskAssessment.confidence.completenessComponent], ["Freshness", output.document.riskAssessment.confidence.freshnessComponent], ["Consistency", output.document.riskAssessment.confidence.consistencyComponent], ["Identity assurance", output.document.riskAssessment.confidence.identityAssuranceComponent], ["Analytical availability", output.document.riskAssessment.confidence.analyticalAvailabilityComponent] ].map(([label, value]) => <div key={String(label)}><span>{label}</span><b>{value}%</b></div>)}
                </div>
                {consistencyScore != null && consistencyScore < 60 && <p className="consistency-warning"><b>Cross-bureau review needed.</b> Material differences were identified across bureau records.</p>}
                <p className="audit-muted">Evidence readiness describes the completeness and usability of the supporting information. It does not raise or lower the profile index.</p>
                {output.document.riskAssessment.dimensionExplanations?.some((item) => item.evidenceStatus === "SYNTHETIC") && <p className="confidence-explanation">Confidence is limited to medium because simulated evidence contributes to this pilot assessment.</p>}
                {output.document.riskAssessment.confidence.identityAssuranceComponent < 50 && <p className="confidence-explanation">Confidence is currently limited to medium because identity verification uses a pilot sandbox result rather than a live verified result.</p>}
                </div>
              </details>
              <p className="borrower-audit-note">Your detailed evidence provenance and audit record are securely retained with this passport and are not displayed here.</p>
            </div>}
          </details>
          <div className="tab-next-action"><button type="button" onClick={() => setDashboardView("sharing")}>{currentApplication ? "Review lender activity" : "Continue to sharing & history"}</button></div>
        </div>}
      </section>}
      {output && dashboardView === "sharing" && <PassportSharing passportId={output.passportId}/>}
      {dashboardView === "sharing" && <details className="history-disclosure"><summary>Passport version history</summary><div className="version-list">{history.filter((item) => item.status !== "CANCELLED").map((item) => <button key={item.passportId} onClick={() => open(item, "view")}><span><b>{item.originCountry} → {item.destCountry}</b><small>{new Date(item.updatedAt).toLocaleString()}</small></span><em>{uiStatus(item.status)}</em></button>)}</div></details>}
    </>}
  </main></div>;
}
