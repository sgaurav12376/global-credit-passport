import { useEffect, useState } from "react";
import {
  createSimulatedCibilReport, createSimulatedMultiBureauReport, downloadSurepassCreditReport, fetchMultiBureauCreditReport,
  importFinpassTestResponse,
  getLatestSurepassCreditReport, getSurepassCreditReportHistory,
} from "../api/surepass";
import type { BureauOutcome, StoredCreditReport } from "../api/surepass";

type Props = { readOnly?: boolean; connected: boolean; passportId?: string; fullName: string;
  ensurePassportId: () => Promise<string>; onConnected: () => void; };

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}
function money(value?: number | null) {
  if (value == null) return "Not available";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
function bureauLabel(value: string) {
  const upper = value.toUpperCase();
  if (upper === "CIBIL_SIMULATED") return "India credit simulation";
  return upper.charAt(0) + upper.slice(1).toLowerCase();
}
function latestBatch(history: StoredCreditReport[], latest: StoredCreditReport) {
  const latestTime = new Date(latest.createdAt).getTime();
  const seen = new Set<string>();
  return history.filter((item) => {
    const close = Math.abs(latestTime - new Date(item.createdAt).getTime()) <= 120_000;
    const bureau = item.bureau.toUpperCase();
    if (!close || seen.has(bureau)) return false;
    seen.add(bureau);
    return true;
  });
}

export default function SurepassCreditConnect({ readOnly = false, connected, passportId, fullName, ensurePassportId, onConnected }: Props) {
  const initialName = splitName(fullName);
  const [expanded, setExpanded] = useState(false);
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
  const [consent, setConsent] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | "transgender">("male");
  const [report, setReport] = useState<StoredCreditReport | null>(null);
  const [currentReports, setCurrentReports] = useState<StoredCreditReport[]>([]);
  const [outcomes, setOutcomes] = useState<BureauOutcome[]>([]);
  const [history, setHistory] = useState<StoredCreditReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [simulationScenario, setSimulationScenario] = useState<"STRONG" | "BALANCED" | "HIGH_RISK">("BALANCED");
  const [multiBureauScenario, setMultiBureauScenario] = useState<"COMPLETE" | "PARTIAL">("COMPLETE");
  const localSimulationAvailable = (import.meta.env.VITE_AUTH_MODE || "cognito") === "local";

  useEffect(() => {
    if (!passportId) return;
    Promise.all([getLatestSurepassCreditReport(passportId), getSurepassCreditReportHistory(passportId)])
      .then(([latest, saved]) => {
        setHistory(saved);
        if (latest) {
          const grouped = latestBatch(saved, latest);
          setReport(latest); setCurrentReports(grouped.length ? grouped : [latest]); onConnected();
        }
      }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load report."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passportId]);

  async function submit() {
    setMessage(null);
    if (!firstName.trim() || !lastName.trim()) return setMessage("Enter the borrower’s first and last name.");
    if (!/^[0-9]{10}$/.test(mobile)) return setMessage("Enter a 10-digit Indian mobile number.");
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())) return setMessage("Enter a valid PAN in uppercase format.");
    if (!consent) return setMessage("Borrower consent is required.");
    setBusy(true);
    try {
      const resolvedPassportId = passportId || await ensurePassportId();
      const result = await fetchMultiBureauCreditReport({ passportId: resolvedPassportId, firstName: firstName.trim(),
        lastName: lastName.trim(), mobile, pan: pan.toUpperCase(), gender, consent });
      setCurrentReports(result.reports); setOutcomes(result.outcomes); setReport(result.reports[0] || null);
      setHistory((current) => [...result.reports, ...current.filter((item) => !result.reports.some((saved) => saved.reportId === item.reportId))]);
      setMobile(""); setPan(""); setConsent(false); setExpanded(false); onConnected();
      const available = result.outcomes.filter((item) => item.normalized).length;
      setMessage(`India credit report connected with ${available} bureau${available === 1 ? "" : "s"} available.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to fetch credit report."); }
    finally { setBusy(false); }
  }

  async function downloadDocument() {
    if (!report?.documentAvailable) return;
    setMessage(null); setBusy(true);
    try {
      const blob = await downloadSurepassCreditReport(report.reportId);
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `credit-report-${report.reportId}.pdf`; document.body.appendChild(anchor);
      anchor.click(); anchor.remove(); URL.revokeObjectURL(url); setMessage("Credit report PDF downloaded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to download the credit report PDF."); }
    finally { setBusy(false); }
  }

  async function simulateStructuredCibil() {
    setMessage(null); setBusy(true);
    try {
      const resolvedPassportId = passportId || await ensurePassportId();
      const result = await createSimulatedCibilReport(resolvedPassportId, simulationScenario);
      setReport(result); setCurrentReports([result]); setOutcomes([]);
      setHistory((current) => [result, ...current.filter((item) => item.reportId !== result.reportId)]);
      onConnected(); setMessage(`Simulated ${simulationScenario.toLowerCase().replace("_", " ")} credit scenario connected.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create simulation."); }
    finally { setBusy(false); }
  }

  async function simulateMultiBureau() {
    setMessage(null); setBusy(true);
    try {
      const resolvedPassportId = passportId || await ensurePassportId();
      const result = await createSimulatedMultiBureauReport(resolvedPassportId, multiBureauScenario);
      setCurrentReports(result.reports); setOutcomes(result.outcomes); setReport(result.reports[0] || null);
      setHistory((current) => [...result.reports, ...current.filter((item) => !result.reports.some((saved) => saved.reportId === item.reportId))]);
      onConnected();
      const available = result.outcomes.filter((item) => item.normalized).length;
      setMessage(`Synthetic multi-bureau test completed: ${available} bureau${available === 1 ? "" : "s"} available.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create multi-bureau test report."); }
    finally { setBusy(false); }
  }

  async function importProviderTestResponse(file?: File) {
    if (!file) return;
    setMessage(null); setBusy(true);
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      const resolvedPassportId = passportId || await ensurePassportId();
      const result = await importFinpassTestResponse(resolvedPassportId, payload);
      setCurrentReports(result.reports); setOutcomes(result.outcomes); setReport(result.reports[0] || null);
      setHistory((current) => [...result.reports, ...current.filter((item) => !result.reports.some((saved) => saved.reportId === item.reportId))]);
      onConnected();
      const available = result.outcomes.filter((item) => item.normalized).length;
      setMessage(`Finpass provider test response imported: ${available} bureau${available === 1 ? "" : "s"} available.`);
    } catch (error) {
      setMessage(error instanceof SyntaxError
        ? "The selected file is not valid JSON."
        : error instanceof Error ? error.message : "Unable to import the provider test response.");
    } finally { setBusy(false); }
  }

  const summary = report?.normalizedReport.summary;
  const historical = history.filter((item) => !currentReports.some((current) => current.reportId === item.reportId));

  return <div className={`tile ${connected || report ? "selected" : ""}`} style={{ cursor: "default" }}>
    <div className="icon">📊</div><div style={{ fontWeight: 700 }}>India credit history</div>
    {currentReports.length > 0 && <div style={{ marginTop: 8, fontSize: 12 }}>
      <div style={{ color: "#18794e", fontWeight: 700 }}>✓ Credit report connected</div>
      <div className="multi-bureau-summary">{currentReports.map((item) => <button type="button" key={item.reportId}
        className={report?.reportId === item.reportId ? "selected" : ""} onClick={() => setReport(item)}>
        <span>{bureauLabel(item.bureau)}</span><strong>{item.normalizedReport.creditScore ?? "—"}</strong>
        <small>{item.normalizedReport.scoreMinimum != null && item.normalizedReport.scoreMaximum != null
          ? `Original range ${item.normalizedReport.scoreMinimum}–${item.normalizedReport.scoreMaximum}` : "Original scale retained"}</small>
      </button>)}</div>
      {outcomes.length > 0 && <div className="bureau-outcome-list">{outcomes.map((item) => <span
        className={item.normalized ? "available" : "unavailable"} key={item.bureau}><b>{bureauLabel(item.bureau)}</b>
        {item.normalized ? "Available" : item.providerSuccess ? "Could not be standardized" : "Unavailable"}</span>)}</div>}
      {report && <div className="selected-credit-detail"><b>{bureauLabel(report.bureau)} details</b>
        <div>Accounts: {summary?.totalAccounts ?? "—"} ({summary?.activeAccounts ?? "—"} active)</div>
        <div>Overdue/default: {summary?.overdueOrDefaultAccounts ?? "—"}</div>
        <div>Current balance: {money(summary?.currentBalance)}</div><div>Maximum days past due: {summary?.maximumDaysPastDue ?? "—"}</div>
        <small>Report date: {new Date(report.createdAt).toLocaleDateString()}</small>
        {report.documentAvailable && <button className="btn" type="button" disabled={busy} onClick={downloadDocument}>
          {busy ? "Preparing PDF..." : "Download credit report PDF"}</button>}
      </div>}
    </div>}

    {!readOnly && (!expanded ? <>
      <button className="btn" type="button" style={{ marginTop: 10 }} onClick={() => setExpanded(true)}>
        {report ? "Refresh India credit report" : "Connect India credit report"}</button>
      {localSimulationAvailable && <div style={{ marginTop: 10, textAlign: "left" }}><div className="label">Local scoring simulation</div>
        <select className="input" value={simulationScenario} onChange={(event) => setSimulationScenario(event.target.value as "STRONG" | "BALANCED" | "HIGH_RISK")}>
          <option value="STRONG">Strong credit profile</option><option value="BALANCED">Balanced credit profile</option>
          <option value="HIGH_RISK">Higher-risk credit profile</option></select>
        <button className="btn" type="button" disabled={busy} onClick={simulateStructuredCibil} style={{ marginTop: 6 }}>
          {busy ? "Creating simulation..." : "Use simulated India credit history"}</button>
        <div className="hint" style={{ color: "#9a6700", marginTop: 5 }}>Local development only · synthetic data · not bureau verified</div>
        <div className="label" style={{ marginTop: 10 }}>Multi-bureau integration test</div>
        <select className="input" value={multiBureauScenario} onChange={(event) => setMultiBureauScenario(event.target.value as "COMPLETE" | "PARTIAL")}>
          <option value="COMPLETE">All four bureaus available</option>
          <option value="PARTIAL">Partial result · CIBIL unavailable</option>
        </select>
        <button className="btn" type="button" disabled={busy} onClick={simulateMultiBureau} style={{ marginTop: 6 }}>
          {busy ? "Creating multi-bureau test..." : "Test multi-bureau report"}</button>
        <div className="hint" style={{ color: "#9a6700", marginTop: 5 }}>Uses synthetic local fixture data · does not call Finpass or consume credits</div>
        <div className="label" style={{ marginTop: 10 }}>Import saved Finpass provider response</div>
        <label className="btn" style={{ display: "inline-block", marginTop: 6 }}>
          {busy ? "Importing response..." : "Choose Finpass JSON file"}
          <input type="file" accept="application/json,.json" disabled={busy} style={{ display: "none" }}
            onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void importProviderTestResponse(file); }}/>
        </label>
        <div className="hint" style={{ color: "#9a6700", marginTop: 5 }}>Local development only · imports a previously captured provider test response · does not call Finpass or consume credits</div>
      </div>}
    </> : <div style={{ maxHeight: 360, overflowY: "auto", textAlign: "left", marginTop: 9 }}>
      <div className="hint" style={{ marginBottom: 8 }}>One consented request checks the supported Indian credit bureaus. Available results are standardized automatically; an unavailable bureau is not treated as negative information.</div>
      <div className="label">First name</div><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      <div className="label">Last name</div><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <div className="label">PAN</div><input className="input" value={pan} maxLength={10} onChange={(e) => setPan(e.target.value.toUpperCase())} />
      <div className="label">Mobile</div><input className="input" value={mobile} maxLength={10} inputMode="numeric" onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} />
      <div className="label">Gender</div><select className="input" value={gender} onChange={(e) => setGender(e.target.value as "male" | "female" | "transgender")}>
        <option value="male">Male</option><option value="female">Female</option><option value="transgender">Transgender</option></select>
      <label style={{ display: "flex", gap: 7, marginTop: 10, fontSize: 11 }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I consent to retrieve and standardize my available Indian credit-bureau information for this passport.</label>
      <div style={{ display: "flex", gap: 7 }}><button className="btn" type="button" disabled={busy} onClick={submit}>
        {busy ? "Checking supported bureaus..." : "Fetch India credit report"}</button>
        <button className="btn" type="button" disabled={busy} onClick={() => setExpanded(false)}>Cancel</button></div>
    </div>)}

    {historical.length > 0 && !expanded && <details style={{ marginTop: 8, textAlign: "left", fontSize: 11 }}>
      <summary style={{ cursor: "pointer" }}>Previous credit records ({historical.length})</summary>
      {historical.map((item) => <button key={item.reportId} type="button" className="btn" onClick={() => setReport(item)}
        style={{ display: "block", width: "100%", marginTop: 5 }}>{bureauLabel(item.bureau)} · {new Date(item.createdAt).toLocaleDateString()}
        {item.documentAvailable ? " · PDF" : " · Structured"}</button>)}
    </details>}
    {message && <div style={{ fontSize: 11, marginTop: 7 }}>{message}</div>}
    <div className="hint" style={{ fontSize: 10, marginTop: 6 }}>PAN and mobile are used for the consented credit request and are not stored as separate GCP fields.</div>
  </div>;
}
