import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLatestPassport, getPassportHistory, getPassportOutput, getPassportShares, subscribeBorrowerReviewEvents } from "../api/passport";
import type { PassportOutput, PassportShareSummary, PassportView, ReviewStatus } from "../api/passport";
import { getAccessToken, logout } from "../auth/auth";
import PassportSharing from "../components/PassportSharing";
import OpenBankingEvidence from "../components/OpenBankingEvidence";
import CrossBorderFinancialProfile from "../components/CrossBorderFinancialProfile";
import AssessmentEvidenceNotice from "../components/AssessmentEvidenceNotice";
import { countryCode } from "../lib/countryRecords";
import type { CountryCreditRecord } from "../lib/countryRecords";
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
    return `${minimum.toLocaleString()}–${maximum.toLocaleString()} (native units)`;
  }
  return `${minimum}–${maximum}`;
}

function evidenceNativeScore(evidence: NonNullable<PassportOutput["document"]["normalizedEvidence"]>[number]) {
  const score = evidence.dataset?.nativeScore;
  if (!score || typeof score !== "object") return null;
  const value = "value" in score && typeof score.value === "number" ? score.value : null;
  const minimum = "minimum" in score && typeof score.minimum === "number" ? score.minimum : null;
  const maximum = "maximum" in score && typeof score.maximum === "number" ? score.maximum : null;
  return { value, minimum, maximum };
}

