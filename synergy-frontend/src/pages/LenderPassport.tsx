import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getSharedPassport } from "../api/passport";
import type { SharedPassport } from "../api/passport";

function words(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export default function LenderPassport() {
  const { token } = useParams();
  const [share, setShare] = useState<SharedPassport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token) { setError("This lender link is invalid."); return; }
    if (requestedToken.current === token) return;
    requestedToken.current = token;
    getSharedPassport(token).then(setShare).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "This shared passport is unavailable."));
  }, [token]);

  if (error) return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state"><span className="eyebrow">SHARED PASSPORT</span><h1>Report unavailable</h1><p>{error}</p><small>Ask the borrower to create a new secure link.</small></section></main></div>;
  if (!share) return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state">Opening secure passport…</section></main></div>;

  const report = share.report;
  const risk = report.riskAssessment;
  const trace = risk.calculationTrace;
  return <div className="page-bg workspace-bg"><main className="lender-report">
    <header className="lender-report-header"><div><span className="brand-mark">GCP</span><b>Global Credit Passport</b></div><span className="status-pill light">READ ONLY</span></header>
    <section className="simple-card">
      <span className="eyebrow">AUTHORIZED LENDER REPORT</span>
      <div className="lender-subject"><div><h1>{report.subject.fullName}</h1><p>{report.corridor.originCountry} → {report.corridor.destinationCountry} · {words(report.corridor.purpose)}</p></div><div><small>Shared with</small><b>{share.recipientName}</b><small>Expires {new Date(share.expiresAt).toLocaleString()}</small></div></div>
      <p className="lender-consent-note">Shared by the borrower for {share.purpose}. Published {new Date(share.publishedAt).toLocaleString()}.</p>
    </section>
    <section className="simple-card lender-risk-card">
      <div className="risk-head"><div><span className="eyebrow">RISK INTELLIGENCE</span><h3>{risk.riskIndex ?? "—"}<small>/100 GCP risk index</small></h3><p>{words(risk.riskBand)}</p></div><div className="confidence-score"><b>{risk.confidence.score}%</b><span>{words(risk.confidence.band)} confidence</span></div></div>
      <div className="risk-dimensions">{risk.dimensions.map((item) => <div key={item.key}><span><b>{item.label}</b><small>{item.available ? `${words(item.band)} · ${item.configuredWeight}% weight` : `Excluded · ${words(item.reasonCodes[0] || "insufficient data")}`}</small></span><strong>{item.score ?? "—"}</strong></div>)}</div>
      {trace && <div className="formula-box"><code>({risk.dimensions.filter((item) => item.available).map((item) => `${item.score} × ${item.configuredWeight}`).join(" + ")}) ÷ {trace.availableConfiguredWeight} = {risk.riskIndex}</code><small>{trace.availableConfiguredWeight} of {trace.totalConfiguredWeight} configured weight was available. Missing dimensions were excluded, not treated as zero.</small></div>}
    </section>
    <section className="simple-card lender-audit-card">
      <span className="eyebrow">EVIDENCE AND AUDIT</span><h2>Calculation provenance</h2>
      {trace && <div className="evidence-audit-list">{trace.evidence.map((item) => <div key={`${item.domain}-${item.evidenceId}`}><b>{words(item.domain)}</b><span>{item.provider} · {item.countryCode}</span><small>{item.completenessPercent}% complete · {item.schemaVersion}</small><small>Adapter {item.adapterId} {item.adapterVersion}</small><small>Retrieved {new Date(item.retrievedAt).toLocaleString()}</small><small>Evidence ID {item.evidenceId || "not recorded"}</small></div>)}</div>}
      <div className="audit-metadata"><div><span>Assessment schema</span><b>{risk.schemaVersion}</b></div><div><span>Rules version</span><b>{risk.modelVersion}</b></div><div><span>Calculated</span><b>{new Date(risk.calculatedAt).toLocaleString()}</b></div>{trace && <div className="fingerprint"><span>Input fingerprint</span><code>{trace.inputFingerprintSha256}</code></div>}</div>
      <p className="risk-disclosure">This report provides pilot risk intelligence and evidence provenance. It is not a lender approval decision. The secure link is time limited and can be revoked by the borrower.</p>
    </section>
  </main></div>;
}
