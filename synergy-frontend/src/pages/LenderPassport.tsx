import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createLenderDocumentRequest, getLenderDocumentRequests, getSharedPassport, getSharedPassportReview, lenderDocumentDownloadUrl, subscribeLenderReviewEvents, updateLenderDocumentStatus, updateSharedPassportReview } from "../api/passport";
import type { ReviewDocumentRequest, ReviewOutcome, ReviewStatus, SharedPassport } from "../api/passport";
import { friendlyBureauLabel, friendlyEvidenceSource, friendlyObservedValue } from "../lib/evidenceLabels";

function words(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function reviewStatusLabel(status: ReviewStatus) {
  if (status === "NOT_OPENED" || status === "VIEWED") return "Not started";
  if (status === "UNDER_REVIEW") return "In review";
  if (status === "INFORMATION_REQUESTED") return "Waiting for borrower";
  if (status === "COMPLETED") return "Review completed";
  return words(status);
}

export default function LenderPassport() {
  const { token } = useParams();
  const [share, setShare] = useState<SharedPassport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("NOT_OPENED");
  const [outcome, setOutcome] = useState<ReviewOutcome | "">("");
  const [borrowerMessage, setBorrowerMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [documentRequests, setDocumentRequests] = useState<ReviewDocumentRequest[]>([]);
  const [documentType, setDocumentType] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentDueDate, setDocumentDueDate] = useState("");
  const [documentRequired, setDocumentRequired] = useState(true);
  const requestedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    if (requestedToken.current === token) return;
    requestedToken.current = token;
    Promise.all([getSharedPassport(token), getLenderDocumentRequests(token)]).then(([result, requests]) => {
      setShare(result);
      setDocumentRequests(requests);
      setReviewStatus(result.review.status);
      setOutcome(result.review.outcome || "");
      setBorrowerMessage(result.review.borrowerMessage || "");
      setInternalNote(result.review.internalNote || "");
    }).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "This shared passport is unavailable."));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    return subscribeLenderReviewEvents(token, (eventType) => {
      if (eventType === "SHARE_REVOKED") {
        setShare(null);
        setError("This passport share has been revoked by the borrower.");
        return;
      }
      void getSharedPassportReview(token).then((review) => {
        setShare((current) => current ? { ...current, review } : current);
        setReviewStatus(review.status);
        setOutcome(review.outcome || "");
        setBorrowerMessage(review.borrowerMessage || "");
        setInternalNote(review.internalNote || "");
        void getLenderDocumentRequests(token).then(setDocumentRequests);
      }).catch(() => setReviewError("Unable to load the latest review update."));
    });
  }, [token]);

  async function createDocumentRequest() {
    if (!token || !documentType.trim()) return;
    setSavingReview(true); setReviewError(null); setReviewMessage(null);
    try {
      await createLenderDocumentRequest(token, {
        documentType,
        description: documentDescription || null,
        required: documentRequired,
        dueDate: documentDueDate || null,
      });
      setDocumentRequests(await getLenderDocumentRequests(token));
      setDocumentType(""); setDocumentDescription(""); setDocumentDueDate("");
      setReviewMessage("Document request sent to the borrower.");
    } catch (caught) {
      setReviewError(caught instanceof Error ? caught.message : "Unable to request the document.");
    } finally { setSavingReview(false); }
  }

  async function updateDocument(requestId: string, status: "ACCEPTED" | "REPLACEMENT_REQUESTED") {
    if (!token) return;
    setSavingReview(true); setReviewError(null);
    try {
      await updateLenderDocumentStatus(token, requestId, status);
      setDocumentRequests(await getLenderDocumentRequests(token));
    } catch (caught) {
      setReviewError(caught instanceof Error ? caught.message : "Unable to update the document.");
    } finally { setSavingReview(false); }
  }

  async function updateReview(status: "UNDER_REVIEW" | "INFORMATION_REQUESTED" | "COMPLETED") {
    if (!token) return;
    setSavingReview(true);
    setReviewError(null);
    setReviewMessage(null);
    try {
      const result = await updateSharedPassportReview(token, {
        status,
        outcome: status === "COMPLETED" ? outcome || null : null,
        borrowerMessage: borrowerMessage || null,
        internalNote: internalNote || null,
      });
      setReviewStatus(result.status);
      setOutcome(result.outcome || "");
      setReviewMessage(status === "INFORMATION_REQUESTED"
        ? "The information request is now visible to the borrower."
        : status === "COMPLETED"
          ? "Review completed and the shared outcome is visible to the borrower."
          : "Review status updated.");
    } catch (caught) {
      setReviewError(caught instanceof Error ? caught.message : "Unable to update the review.");
    } finally {
      setSavingReview(false);
    }
  }

  if (!token || error) return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state"><span className="eyebrow">SHARED PASSPORT</span><h1>This report is no longer available</h1><p>{error || "This secure link is invalid."}</p><small>Please ask the borrower to provide new authorization.</small></section></main></div>;
  if (!share) return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state">Opening secure passport…</section></main></div>;

  const report = share.report;
  const risk = report.riskAssessment;
  const trace = risk.calculationTrace;
  const simulatedCredit = trace?.evidence.some((item) =>
    item.provider === "GCP_SIMULATOR" || item.sourceSystem === "CIBIL_SIMULATED");
  const evidenceEnvironment = report.evidenceEnvironment;
  const testEvidence = evidenceEnvironment
    ? evidenceEnvironment.creditSimulated || Boolean(evidenceEnvironment.creditProviderTest) || evidenceEnvironment.openBankingSandbox || evidenceEnvironment.identitySandbox
    : Boolean(simulatedCredit || report.identityVerification.sandboxSimulation);
  const testEvidenceDescriptions = [
    (evidenceEnvironment?.creditSimulated ?? simulatedCredit) ? `${report.corridor.originCountry} credit history is simulated` : null,
    evidenceEnvironment?.creditProviderTest ? `${report.corridor.originCountry} credit history uses provider test data` : null,
    evidenceEnvironment?.openBankingSandbox ? `${report.corridor.destinationCountry} open-banking information uses sandbox data` : null,
    (evidenceEnvironment?.identitySandbox ?? report.identityVerification.sandboxSimulation) ? "Identity verification uses a sandbox result" : null,
  ].filter(Boolean);
  const availableDimensions = risk.dimensions.filter((item) => item.available && item.score != null);
  const reviewDimensions = availableDimensions.filter((item) => (item.score ?? 0) < 70);
  const supportingDimensions = availableDimensions.filter((item) => (item.score ?? 0) >= 70);
  const observedResult = (dimensionKey: string) => {
    const explanation = risk.dimensionExplanations?.find((item) => item.dimensionKey === dimensionKey);
    return explanation
      ? friendlyObservedValue(explanation.standardizedMetric, explanation.observedValue, explanation.unit)
      : words(risk.dimensions.find((item) => item.key === dimensionKey)?.reasonCodes[0] || "insufficient data");
  };
  const profileLabel = risk.riskIndex == null
    ? "Not calculated"
    : risk.riskIndex >= 85 ? "Strong observed profile" : risk.riskIndex >= 70 ? "Mixed observed profile" : "Review indicated";
  const consistencyNeedsReview = risk.confidence.consistencyComponent < 70;
  const assessmentCategory = (score: number | null) => score == null ? "Not scored" : score < 70 ? "Needs review" : "Supporting indicator";
  return <div className="page-bg workspace-bg"><main className="lender-report">
    <header className="lender-report-header"><div><span className="brand-mark">GCP</span><b>Global Credit Passport</b></div><div className="lender-report-tools"><button className="text-button print-report-button" type="button" onClick={() => window.print()}>Print / Save PDF</button><span className="status-pill light">READ ONLY</span></div></header>
    <section className="simple-card">
      <span className="eyebrow">AUTHORIZED LENDER REPORT</span>
      <div className="lender-subject"><div><h1>{report.subject.fullName}</h1><p>{report.corridor.originCountry} → {report.corridor.destinationCountry} · {words(report.corridor.purpose)}</p></div><div><small>Shared with</small><b>{share.recipientName}</b><small>Expires {new Date(share.expiresAt).toLocaleString()}</small></div></div>
      <p className="lender-consent-note">Shared by the borrower for {share.purpose}. Published {new Date(share.publishedAt).toLocaleString()}.</p>
    </section>
    {testEvidence ? <div className="simulation-warning"><b>PILOT TEST REPORT</b><span>{testEvidenceDescriptions.join(". ")}. This report is for development testing only and must not be used for a lending decision.</span></div> : <div className="simulation-warning"><b>PILOT ASSESSMENT</b><span>This report uses provider-supplied evidence processed through GCP’s pilot assessment framework. It is not a credit score, approval recommendation or lending decision.</span></div>}
    <section className="simple-card lender-decision-summary">
      <div className="lender-summary-heading"><div><span className="eyebrow">APPLICATION SUMMARY</span><h2>Decision-support summary</h2><p>Start with the items requiring review, then use the supporting evidence and your institution’s policy to determine the next step.</p></div><span className={`status-pill ${reviewStatus === "COMPLETED" ? "success" : "light"}`}>{reviewStatusLabel(reviewStatus)}</span></div>
      <div className="lender-summary-metrics">
        <div><small>GCP profile index</small><b>{risk.riskIndex ?? "—"}<em>/100</em></b><span>{profileLabel}</span></div>
        <div><small>Usable supporting information</small><b>{risk.confidence.score}<em>%</em></b><span>Available for assessment</span></div>
        <div className={consistencyNeedsReview ? "needs-review" : ""}><small>Bureau agreement</small><b>{risk.confidence.consistencyComponent}<em>%</em></b><span>{consistencyNeedsReview ? "Material differences require review" : "Records are consistent"}</span></div>
      </div>
      <div className="lender-indicator-grid">
        <section className="review-priorities"><span className="eyebrow">ITEMS TO REVIEW</span>{reviewDimensions.length ? reviewDimensions.map((dimension) => <div key={dimension.key}><span><b>{dimension.label}</b><small>{observedResult(dimension.key)}</small></span><strong>{dimension.score}/100</strong></div>) : <p>No assessment factors are currently below the standard review range.</p>}</section>
        <section className="supporting-indicators"><span className="eyebrow">SUPPORTING INDICATORS</span>{supportingDimensions.slice(0, 4).map((dimension) => <div key={dimension.key}><span><b>{dimension.label}</b><small>{observedResult(dimension.key)}</small></span><strong>{dimension.score}/100</strong></div>)}</section>
      </div>
      <p className="lender-decision-note">This profile index summarizes observed evidence. It is not a credit score, approval recommendation or substitute for the lender’s underwriting policy.</p>
    </section>
    <section className="simple-card lender-risk-card lender-collapsible-section">
      <details className="lender-section-details">
      <summary><span><b>Detailed assessment and bureau evidence</b><small>Review all factors, native bureau scores, cross-border interpretation and calculation methodology.</small></span><em>View details</em></summary>
      <div className="lender-section-details-content">
      <div className="risk-head"><div><span className="eyebrow">ASSESSMENT FACTORS</span><h3>{risk.riskIndex ?? "—"}<small>/100 GCP profile index</small></h3><p>{profileLabel}</p></div><div className="confidence-score"><b>{risk.confidence.score}%</b><span>supporting information readiness</span></div></div>
      {risk.assessmentEvidence && <div className="assessment-evidence-banner lender"><div><span className="eyebrow">CREDIT ASSESSMENT EVIDENCE</span><b>{friendlyBureauLabel(risk.assessmentEvidence.sourceSystem)} structured record</b><p>Credit factors use one selected structured bureau record. Native scores are preserved separately and are not averaged.</p></div><small>{risk.assessmentEvidence.completenessPercent}% complete</small></div>}
      <div className="risk-factor-table"><div className="risk-factor-header"><span>Assessment factor</span><span>Observed result</span><span>Score</span><span>Evidence source</span></div>{risk.dimensions.map((dimension) => { const explanation = risk.dimensionExplanations?.find((item) => item.dimensionKey === dimension.key); return <div key={dimension.key}><span><b>{dimension.label}</b><small>{dimension.available ? `${assessmentCategory(dimension.score)} · ${dimension.configuredWeight}% weight` : "Not scored"}</small></span><span>{explanation ? friendlyObservedValue(explanation.standardizedMetric, explanation.observedValue, explanation.unit) : words(dimension.reasonCodes[0] || "insufficient data")}</span><strong>{dimension.score == null ? "—" : `${dimension.score}/100`}</strong><span>{friendlyEvidenceSource(explanation?.sourceProvider, explanation?.sourceCountry, explanation?.evidenceStatus === "SYNTHETIC")}{explanation?.sourceSystem && explanation.sourceDomain === "CREDIT" ? ` · ${words(explanation.sourceSystem)}` : ""}</span></div>; })}</div>
      {Boolean(risk.dimensionExplanations?.length) && <details className="standardization-trace"><summary>View calculation methodology</summary><div className="standardization-list">{risk.dimensionExplanations?.map((item) => <article key={item.dimensionKey}><header><b>{words(item.dimensionKey)}</b><em>{item.score == null ? "Excluded" : `${item.score}/100`}</em></header><dl><div><dt>Observed result</dt><dd>{friendlyObservedValue(item.standardizedMetric, item.observedValue, item.unit)}</dd></div><div><dt>Evidence source</dt><dd>{friendlyEvidenceSource(item.sourceProvider, item.sourceCountry, item.evidenceStatus === "SYNTHETIC")}</dd></div><div><dt>Scoring rule</dt><dd>{item.scoringRule}</dd></div><div><dt>Weighted contribution</dt><dd>{item.weightedContribution == null ? "Excluded" : `${item.weightedContribution} points before available-weight normalization`}</dd></div></dl></article>)}</div></details>}
      {risk.crossBorderContext && <section className="cross-border-context"><span className="eyebrow">CROSS-BORDER INTERPRETATION</span><p><b>Evidence countries:</b> {risk.crossBorderContext.evidenceCountries.join(", ") || "Not recorded"}</p><p>{risk.crossBorderContext.currencyTreatment}</p><p>{risk.crossBorderContext.destinationPolicyTreatment}</p><ul>{risk.crossBorderContext.comparabilityNotes.map((note) => <li key={note}>{note}</li>)}</ul></section>}
      {risk.nativeScoreReferences && risk.nativeScoreReferences.length > 0 && <div className="native-score-reference"><span className="eyebrow">NATIVE BUREAU SCORES</span><div>{risk.nativeScoreReferences.map((score) => <span key={`${score.provider}-${score.bureau}-${score.countryCode}`}><b>{score.nativeValue ?? "—"}</b><small>{score.bureau} · {score.countryCode}</small><em>Original bureau scale retained</em></span>)}</div><p>Scores are preserved in their original bureau models. GCP does not label, average or convert them into a destination-country score.</p></div>}
      {trace && (trace.availableConfiguredWeight > 0 && risk.riskIndex != null ? <div className="formula-box"><code>({risk.dimensions.filter((item) => item.available).map((item) => `${item.score} × ${item.configuredWeight}`).join(" + ")}) ÷ {trace.availableConfiguredWeight} = {risk.riskIndex}</code><small>{trace.availableConfiguredWeight} of {trace.totalConfiguredWeight} configured weight was available. Missing dimensions were excluded, not treated as zero.</small></div> : <div className="formula-box"><b>No scorable dimensions are currently available.</b><small>Connected evidence did not contain the structured metrics required by the current rules. No risk index was calculated.</small></div>)}
      <p className="risk-disclosure">Supporting-information readiness measures completeness and usability of the evidence. It does not increase or decrease the profile index.</p>
      </div>
      </details>
    </section>
    <section className="simple-card lender-review-card">
      <span className="eyebrow">REVIEW ACTIONS</span>
      <div className="review-status-line"><div><h2>Choose the next review step</h2><p>Start the review, request borrower information, or record a non-binding outcome.</p></div><span className={`status-pill ${reviewStatus === "COMPLETED" ? "success" : "light"}`}>{reviewStatusLabel(reviewStatus)}</span></div>
      {share.review.borrowerResponse && <div className="borrower-response-received"><b>Borrower response</b><p>{share.review.borrowerResponse}</p>{share.review.borrowerRespondedAt && <small>Received {new Date(share.review.borrowerRespondedAt).toLocaleString()}</small>}</div>}
      {reviewStatus === "COMPLETED" ? <div className="review-complete-summary"><b>{outcome ? words(outcome) : "Review completed"}</b>{borrowerMessage && <p>Shared with borrower: {borrowerMessage}</p>}<small>This is a lender-recorded pilot outcome, not a GCP lending decision.</small></div> : <div className="lender-review-workflow">
        {(reviewStatus === "VIEWED" || reviewStatus === "INFORMATION_REQUESTED") && <div className="lender-next-action"><span><b>{reviewStatus === "INFORMATION_REQUESTED" ? "Borrower information requested" : "Begin application review"}</b><small>{reviewStatus === "INFORMATION_REQUESTED" ? "Resume when you are ready to continue evaluating the profile." : "Mark this application as under review."}</small></span><button className="btn primary-action" disabled={savingReview} onClick={() => void updateReview("UNDER_REVIEW")}>{reviewStatus === "INFORMATION_REQUESTED" ? "Resume review" : "Start review"}</button></div>}
        <details className="lender-action-details compact-review-action">
          <summary><span><b>Request information from borrower</b><small>Send a borrower-visible message and optionally request a document below.</small></span><em>Open</em></summary>
          <div className="lender-action-details-content"><label className="review-field">Message to borrower<textarea value={borrowerMessage} onChange={(event) => setBorrowerMessage(event.target.value)} maxLength={2000} placeholder="Example: Please provide your two most recent payslips."/><small>This message becomes visible to the borrower.</small></label><button className="btn" disabled={savingReview || !borrowerMessage.trim()} onClick={() => void updateReview("INFORMATION_REQUESTED")}>Send information request</button></div>
        </details>
        <details className="lender-action-details compact-review-action">
          <summary><span><b>Record review outcome</b><small>Record a non-binding next step after completing your review.</small></span><em>Open</em></summary>
          <div className="lender-action-details-content"><label className="review-field">Message to borrower<textarea value={borrowerMessage} onChange={(event) => setBorrowerMessage(event.target.value)} maxLength={2000} placeholder="Optional borrower-visible context for this outcome."/></label><label className="review-field">Review outcome<select aria-label="Review outcome" value={outcome} onChange={(event) => setOutcome(event.target.value as ReviewOutcome | "")}><option value="">Select an outcome</option><option value="PROCEED">Proceed to underwriting</option><option value="FURTHER_REVIEW">Further review</option><option value="DECLINE">Decline</option></select></label><button className="btn primary-action" disabled={savingReview || !outcome} onClick={() => void updateReview("COMPLETED")}>Complete review</button><small>This is not a credit approval or commitment to lend.</small></div>
        </details>
        <details className="private-note-details"><summary>Private lender note</summary><label className="review-field"><textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} maxLength={4000} placeholder="Visible only through this lender link."/></label></details>
      </div>}
      {reviewMessage && <div className="share-message">✓ {reviewMessage}</div>}
      {reviewError && <div className="alert-error">{reviewError}</div>}
      <details className="lender-action-details">
      <summary><span><b>Request supporting documents</b><small>{documentRequests.length ? `${documentRequests.length} existing ${documentRequests.length === 1 ? "request" : "requests"}` : "No document requests"}</small></span><em>Open</em></summary>
      <div className="lender-action-details-content">
      <p>Request only the information needed to complete review. Files remain private to this active secure link.</p>
      <div className="document-request-form">
        <label>Document type<input value={documentType} onChange={(event) => setDocumentType(event.target.value)} maxLength={100} placeholder="Example: Recent payslip"/></label>
        <label>Description<textarea value={documentDescription} onChange={(event) => setDocumentDescription(event.target.value)} maxLength={1000} placeholder="Explain what is required."/></label>
        <label>Due date<input type="date" value={documentDueDate} onChange={(event) => setDocumentDueDate(event.target.value)}/></label>
        <label className="document-required"><input type="checkbox" checked={documentRequired} onChange={(event) => setDocumentRequired(event.target.checked)}/> Required</label>
        <button className="btn" disabled={savingReview || !documentType.trim()} onClick={() => void createDocumentRequest()}>Request document</button>
      </div>
      <div className="document-request-list">{documentRequests.map((request) => <div className="document-request" key={request.requestId}>
        <span><b>{request.documentType}</b><small>{request.required ? "Required" : "Optional"}{request.dueDate ? ` · due ${new Date(`${request.dueDate}T00:00:00`).toLocaleDateString()}` : ""}</small>{request.description && <small>{request.description}</small>}{request.filename && <small>{request.filename} · {Math.ceil((request.sizeBytes || 0) / 1024)} KB</small>}</span>
        <em>{words(request.status)}</em>
        {request.dueDate && request.dueDate > new Date(share.expiresAt).toISOString().slice(0, 10) && <small className="document-expiry-warning">Due date exceeds this access period. Ask the borrower to renew access before the document is due.</small>}
        {request.filename && token && <a className="btn compact-action" href={lenderDocumentDownloadUrl(token, request.requestId)}>Download</a>}
        {request.status === "UPLOADED" && <span className="document-review-actions"><button className="btn compact-action" disabled={savingReview} onClick={() => void updateDocument(request.requestId, "ACCEPTED")}>Accept</button><button className="text-button" disabled={savingReview} onClick={() => void updateDocument(request.requestId, "REPLACEMENT_REQUESTED")}>Request replacement</button></span>}
      </div>)}</div>
      </div>
      </details>
    </section>
    <section className="simple-card lender-audit-card lender-collapsible-section">
      <details className="lender-section-details">
      <summary><span><b>Evidence and audit record</b><small>Source records, retrieval times, rules version and calculation fingerprint.</small></span><em>View audit</em></summary>
      <div className="lender-section-details-content">
      {trace && <div className="evidence-audit-list">{trace.evidence.map((item) => <div key={`${item.domain}-${item.evidenceId}`}><b>{item.domain === "CREDIT" && item.sourceSystem ? `${friendlyBureauLabel(item.sourceSystem)} credit record` : friendlyEvidenceSource(item.provider, item.countryCode, item.provider === "GCP_SIMULATOR" || item.sourceSystem === "CIBIL_SIMULATED")}</b><span>{words(item.domain)}</span><small>{item.completenessPercent}% complete</small><small>Retrieved {new Date(item.retrievedAt).toLocaleString()}</small></div>)}</div>}
      <details className="technical-methodology"><summary>Technical provenance</summary><div className="audit-metadata"><div><span>Assessment schema</span><b>{risk.schemaVersion}</b></div><div><span>Rules version</span><b>{risk.modelVersion}</b></div><div><span>Calculated</span><b>{new Date(risk.calculatedAt).toLocaleString()}</b></div>{trace?.evidence.map((item) => <div key={`technical-${item.domain}-${item.evidenceId}`}><span>{words(item.domain)} processing adapter</span><b>{item.provider} · {item.adapterId} {item.adapterVersion}</b></div>)}{trace && <div className="fingerprint"><span>Input fingerprint</span><code>{trace.inputFingerprintSha256}</code></div>}</div></details>
      <p className="risk-disclosure">This report provides pilot risk intelligence and evidence provenance. It is not a lender approval decision. The secure link is time limited and can be revoked by the borrower.</p>
      </div>
      </details>
    </section>
  </main></div>;
}