export default function Dashboard() {
  const nav = useNavigate();
  const [dashboardView, setDashboardView] = useState<"overview" | "financial" | "score" | "sharing">("overview");
  const [openRecordSections, setOpenRecordSections] = useState<Record<string, boolean>>({});
  useEffect(() => { setOpenRecordSections({}); }, [dashboardView]);
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
  const positiveDimensions = assessmentDimensions.filter((item) => item.available && item.score != null && item.score >= 70).slice(0, 4);
  const attentionDimensions = assessmentDimensions.filter((item) => item.available && item.score != null && item.score < 70).slice(0, 3);
  const consistencyScore = output?.document.riskAssessment?.confidence.consistencyComponent;
  const financialEvidence = useMemo(() => {
    if (!output || !active) return null;
    const origin = active.originCountry.toUpperCase();
    const destination = active.destCountry.toUpperCase();
    return { origin, destination };
  }, [active, output]);
  const countryCredit = useMemo<CountryCreditRecord[]>(() => {
    if (!output || !financialEvidence) return [];
    const rows: CountryCreditRecord[] = (output.document.normalizedEvidence || []).filter(item => item.domain === "CREDIT").map(item => {
      const score = evidenceNativeScore(item);
      return {countryCode: item.countryCode, provider: item.provider, bureau: item.sourceSystem, value: score?.value, minimum: score?.minimum, maximum: score?.maximum, completeness: item.completenessPercent};
    });
    if (!rows.some(row => countryCode(row.countryCode) === countryCode(financialEvidence.origin))) {
      for (const score of output.document.creditReconciliation?.nativeScores || []) rows.push({countryCode: financialEvidence.origin, provider: score.provider, bureau: score.bureau, value: score.value, minimum: score.minimum, maximum: score.maximum});
    }
    return rows;
  }, [output, financialEvidence]);

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
    overview: { eyebrow: "HOME", title: "Overview", description: "Your application and next steps." },
    financial: { eyebrow: "RECORDS", title: "Financial records", description: "Credit and banking history by country." },
    score: { eyebrow: "ASSESSMENT", title: "Assessment", description: "What contributes to your profile index." },
    sharing: { eyebrow: "SHARING & HISTORY", title: "Lender access", description: "Share your profile, complete lender requests and review previous access." },
  }[dashboardView];

  const evidenceEnvironment = output?.document.evidenceEnvironment;
  const testEvidence = evidenceEnvironment
    ? evidenceEnvironment.creditSimulated || Boolean(evidenceEnvironment.creditProviderTest) || Boolean(evidenceEnvironment.usCreditProviderTest) || evidenceEnvironment.openBankingSandbox || evidenceEnvironment.identitySandbox
    : Boolean(output?.document.coverage.creditBureauSimulated || output?.document.identityVerification.sandboxSimulation);
  const testEvidenceDescriptions = output ? [
    (evidenceEnvironment?.creditSimulated ?? output.document.coverage.creditBureauSimulated)
      ? `${countryLabel(active?.originCountry)} credit history is simulated` : null,
    evidenceEnvironment?.creditProviderTest
      ? `${countryLabel(active?.originCountry)} credit history uses provider test data` : null,
    evidenceEnvironment?.usCreditProviderTest
      ? `${countryLabel(active?.destCountry)} credit history uses synthetic bureau test data` : null,
    evidenceEnvironment?.openBankingSandbox
      ? `${countryLabel(active?.destCountry)} open-banking information uses sandbox data` : null,
    (evidenceEnvironment?.identitySandbox ?? output.document.identityVerification.sandboxSimulation)
      ? "Identity verification uses a sandbox result" : null,
  ].filter(Boolean) : [];

  return <div className="page-bg workspace-bg"><main className="simple-dashboard gcp-compact">
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
        {dashboardView !== "sharing" && <div className="simulation-warning gcp-mode"><b>{testEvidence ? "Test report — not for lending" : "Pilot assessment — not a lending decision"}</b><details><summary>Evidence status</summary><p>{testEvidence ? testEvidenceDescriptions.join(". ") : "Production assurance has not been established by this pilot report."}</p></details><p className="gcp-print-evidence">{testEvidence ? testEvidenceDescriptions.join(". ") : "Production assurance not established."}</p></div>}
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
          <article><span>Key indicators</span><div className="command-signal-columns"><div><small>Needs review</small>{attentionDimensions.slice(0, 2).map((dimension) => <b key={dimension.key}>{dimension.label}</b>)}</div><div><small>Supporting</small>{positiveDimensions.slice(0, 2).map((dimension) => <b key={dimension.key}>{dimension.label}</b>)}</div></div></article>
          <article><span>Information readiness</span><strong>{output.document.riskAssessment.confidence.score}%</strong><b>Analytical readiness</b><small>{consistencyScore != null && consistencyScore < 60 ? `Bureau agreement ${consistencyScore}% · review differences` : "Records are substantially complete"}</small></article>
        </div>}
        {financialEvidence && <section className="command-evidence"><header><span className="eyebrow">FINANCIAL FOOTPRINT</span><button type="button" onClick={() => setDashboardView("financial")}>Review records</button></header><div>
          {[...new Set([financialEvidence.origin, financialEvidence.destination, ...countryCredit.map(row => row.countryCode), ...(output.document.financialEvidenceSummary || []).map(row => row.countryCode)].map(countryCode).filter(Boolean))].map(code => <article key={code}><span className="country-chip">{code}</span><p><b>{countryLabel(code)}</b><small>{countryCredit.filter(row => countryCode(row.countryCode) === code).length} credit records · {(output.document.financialEvidenceSummary || []).some(row => countryCode(row.countryCode) === code) ? "Banking evidence included" : "No published banking evidence"}</small></p></article>)}
        </div></section>}
        </>}
        {dashboardView === "financial" && financialEvidence && <div className="financial-records-view">
          <CrossBorderFinancialProfile evidence={output.document.financialEvidenceSummary} origin={financialEvidence.origin} destination={financialEvidence.destination} credit={countryCredit} details={code => <>
            {output.document.riskAssessment?.assessmentEvidence?.countryCode.toUpperCase() === code && <p className="gcp-primary-record">Primary assessment record: {friendlyBureauLabel(output.document.riskAssessment.assessmentEvidence.sourceSystem)} · {output.document.riskAssessment.assessmentEvidence.completenessPercent}% complete. Individual factors may use eligible fallback evidence.</p>}
            {code === countryCode(financialEvidence.origin) && output.document.creditReconciliation && <>
              {consistencyScore != null && <p className="gcp-primary-record">Bureau consistency: {consistencyScore}%{consistencyScore < 60 ? " · Review differences" : ""}</p>}
              {output.document.creditReconciliation.summaryRanges && Object.entries(output.document.creditReconciliation.summaryRanges).some(([, range]) => range.disagreement) && <details className="bureau-difference-panel"><summary><span><b>Cross-bureau differences identified</b><small>Values can differ because bureaus may receive updates at different times.</small></span><em>Review differences</em></summary><div>{Object.entries(output.document.creditReconciliation.summaryRanges).filter(([, range]) => range.disagreement).map(([metric, range]) => <p key={metric}><b>{reconciliationMetricLabel(metric)}</b><span>{reconciliationRange(metric, range.minimum, range.maximum)}</span><small>Reported by {range.reportingBureaus} bureaus</small></p>)}</div></details>}
            </>}
            {code === countryCode(financialEvidence.destination) && <>
              {output.document.coverage.openBankingAvailable && !output.document.financialEvidenceSummary?.some(item => item.countryCode === financialEvidence.destination && item.currencyCode) && <div className="gcp-snapshot-note"><b>Published cash flow needs currency validation.</b><span>Live account details can be newer than this report. Update and publish using existing accounts to recalculate.</span><button type="button" className="text-button" onClick={() => active && open(active, "view")}>Open passport</button><details><summary>Snapshot diagnostics</summary><div>Published: {new Date(output.createdAt).toLocaleString()}</div><div>Snapshot method: {output.document.verifiedSources.openBanking?.methodologyVersion || "Not recorded"}</div><div>Snapshot currency: {typeof output.document.verifiedSources.openBanking?.summary.currencyCode === "string" ? String(output.document.verifiedSources.openBanking?.summary.currencyCode) : "Unconfirmed"}</div><div>Snapshot captured: {output.document.verifiedSources.openBanking?.capturedAt ? new Date(output.document.verifiedSources.openBanking.capturedAt).toLocaleString() : "Not recorded"}</div></details></div>}
              {output.document.coverage.openBankingAvailable && <details className="gcp-country-disclosure" onToggle={event => { const open = event.currentTarget.open; setOpenRecordSections(current => ({...current, banking: open})); }}><summary>Live connected accounts</summary><p>Current account information may differ from the published report.</p>{openRecordSections.banking && <OpenBankingEvidence passportId={output.passportId}/>}</details>}
            </>}
          </>}/>
          <p className="records-footnote">The lender applies its own underwriting policy.</p>
          <div className="tab-next-action"><button type="button" onClick={() => setDashboardView("score")}>Continue to financial assessment</button></div>
        </div>}
        {dashboardView === "score" && output.document.riskAssessment && <div className="risk-panel">
          <div className="risk-head"><div><h3>{output.document.riskAssessment.riskIndex ?? "—"}<small>/100 profile index</small></h3><p>{output.document.riskAssessment.riskIndex == null ? "Insufficient evidence to calculate" : borrowerProfileBand(output.document.riskAssessment.riskBand)}</p></div><div className="confidence-score"><b>{output.document.riskAssessment.confidence.score}%</b><span>analytical readiness</span>{consistencyScore != null && <small>Bureau consistency: {consistencyScore}%{consistencyScore < 60 ? " · review needed" : ""}</small>}</div></div>
          <div className="risk-factor-table gcp-primary-factors"><div className="risk-factor-header"><span>What we review</span><span>What your records show</span><span>Indicator</span><span>Source</span></div>{output.document.riskAssessment.dimensions.map((dimension) => { const explanation = output.document.riskAssessment?.dimensionExplanations?.find((item) => item.dimensionKey === dimension.key); return <div key={dimension.key}><span><b>{dimension.key === "DEBT_BURDEN" ? "Observed debt repayments" : dimension.label}</b><small>{!dimension.available ? "Not scored" : dimension.score != null && dimension.score < 70 ? "Needs attention" : "Positive indicator"}</small></span><span>{explanation ? friendlyObservedValue(explanation.standardizedMetric, explanation.observedValue, explanation.unit) : reasonLabel(dimension.reasonCodes[0])}</span><strong>{dimension.score == null ? "—" : `${dimension.score}/100`}</strong><span>{friendlyEvidenceSource(explanation?.sourceProvider, explanation?.sourceCountry, explanation?.evidenceStatus === "SYNTHETIC")}{explanation?.sourceSystem && explanation.sourceDomain === "CREDIT" ? ` · ${friendlyBureauLabel(explanation.sourceSystem)}` : ""}</span></div>; })}</div>
          <p className="risk-disclosure">Profile index is not a credit score or lending decision. Missing factors are excluded.</p>
          <AssessmentEvidenceNotice evidence={output.document.financialEvidenceSummary} publishedAt={output.createdAt} testEvidence={testEvidence}/>
          <details className="technical-methodology"><summary>How to understand your profile</summary><div className="technical-methodology-content"><p>Your profile index summarizes the financial information available for this application. It is not a credit score or a loan decision.</p><p>Reported late payments and high use of available credit may need attention. Review your country records and correct inaccurate information with the relevant provider.</p><p>Only available, eligible factors contribute. Missing information is not scored as zero. Credit scores stay in their original scales.</p><p>Information readiness describes how much usable information we have, not whether it has been independently verified.</p></div></details>
          <div className="tab-next-action"><button type="button" onClick={() => setDashboardView("sharing")}>{currentApplication ? "Review lender activity" : "Continue to sharing & history"}</button></div>
        </div>}
      </section>}
      {output && dashboardView === "sharing" && <PassportSharing passportId={output.passportId}/>}
      {dashboardView === "sharing" && <details className="history-disclosure"><summary>Passport version history</summary><div className="version-list">{history.filter((item) => item.status !== "CANCELLED").map((item) => <button key={item.passportId} onClick={() => open(item, "view")}><span><b>{item.originCountry} → {item.destCountry}</b><small>{new Date(item.updatedAt).toLocaleString()}</small></span><em>{uiStatus(item.status)}</em></button>)}</div></details>}
    </>}
  </main></div>;
}
