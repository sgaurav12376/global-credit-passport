import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLenderInvitation } from "../api/passport";
import type { LenderInvitation } from "../api/passport";

export default function LenderRequestStatus() {
  const { token } = useParams();
  const [request, setRequest] = useState<LenderInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setError(null);
    getLenderInvitation(token).then(setRequest).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "This request is unavailable."));
  }

  useEffect(() => {
    if (!token) return;
    getLenderInvitation(token).then(setRequest).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "This request is unavailable."));
  }, [token]);

  if (!token || error) return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state"><h1>Request unavailable</h1><p>{error || "This lender request is invalid."}</p></section></main></div>;
  if (!request) return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state">Loading lender request…</section></main></div>;

  return <div className="page-bg workspace-bg"><main className="lender-report">
    <header className="lender-report-header"><div><span className="brand-mark">GCP</span><b>Global Credit Passport</b></div><span className={`status-pill ${request.status === "AUTHORIZED" ? "success" : "light"}`}>{request.status}</span></header>
    <section className="simple-card invitation-card">
      <span className="eyebrow">LENDER REQUEST</span><h1>{request.borrowerName}</h1>
      <p><b>Requested by:</b> {request.lenderName}</p><p><b>Purpose:</b> {request.purpose}</p><p>Expires {new Date(request.expiresAt).toLocaleString()}</p>
      {request.status === "PENDING" && <><h2>Waiting for borrower authorization</h2><p>The borrower has not yet authorized a passport for this request.</p><button className="btn" onClick={load}>Refresh status</button></>}
      {request.status === "AUTHORIZED" && <><h2>Borrower authorization received</h2><p>The read-only report is ready for review.</p><a className="btn primary-action" href={`/lender/passport/${token}`}>Open authorized report</a></>}
      {request.status === "REVOKED" && <><h2>Access revoked</h2><p>The borrower has withdrawn authorization. A new request and authorization are required to access another report.</p></>}
      {request.status === "EXPIRED" && <><h2>Request expired</h2><p>Create a new request if the borrower still wishes to proceed.</p></>}
      {request.status === "UNAVAILABLE" && <><h2>Report unavailable</h2><p>The authorized report can no longer be retrieved.</p></>}
    </section>
  </main></div>;
}
