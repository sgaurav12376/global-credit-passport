import { useEffect, useState } from "react";
import {
  fetchSurepassCreditReport,
  getLatestSurepassCreditReport,
  getSurepassCreditReportHistory,
  downloadSurepassCreditReport,
} from "../api/surepass";
import type { StoredCreditReport } from "../api/surepass";

type Props = {
  readOnly?: boolean;
  connected: boolean;
  passportId?: string;
  fullName: string;
  ensurePassportId: () => Promise<string>;
  onConnected: () => void;
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

function money(value?: number | null) {
  if (value == null) return "Not available";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(value);
}

export default function SurepassCreditConnect({
  readOnly = false, connected, passportId, fullName, ensurePassportId, onConnected,
}: Props) {
  const initialName = splitName(fullName);
  const [expanded, setExpanded] = useState(false);
  const [bureau, setBureau] =
    useState<"cibil" | "cibil-pdf" | "crif" | "experian">("cibil");
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [mobile, setMobile] = useState("");
  const [pan, setPan] = useState("");
  const [consent, setConsent] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | "transgender">("male");
  const [report, setReport] = useState<StoredCreditReport | null>(null);
  const [history, setHistory] = useState<StoredCreditReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!passportId) return;
    Promise.all([
      getLatestSurepassCreditReport(passportId),
      getSurepassCreditReportHistory(passportId),
    ])
      .then(([latest, savedReports]) => {
        setHistory(savedReports);
        if (latest) {
          setReport(latest);
          onConnected();
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load report."));
    // Load the saved report when the passport becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passportId]);

  async function submit() {
    setMessage(null);
    if (!firstName.trim() || !lastName.trim()) {
      setMessage("Enter the borrower’s first and last name.");
      return;
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
      setMessage("Enter a 10-digit Indian mobile number.");
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())) {
      setMessage("Enter a valid PAN in uppercase format.");
      return;
    }
    if (!consent) {
      setMessage("Borrower consent is required.");
      return;
    }

    setBusy(true);
    try {
      const resolvedPassportId = passportId || await ensurePassportId();
      const result = await fetchSurepassCreditReport(bureau, {
        passportId: resolvedPassportId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobile,
        pan: pan.toUpperCase(),
        gender,
        consent,
      });
      setReport(result);
      setHistory((current) => [result, ...current.filter((item) => item.reportId !== result.reportId)]);
      setMobile("");
      setPan("");
      setConsent(false);
      setExpanded(false);
      onConnected();
      setMessage(`${result.bureau} report connected successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to fetch credit report.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadDocument() {
    if (!report?.documentAvailable) return;
    setMessage(null);
    setBusy(true);
    try {
      const blob = await downloadSurepassCreditReport(report.reportId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `cibil-credit-report-${report.reportId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("CIBIL PDF downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to download the CIBIL PDF.");
    } finally {
      setBusy(false);
    }
  }

  const normalized = report?.normalizedReport;
  const summary = normalized?.summary;

  return (
    <div className={"tile " + (connected || report ? "selected" : "")} style={{ cursor: "default" }}>
      <div className="icon">📊</div>
      <div style={{ fontWeight: 700 }}>Credit history</div>

      {report && normalized && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          <div style={{ color: "#18794e" }}>✓ {report.bureau} connected</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
            {normalized.creditScore ?? "—"}
          </div>
          <div className="hint">Credit score</div>
          <div className="hint">
            Report date: {new Date(report.createdAt).toLocaleDateString()}
            {report.inheritedFromReportId ? " · carried from previous passport version" : ""}
          </div>
          {!!normalized.scoreFactors?.length && (
            <div className="hint" style={{ marginTop: 4 }}>
              Factors: {normalized.scoreFactors.join(", ")}
            </div>
          )}
          {report.documentAvailable && (
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={downloadDocument}
              style={{ marginTop: 7 }}
            >
              {busy ? "Preparing PDF..." : "Download CIBIL PDF"}
            </button>
          )}
          <div style={{ maxHeight: 105, overflowY: "auto", textAlign: "left", marginTop: 7 }}>
            <div>Accounts: {summary?.totalAccounts ?? "—"} ({summary?.activeAccounts ?? "—"} active)</div>
            <div>Overdue/default: {summary?.overdueOrDefaultAccounts ?? "—"}</div>
            <div>Current balance: {money(summary?.currentBalance)}</div>
            <div>Maximum DPD: {summary?.maximumDaysPastDue ?? "—"}</div>
          </div>
        </div>
      )}

      {!readOnly && (!expanded ? (
        <button className="btn" type="button" style={{ marginTop: 10 }} onClick={() => setExpanded(true)}>
          {report ? "Fetch updated report" : "Connect credit report"}
        </button>
      ) : (
        <div style={{ maxHeight: 290, overflowY: "auto", textAlign: "left", marginTop: 9 }}>
          <div className="label">Bureau</div>
          <select
            className="input"
            value={bureau}
            onChange={(e) =>
              setBureau(
                e.target.value as "cibil" | "cibil-pdf" | "crif" | "experian"
              )
            }
          >
            <option value="cibil">CIBIL Structured</option>
            <option value="cibil-pdf">CIBIL PDF</option>
            <option value="crif">CRIF</option>
            <option value="experian">Experian</option>
          </select>
          <div className="label">First name</div>
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <div className="label">Last name</div>
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <div className="label">PAN</div>
          <input className="input" value={pan} maxLength={10} onChange={(e) => setPan(e.target.value.toUpperCase())} />
          <div className="label">Mobile</div>
          <input className="input" value={mobile} maxLength={10} inputMode="numeric" onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} />
          <div className="label">Gender</div>
          <select
            className="input"
            value={gender}
            onChange={(e) => setGender(e.target.value as "male" | "female" | "transgender")}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="transgender">Transgender</option>
          </select>
          <label style={{ display: "flex", gap: 7, marginTop: 10, fontSize: 11 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            The borrower consents to this bureau pull for the passport pilot.
          </label>
          <div style={{ display: "flex", gap: 7 }}>
            <button className="btn" type="button" disabled={busy} onClick={submit}>{busy ? "Fetching..." : "Fetch report"}</button>
            <button className="btn" type="button" disabled={busy} onClick={() => setExpanded(false)}>Cancel</button>
          </div>
        </div>
      ))}
      {history.length > 1 && !expanded && (
        <details style={{ marginTop: 8, textAlign: "left", fontSize: 11 }}>
          <summary style={{ cursor: "pointer" }}>Report history ({history.length})</summary>
          {history.map((item) => (
            <button
              key={item.reportId}
              type="button"
              className="btn"
              onClick={() => setReport(item)}
              style={{ display: "block", width: "100%", marginTop: 5 }}
            >
              {item.bureau} · {new Date(item.createdAt).toLocaleDateString()}
              {item.documentAvailable ? " · PDF" : " · Structured"}
            </button>
          ))}
        </details>
      )}
      {message && <div style={{ fontSize: 11, marginTop: 7 }}>{message}</div>}
      <div className="hint" style={{ fontSize: 10, marginTop: 6 }}>
        PAN and mobile are not stored as separate GCP fields. CIBIL PDFs are retained
        in protected local pilot storage and may contain borrower information.
      </div>
    </div>
  );
}
