import type { FinancialEvidenceSummary } from "../api/passport";
import { observationAge } from "../lib/observationAge";
import { countryCode } from "../lib/countryRecords";

export default function AssessmentEvidenceNotice({ evidence, publishedAt, testEvidence, borrower = false }: {
  evidence?: FinancialEvidenceSummary[]; publishedAt: string; testEvidence: boolean; borrower?: boolean;
}) {
  const rows = Array.isArray(evidence) ? evidence : [];
  const knownTest = testEvidence || rows.some(r => r.evidenceEnvironment === "SANDBOX" || r.evidenceEnvironment === "SYNTHETIC");
  return <section className="simple-card" aria-label="Information reliability">
    <h3>{borrower ? "Information reliability" : "What the information can tell us"}</h3>
    <p><b>{borrower ? "Information status" : "Evidence assurance"}: {knownTest ? "Test information only" : "Production assurance not established"}</b></p>
    <p>{borrower ? "Information readiness shows how much usable information we have, not whether it is verified." : "Information readiness measures usable records, not their authenticity. This pilot is not a lending decision."}</p>
    <h4>{borrower ? "Last recorded banking activity" : "Banking information age at publication"}</h4>
    {rows.length ? rows.map((r, i) => {
      const days = observationAge(r.metrics.coverageEnd, publishedAt);
      return <p key={`${countryCode(r.countryCode)}-${r.provider}-${i}`}><b>{countryCode(r.countryCode)} · {r.provider}: </b>{days == null ? "Observation date unavailable" : `${days} days since last recorded activity (${r.metrics.coverageEnd})`}</p>;
    }) : <p>No published banking information.</p>}
    <p>Credit and identity observation dates may be incomplete; retrieval dates alone do not establish freshness.</p>
    <h4>Repayment information</h4>
    <p>Detected repayments reflect the available account activity. Total contractual repayments, overseas obligations and duplicate account relationships are not fully confirmed.</p>
    <p><b>Overall affordability: not established.</b> The lender must review outstanding obligations and any missing information.</p>
  </section>;
}
