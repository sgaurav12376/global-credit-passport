import { useEffect, useState } from "react";
import { createPassportShare, getPassportShares, revokePassportShare } from "../api/passport";
import type { PassportShareSummary } from "../api/passport";

export default function PassportSharing({ passportId }: { passportId: string }) {
  const [recipientName, setRecipientName] = useState("");
  const [purpose, setPurpose] = useState("Loan evaluation");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [consent, setConsent] = useState(false);
  const [shares, setShares] = useState<PassportShareSummary[]>([]);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try { setShares(await getPassportShares(passportId)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load shares."); }
  }

  useEffect(() => { void load(); }, [passportId]);

  async function create() {
    setLoading(true); setError(null); setMessage(null); setCreatedUrl(null);
    try {
      const result = await createPassportShare(passportId, {
        recipientName, purpose, expiresInDays, consentConfirmed: consent,
      });
      setCreatedUrl(`${window.location.origin}/lender/passport/${result.token}`);
      setMessage("Secure lender link created. Copy it now; the token is not stored in readable form.");
      setRecipientName(""); setConsent(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the share.");
    } finally { setLoading(false); }
  }

  async function copy() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setMessage("Secure lender link copied.");
  }

  async function revoke(shareId: string) {
    setLoading(true); setError(null);
    try { await revokePassportShare(passportId, shareId); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to revoke the share."); }
    finally { setLoading(false); }
  }

  return <details className="sharing-panel">
    <summary>Share passport with a lender</summary>
    <div className="sharing-content">
      <p>Create a read-only, time-limited link. Anyone with the link can open the report, so send it only to the named recipient. Raw bank transactions and identity documents are not shared.</p>
      <div className="share-form">
        <label>Lender or recipient<input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Example Bank" maxLength={200}/></label>
        <label>Purpose<input value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={200}/></label>
        <label>Expires in<select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></label>
      </div>
      <label className="share-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>I consent to share this published passport’s profile details, identity status, normalized evidence summary, risk assessment and audit record with the named recipient until the link expires or I revoke it.</span></label>
      <button className="btn primary-action" disabled={loading || !consent || !recipientName.trim() || !purpose.trim()} onClick={() => void create()}>{loading ? "Creating secure link…" : "Create secure link"}</button>
      {error && <div className="alert-error">{error}</div>}
      {createdUrl && <div className="created-share"><input readOnly value={createdUrl}/><button className="btn compact-action" onClick={() => void copy()}>Copy link</button></div>}
      {message && <div className="share-message">✓ {message}</div>}
      {shares.length > 0 && <div className="share-list"><h4>Share history</h4>{shares.map((share) => <div key={share.shareId}><span><b>{share.recipientName}</b><small>{share.purpose} · expires {new Date(share.expiresAt).toLocaleString()}</small><small>{share.accessCount} access{share.accessCount === 1 ? "" : "es"}{share.lastAccessedAt ? ` · last ${new Date(share.lastAccessedAt).toLocaleString()}` : ""}</small></span><em className={`share-status ${share.status.toLowerCase()}`}>{share.status}</em>{share.status === "ACTIVE" && <button className="text-button" disabled={loading} onClick={() => void revoke(share.shareId)}>Revoke</button>}</div>)}</div>}
    </div>
  </details>;
}
