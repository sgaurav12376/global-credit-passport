import { useState } from "react";
import { createLenderInvitation } from "../api/passport";

export default function LenderRequest() {
  const [lenderName, setLenderName] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setLoading(true);
    setError(null);
    try {
      const result = await createLenderInvitation({
        lenderName, borrowerName, purpose, expiresInDays,
      });
      setToken(result.token);
      setExpiresAt(result.expiresAt);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the request.");
    } finally {
      setLoading(false);
    }
  }

  const borrowerUrl = token
    ? `${window.location.origin}/borrower/invitation/${token}`
    : "";
  const statusUrl = token ? `${window.location.origin}/lender/request/${token}` : "";

  return <div className="page-bg workspace-bg"><main className="lender-report">
    <header className="lender-report-header"><div><span className="brand-mark">GCP</span><b>Global Credit Passport</b></div><span className="status-pill light">PILOT</span></header>
    <section className="simple-card invitation-card">
      <span className="eyebrow">LENDER REQUEST</span>
      <h1>Request a Global Credit Passport</h1>
      <p>Create an invitation for a borrower to review and authorize. No report is released until the borrower provides consent.</p>
      {!token ? <>
        <div className="share-form lender-request-form">
          <label>Lender or organization<input value={lenderName} onChange={(event) => setLenderName(event.target.value)} placeholder="Example Bank" maxLength={200}/></label>
          <label>Borrower name<input value={borrowerName} onChange={(event) => setBorrowerName(event.target.value)} placeholder="Applicant’s full name" maxLength={200}/></label>
          <label>Evaluation purpose<input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Loan evaluation" maxLength={200}/></label>
          <label>Request expires in<select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></label>
        </div>
        <button className="btn primary-action" disabled={loading || !lenderName.trim() || !borrowerName.trim() || !purpose.trim()} onClick={() => void create()}>{loading ? "Creating request…" : "Create borrower invitation"}</button>
        {error && <p className="error-text">{error}</p>}
      </> : <div className="invitation-result">
        <h2>Invitation ready</h2>
        <p>Send only the borrower invitation below to the applicant. Keep the lender status link for your records.</p>
        <label>Borrower invitation<input readOnly value={borrowerUrl}/></label>
        <button className="btn" onClick={() => void navigator.clipboard.writeText(borrowerUrl)}>Copy borrower invitation</button>
        <label>Lender status and report<input readOnly value={statusUrl}/></label>
        <button className="btn" onClick={() => void navigator.clipboard.writeText(statusUrl)}>Copy lender status link</button>
        <small>Request expires {expiresAt && new Date(expiresAt).toLocaleString()}.</small>
      </div>}
    </section>
  </main></div>;
}
