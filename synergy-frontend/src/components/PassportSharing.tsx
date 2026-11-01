import { useCallback, useEffect, useState } from "react";
import { createPassportShare, getBorrowerDocumentRequests, getPassportShares, replacePassportShareLink, respondToPassportShare, revokePassportShare, subscribeBorrowerReviewEvents, uploadBorrowerReviewDocument } from "../api/passport";
import type { PassportShareSummary, ReviewDocumentRequest } from "../api/passport";

function words(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function reviewStatus(value: string) {
  const labels: Record<string, string> = {
    NOT_OPENED: "Shared · awaiting lender",
    VIEWED: "Profile viewed",
    UNDER_REVIEW: "Under lender review",
    INFORMATION_REQUESTED: "Information requested",
    COMPLETED: "Review completed",
  };
  return labels[value] || words(value);
}

export default function PassportSharing({ passportId }: { passportId: string }) {
  const [recipientName, setRecipientName] = useState("");
  const [purpose, setPurpose] = useState("Loan evaluation");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [consent, setConsent] = useState(false);
  const [shares, setShares] = useState<PassportShareSummary[]>([]);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdLinkLabel, setCreatedLinkLabel] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [documentRequests, setDocumentRequests] = useState<Record<string, ReviewDocumentRequest[]>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [replacementDays, setReplacementDays] = useState<Record<string, number>>({});
  const [showNewShare, setShowNewShare] = useState(false);
  const [openDocuments, setOpenDocuments] = useState<Record<string, boolean>>({});
  const [openManagement, setOpenManagement] = useState<Record<string, boolean>>({});
  const [showPreviousAccess, setShowPreviousAccess] = useState(false);

  const load = useCallback(async () => {
    try {
      const loadedShares = await getPassportShares(passportId);
      setShares(loadedShares);
      const activeShares = loadedShares.filter((share) => share.status === "ACTIVE");
      const entries = await Promise.all(activeShares.map(async (share) => [
        share.shareId, await getBorrowerDocumentRequests(passportId, share.shareId),
      ] as const));
      setDocumentRequests(Object.fromEntries(entries));
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load shares."); }
  }, [passportId]);

  useEffect(() => {
    void load();
    return subscribeBorrowerReviewEvents(passportId, () => void load());
  }, [load, passportId]);

  async function create() {
    setLoading(true); setError(null); setMessage(null); setCreatedUrl(null);
    try {
      const result = await createPassportShare(passportId, {
        recipientName, purpose, expiresInDays, consentConfirmed: consent,
      });
      setCreatedUrl(`${window.location.origin}/lender/passport/${result.token}`);
      setCreatedLinkLabel(`New lender link for ${result.recipientName}`);
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

  async function replaceLink(share: PassportShareSummary) {
    const days = replacementDays[share.shareId] || 7;
    const confirmed = window.confirm(
      `Replace the access link for ${share.recipientName} and renew consent for ${days} days? The existing URL will stop working immediately. Review history, messages and documents will be preserved.`
    );
    if (!confirmed) return;
    setLoading(true); setError(null); setMessage(null); setCreatedUrl(null);
    try {
      const result = await replacePassportShareLink(passportId, share.shareId, days);
      setCreatedUrl(`${window.location.origin}/lender/passport/${result.token}`);
      setCreatedLinkLabel(`Replacement link for ${result.recipientName}`);
      setMessage("Access link replaced. Copy and send the new link now; it cannot be retrieved later.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to replace the lender link.");
    } finally { setLoading(false); }
  }

  async function respond(shareId: string) {
    const response = responses[shareId]?.trim();
    if (!response) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await respondToPassportShare(passportId, shareId, response);
      setResponses((current) => ({ ...current, [shareId]: "" }));
      setMessage("Your response was sent to the lender. The review can now continue.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send your response.");
    } finally { setLoading(false); }
  }

  async function upload(shareId: string, requestId: string) {
    const file = selectedFiles[requestId];
    if (!file) return;
    setLoading(true); setError(null); setMessage(null);
    try {
      await uploadBorrowerReviewDocument(passportId, shareId, requestId, file);
      setSelectedFiles((current) => ({ ...current, [requestId]: null }));
      setMessage("Document uploaded securely for lender review.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload the document.");
    } finally { setLoading(false); }
  }

  const activeShares = shares.filter((share) => share.status === "ACTIVE");
  const previousShares = shares.filter((share) => share.status !== "ACTIVE");

  return <div className="sharing-workspace">
    <section className="lender-activity-intro">
      <div><span className="eyebrow">YOUR APPLICATIONS</span><h3>{activeShares.length ? `${activeShares.length} active lender review${activeShares.length === 1 ? "" : "s"}` : "No active lender reviews"}</h3><p>{activeShares.length ? "Complete any requested actions and manage each lender’s access from one place." : "Share your passport when you are ready for a lender to review it."}</p></div>
      <details className="new-lender-share" onToggle={(event) => { const open = event.currentTarget.open; setShowNewShare(open); }}>
        <summary>Share with a new lender</summary>
    {showNewShare && <div className="sharing-content">
      <div className="passport-trust-bar" aria-label="Secure sharing controls"><span>Read-only · Time-limited · Revocable</span></div>
      <p>Create access for one named lender. Raw transactions, full account numbers and identity documents are never shared.</p>
      <div className="share-form">
        <label>Lender or recipient<input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Example Bank" maxLength={200}/></label>
        <label>Purpose<input value={purpose} onChange={(event) => setPurpose(event.target.value)} maxLength={200}/></label>
        <label>Expires in<select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></label>
      </div>
      <label className="share-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>I consent to share this published GCP financial profile, including identity status, standardized evidence summary, financial assessment and audit record, with the named recipient until the link expires or I revoke it.</span></label>
      <button className="btn primary-action" disabled={loading || !consent || !recipientName.trim() || !purpose.trim()} onClick={() => void create()}>{loading ? "Creating secure link…" : "Create secure link"}</button>
    </div>}
      </details>
    </section>
    {error && <div className="alert-error">{error}</div>}
    {message && <div className="share-message">✓ {message}</div>}
    {createdUrl && <div className="created-link-result persistent-created-link"><b>{createdLinkLabel || "Secure lender link"}</b><small>This URL is shown only now. Copy it before leaving this page.</small><div className="created-share"><input aria-label="Secure lender link" readOnly value={createdUrl}/><button className="btn compact-action" onClick={() => void copy()}>Copy link</button></div></div>}
    {activeShares.length > 0 && <div className="share-list simplified-share-list">{activeShares.map((share) => {
        const requests = documentRequests[share.shareId] || [];
        const accessExpiresOn = new Date(share.expiresAt).toISOString().slice(0, 10);
        const pendingRequests = requests.filter((request) => request.status === "REQUESTED" || request.status === "REPLACEMENT_REQUESTED");
        const awaitingUpload = pendingRequests.length;
        const outsideAccess = pendingRequests.filter((request) => request.dueDate && request.dueDate > accessExpiresOn).length;
        const nextAction = awaitingUpload > 0
          ? `${awaitingUpload} document${awaitingUpload === 1 ? "" : "s"} to upload`
          : share.review.status === "INFORMATION_REQUESTED"
            ? "Reply to lender"
            : "No action needed";
        return <article className={`share-card ${awaitingUpload > 0 || share.review.status === "INFORMATION_REQUESTED" ? "has-action" : ""}`} key={share.shareId}>
          <header className="share-card-header">
            <span><b>{share.recipientName}</b><small>{share.purpose}</small></span>
            <em className="review-stage">{reviewStatus(share.review.status)}</em>
          </header>
          <div className="lender-review-summary task-first">
            <span className={awaitingUpload > 0 ? "primary-task" : ""}><small>Your next step</small><b>{nextAction}</b></span>
            <span><small>Lender access ends</small><b>{new Date(share.expiresAt).toLocaleDateString()}</b></span>
          </div>
          {outsideAccess > 0 && <div className="access-action-needed compact"><span><b>Access ends before the document due date.</b> Renew access so the lender can receive your upload.</span></div>}
          {share.review.borrowerMessage && <div className="borrower-review-message"><b>Lender message</b><span>{share.review.borrowerMessage}</span></div>}
          {share.review.outcome && <div className="borrower-review-outcome"><b>Lender-recorded outcome</b><span>{words(share.review.outcome)}</span></div>}
          {requests.length > 0 && <details className="borrower-document-section" onToggle={(event) => { const open = event.currentTarget.open; setOpenDocuments((current) => ({ ...current, [share.shareId]: open })); }}><summary><span><b>{awaitingUpload ? "View document requests" : "View submitted documents"}</b><small>{awaitingUpload ? `${awaitingUpload} awaiting upload` : "All requests addressed"}</small></span><em>{requests.length}</em></summary>{openDocuments[share.shareId] && <div className="borrower-document-list">{requests.map((request) => <div className="document-request borrower-document-request" key={request.requestId}>
              <span><b>{request.documentType}</b><small>{request.required ? "Required" : "Optional"}{request.dueDate ? ` · due ${new Date(`${request.dueDate}T00:00:00`).toLocaleDateString()}` : ""}</small>{request.description && <small>{request.description}</small>}{request.filename && <small>Uploaded: {request.filename}</small>}</span>
              <em>{words(request.status)}</em>
              {(request.status === "REQUESTED" || request.status === "REPLACEMENT_REQUESTED") && request.dueDate && request.dueDate > accessExpiresOn && <small className="document-expiry-warning">Access ends before this due date. Renew access below.</small>}
              {(request.status === "REQUESTED" || request.status === "REPLACEMENT_REQUESTED") && <span className="document-upload-row"><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setSelectedFiles((current) => ({ ...current, [request.requestId]: event.target.files?.[0] || null }))}/><button className="btn compact-action" disabled={loading || !selectedFiles[request.requestId]} onClick={() => void upload(share.shareId, request.requestId)}>Upload</button></span>}
              </div>)}</div>}</details>}
          {share.review.status === "INFORMATION_REQUESTED" && <div className="borrower-response-form"><label>Reply to lender<textarea value={responses[share.shareId] || ""} onChange={(event) => setResponses((current) => ({ ...current, [share.shareId]: event.target.value }))} maxLength={4000} placeholder="Write your response"/></label><button className="btn compact-action" disabled={loading || !responses[share.shareId]?.trim()} onClick={() => void respond(share.shareId)}>Send response</button></div>}
          <details className="share-card-details" onToggle={(event) => { const open = event.currentTarget.open; setOpenManagement((current) => ({ ...current, [share.shareId]: open })); }}>
            <summary>{outsideAccess > 0 ? "Renew or manage lender access" : "Manage lender access"}</summary>
            {openManagement[share.shareId] && <div className="share-card-details-content">
              <small className="share-last-activity">Opened {share.accessCount} time{share.accessCount === 1 ? "" : "s"}{share.lastAccessedAt ? ` · last accessed ${new Date(share.lastAccessedAt).toLocaleString()}` : ""}{share.review.updatedAt ? ` · review updated ${new Date(share.review.updatedAt).toLocaleString()}` : ""}</small>
              {share.review.borrowerResponse && <div className="borrower-review-response"><b>Your response</b><span>{share.review.borrowerResponse}</span></div>}
              <footer className="share-access-panel"><span><b>Renew or end access</b><small>A replacement immediately disables the current URL.</small></span><label><small>New access period</small><select value={replacementDays[share.shareId] || 7} onChange={(event) => setReplacementDays((current) => ({ ...current, [share.shareId]: Number(event.target.value) }))}><option value={1}>1 day</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></label><button className="btn compact-action" disabled={loading} onClick={() => void replaceLink(share)}>Renew access</button><button className="text-button" disabled={loading} onClick={() => void revoke(share.shareId)}>Revoke</button></footer>
            </div>}
          </details>
        </article>;
      })}</div>}
      {previousShares.length > 0 && <details className="previous-lender-access" onToggle={(event) => { const open = event.currentTarget.open; setShowPreviousAccess(open); }}>
        <summary><span><b>Previous lender access</b><small>Expired and revoked links</small></span><em>{shares.filter((share) => share.status !== "ACTIVE").length}</em></summary>
        {showPreviousAccess && <div>{previousShares.map((share) => <article key={share.shareId}>
          <span><b>{share.recipientName}</b><small>{share.purpose} · access ended {new Date(share.expiresAt).toLocaleString()}</small></span>
          <span><small>Profile access</small><b>{share.accessCount} time{share.accessCount === 1 ? "" : "s"}</b></span>
          <em className={`share-status ${share.status.toLowerCase()}`}>{share.status}</em>
        </article>)}</div>}
      </details>}
  </div>;
}
