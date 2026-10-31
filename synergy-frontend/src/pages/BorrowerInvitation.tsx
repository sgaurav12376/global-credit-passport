import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { authorizeLenderInvitation, getLatestPassport, getLenderInvitation } from "../api/passport";
import type { LenderInvitation, PassportView } from "../api/passport";

export default function BorrowerInvitation() {
  const { token } = useParams();
  const [request, setRequest] = useState<LenderInvitation | null>(null);
  const [passport, setPassport] = useState<PassportView | null>(null);
  const [consent, setConsent] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getLenderInvitation(token).then(setRequest).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "This invitation is unavailable."));
    getLatestPassport().then(setPassport).catch(() => setPassport(null));
  }, [token]);

  async function authorize() {
    if (!token || !passport) return;
    setLoading(true);
    setError(null);
    try {
      await authorizeLenderInvitation(token, {
        passportId: passport.passportId,
        consentConfirmed: consent,
      });
      setAuthorized(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to authorize this request.");
    } finally {
      setLoading(false);
    }
  }

  if (!token || error && !request) return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state"><h1>Invitation unavailable</h1><p>{error || "This invitation is invalid."}</p></section></main></div>;
  if (!request) return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state">Opening lender invitation…</section></main></div>;
  if (authorized || request.status === "AUTHORIZED") return <div className="page-bg workspace-bg"><main className="lender-report"><section className="simple-card empty-state"><span className="eyebrow">AUTHORIZATION COMPLETE</span><h1>Your passport has been shared</h1><p>{request.lenderName} can now review the authorized, read-only report until it expires or you revoke access.</p><Link className="btn primary-action" to="/dashboard">Manage sharing</Link></section></main></div>;

  const published = passport?.status === "ACTIVE";
  return <div className="page-bg workspace-bg"><main className="lender-report">
    <header className="lender-report-header"><div><span className="brand-mark">GCP</span><b>Global Credit Passport</b></div><span className="status-pill light">CONSENT REQUIRED</span></header>
    <section className="simple-card invitation-card">
      <span className="eyebrow">LENDER INVITATION</span><h1>{request.lenderName} requested a passport from {request.borrowerName}</h1>
      <p><b>Purpose:</b> {request.purpose}</p><p><b>Request expires:</b> {new Date(request.expiresAt).toLocaleString()}</p>
      <div className="lender-consent-note">The lender will receive profile details, identity status, normalized evidence summary, risk assessment and audit record. Raw bank transactions and identity documents will not be shared.</div>
      {published ? <>
        <p><b>Published passport:</b> {passport.originCountry} → {passport.destCountry} · {passport.purpose.toLowerCase()}</p>
        <label className="share-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>I authorize this published passport to be shared with {request.lenderName} for {request.purpose} until access expires or I revoke it.</span></label>
        <button className="btn primary-action" disabled={loading || !consent} onClick={() => void authorize()}>{loading ? "Authorizing…" : "Authorize lender access"}</button>
      </> : <><p>You need a published passport before you can authorize this request.</p><Link className="btn primary-action" to="/dashboard">Open my passport</Link></>}
      {error && <p className="error-text">{error}</p>}
    </section>
  </main></div>;
}
