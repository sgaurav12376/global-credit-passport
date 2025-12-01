import { useEffect, useMemo, useState } from "react";

/**
 * Contact page (credit/banking specific)
 * - No header/footer here; mount under your layout that already renders Topbar/Sidebar.
 * - Posts to /api/contact (adjust if your backend differs).
 * - Styles are component-scoped via <style> (no global CSS edits).
 */
export default function Contact() {
  const [status, setStatus] = useState("idle"); // idle | sending | ok | err
  const [topic, setTopic]   = useState("");
  const [pref, setPref]     = useState("email"); // email | phone

  // --- Hero score snapshot (read-only) ---
  const [util, setUtil] = useState(null); // %
  const [score, setScore] = useState(() => {
    const v = Number(localStorage.getItem("lastGlobalScore"));
    return Number.isFinite(v) ? v : null;
  });
  const [route, setRoute] = useState({
    origin: localStorage.getItem("originCode") || "IN",
    dest:   localStorage.getItem("destCode")   || "US",
  });

  // live utilization (same path style used in your Topbar)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("api/data/utilization");
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (!alive) return;
        const p = Number(j?.utilizationPercent);
        if (Number.isFinite(p)) setUtil(Math.max(0, Math.min(100, Math.round(p))));
      } catch {/* silent */}
    })();
    return () => { alive = false; };
  }, []);

  // react to route/score changes broadcasted by Topbar
  useEffect(() => {
    const onRoute = () => {
      setRoute({
        origin: localStorage.getItem("originCode") || "IN",
        dest:   localStorage.getItem("destCode")   || "US",
      });
      const v = Number(localStorage.getItem("lastGlobalScore"));
      if (Number.isFinite(v)) setScore(v);
    };
    window.addEventListener("countryRouteChanged", onRoute);
    return () => window.removeEventListener("countryRouteChanged", onRoute);
  }, []);

  const topics = [
    { v: "dispute",   label: "Dispute / incorrect credit data" },
    { v: "banklink",  label: "Linking bank account / Plaid issues" },
    { v: "util",      label: "Utilization & score coaching" },
    { v: "payhist",   label: "Payment history / delinquencies" },
    { v: "normalize", label: "Country normalization questions" },
    { v: "api",       label: "API / partner integration" },
    { v: "billing",   label: "Billing or account access" },
    { v: "other",     label: "Other" },
  ];

  const hints = useMemo(() => {
    switch (topic) {
      case "dispute":   return ["Attach a screenshot of the item (if possible).", "Do not include SSN or full account numbers."];
      case "banklink":  return ["Tell us the bank name and the exact error.", "Never share your bank password here."];
      case "util":      return ["Share total limits if you know them.", "We can plan pay-downs to drop utilization."];
      case "payhist":   return ["Include the lender and the reported month.", "We’ll guide dispute/document steps."];
      case "normalize": return ["Which origin → destination countries?", "A screenshot of the top-bar route helps."];
      case "api":       return ["Do you need read-only or write scopes?", "Tell us sandbox/production needs."];
      case "billing":   return ["Use the email on the billing account.", "We’ll verify ownership before changes."];
      default:          return ["Share helpful context.", "Never include SSN or full card numbers."];
    }
  }, [topic]);

  // helpers for snapshot
  const band = score == null ? null
    : score >= 800 ? "Excellent"
    : score >= 740 ? "Very Good"
    : score >= 670 ? "Good"
    : score >= 580 ? "Fair" : "Poor";

  const bandColor = score == null ? "#111827"
    : score >= 800 ? "#3B82F6"
    : score >= 740 ? "#10B981"
    : score >= 670 ? "#84CC16"
    : score >= 580 ? "#F59E0B" : "#EF4444";

  const flagEmoji = (code) => {
    if (!code || code.length !== 2) return "🌍";
    const A = 0x1f1e6, a = 65;
    const c1 = A + (code[0].toUpperCase().charCodeAt(0) - a);
    const c2 = A + (code[1].toUpperCase().charCodeAt(0) - a);
    return String.fromCodePoint(c1, c2);
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (status === "sending") return;

    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    // validations
    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email || "");
    if (!emailOK) { alert("Please enter a valid email."); return; }
    if (pref === "phone" && !payload.phone?.trim()) {
      alert("Please include a phone number (you selected Phone as preferred).");
      return;
    }
    if (!payload.consent) { alert("Please confirm consent to contact you."); return; }

    setStatus("sending");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          topic,
          pref,
          subject: `[Contact] ${topics.find(t => t.v === topic)?.label || "General"}`,
          source: "credit-app",
          route, // helpful context for support
        }),
      });
      if (!r.ok) throw new Error();
      setStatus("ok");
      e.currentTarget.reset();
      setTopic("");
      setPref("email");
    } catch {
      setStatus("err");
    }
  }

  return (
    <div className="cx-credit">
      <style>{CSS}</style>

      {/* HERO (animated gradient, no dots/orbs) */}
      <section className="cx-hero">
        <div className="cx-sheen" aria-hidden />
        <div className="cx-hero-inner">
          <h1>Contact Support</h1>
          <p>Credit score & banking-signal help — fast, secure, human.</p>

          {/* Score Snapshot (read-only) */}
          <div className="score-snap">
            <div className="ss-left">
              <div className="ss-k">Global Score</div>
              <div className="ss-v" style={{ color: bandColor }}>
                {score == null ? "—" : score}<span className="ss-suffix"> / 1000</span>
              </div>
              <div className="ss-band" style={{ color: bandColor }}>{band || "—"}</div>
            </div>
            <div className="ss-mid" aria-hidden />
            <div className="ss-right">
              <UtilDonut pct={util} />
              <div className="ss-util-text">{util == null ? "Util —" : `Util ${util}%`}</div>
              <div className="ss-route" title="Normalization route">
                <span className="flag">{flagEmoji(route.origin)}</span>
                <span className="arrow">→</span>
                <span className="flag">{flagEmoji(route.dest)}</span>
              </div>
            </div>
          </div>

          {/* Trust chips */}
          <div className="cx-chips">
            <span className="chip"><i>🔒</i> Bank-grade encryption</span>
            <span className="chip"><i>⚡</i> Avg response &lt; 2 hrs</span>
            <span className="chip"><i>🙅‍♂️</i> No SSN required</span>
          </div>
        </div>
      </section>

      {/* BODY: info + form */}
      <section className="cx-wrap">
        <div className="cx-grid">
          {/* INFO CARD */}
          <aside className="card info">
            <h3>How we can help</h3>
            <ul className="bullets">
              <li>Fix inaccurate or stale credit data</li>
              <li>Resolve bank-link errors (Plaid, OAuth)</li>
              <li>Lower utilization with a step-by-step plan</li>
              <li>Understand payment history & delinquencies</li>
              <li>Score normalization across countries</li>
              <li>API & partner integrations</li>
            </ul>

            <div className="contact-block">
              <div><i>📞</i><a href="tel:+18493348460">(848) 334-8460</a></div>
              <div><i>✉️</i><a href="mailto:Support@synergyresourcesgrp.com">Support@synergyresourcesgrp.com</a></div>
              <div className="mini"><i>🕒</i>Mon–Fri, 9am–6pm (ET)</div>
            </div>

            <div className="note">
              <strong>Security tip:</strong> never include SSN, full card numbers, or full account numbers in this form.
            </div>
          </aside>

          {/* FORM CARD */}
          <div className="card form elevate">
            <h3>Start a conversation</h3>

            <form onSubmit={onSubmit} noValidate>
              {/* TOPICS */}
              <div className="topics" role="group" aria-label="Topic">
                {topics.map(t => (
                  <button
                    key={t.v}
                    type="button"
                    className={"topic" + (topic === t.v ? " is-active" : "")}
                    onClick={() => setTopic(t.v)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Hints */}
              <ul className="hints" aria-live="polite">
                {hints.map((h, i) => <li key={i}>{h}</li>)}
              </ul>

              {/* Fields */}
              <div className="row">
                <label>
                  <span>Full name*</span>
                  <input name="name" required />
                </label>
                <label>
                  <span>Email*</span>
                  <input name="email" type="email" required />
                </label>
              </div>

              <div className="row">
                <label>
                  <span>Phone {pref === "phone" ? "*" : "(optional)"}</span>
                  <input name="phone" required={pref === "phone"} />
                </label>
                <label>
                  <span>Organization (optional)</span>
                  <input name="org" />
                </label>
              </div>

              <label>
                <span>Message*</span>
                <textarea name="message" rows={4} placeholder="Tell us what’s going on…" required />
              </label>

              {/* Preferred contact (side-by-side) */}
              <fieldset className="prefs" role="radiogroup" aria-label="Preferred contact">
                <legend>Preferred contact</legend>
                <div className="pref-row">
                  <label className={"radio" + (pref === "email" ? " is-active" : "")}>
                    <input type="radio" name="pref" value="email" checked={pref === "email"} onChange={() => setPref("email")} />
                    <span className="ico">📧</span>Email
                  </label>
                  <label className={"radio" + (pref === "phone" ? " is-active" : "")}>
                    <input type="radio" name="pref" value="phone" checked={pref === "phone"} onChange={() => setPref("phone")} />
                    <span className="ico">📞</span>Phone
                  </label>
                </div>
              </fieldset>

              {/* Consent */}
              <label className="consent">
                <input type="checkbox" name="consent" /> I consent to being contacted about this request.
              </label>

              <div className="actions">
                <button className="btn primary" disabled={status === "sending" || !topic}>
                  {status === "sending" ? "Sending…" : "Submit"}
                </button>
                {!topic && <span className="msg warn">Pick a topic to help us route your ticket.</span>}
                {status === "ok"  && <span className="msg ok">Thanks! We’ll reply soon.</span>}
                {status === "err" && <span className="msg err">Couldn’t send. Try again.</span>}
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---- Small utilization donut used in the hero snapshot ---- */
function UtilDonut({ pct }) {
  const r = 18;
  const C = 2 * Math.PI * r;
  const dash = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const seg = (dash / 100) * C;

  const color = pct == null ? "#9CA3AF"
    : pct < 30 ? "#10B981"
    : pct < 60 ? "#84CC16"
    : pct < 80 ? "#F59E0B" : "#EF4444";

  return (
    <svg className="util-donut" width="48" height="48" viewBox="0 0 48 48" aria-label={pct == null ? "Utilization —" : `Utilization ${pct}%`}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" />
      <circle
        cx="24" cy="24" r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${seg} ${C - seg}`}
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

/* ---- Component-scoped CSS ---- */
const CSS = `
.cx-credit{--border:#d1d5db; --muted:#6b7280; color:#0b1220}

/* Hero — animated gradient (no dots/orbs) */
.cx-hero{position:relative; padding:84px 16px 68px; overflow:hidden; isolation:isolate; background:#0b1020}
.cx-hero .cx-sheen{
  position:absolute; inset:0;
  background:
    linear-gradient(120deg, rgba(37,99,235,.35), rgba(16,185,129,.22) 45%, rgba(99,102,241,.28)),
    repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 2px, transparent 2px 8px);
  background-size: 140% 140%, auto;
  animation: sheen 8s ease-in-out infinite alternate;
  opacity:.85;
}
@keyframes sheen { to { background-position: 60% 40%, 0 0; } }

.cx-hero-inner{max-width:1100px; margin:0 auto; text-align:center; position:relative; z-index:1}
.cx-hero-inner h1{margin:0 0 8px; font-size:42px; color:#fff}
.cx-hero-inner p{margin:0 0 16px; color:#dbeafe}

/* Score snapshot card */
.score-snap{
  margin:12px auto 8px; max-width:680px;
  background:#ffffff; border:1px solid var(--border); border-radius:16px;
  box-shadow:0 18px 40px rgba(0,0,0,.18);
  display:grid; grid-template-columns:1fr 1px 1fr; align-items:center;
  padding:12px;
}
.ss-left{display:grid; gap:4px; text-align:left; padding:6px 10px}
.ss-k{color:#374151; font-size:12px}
.ss-v{font-weight:900; font-size:26px}
.ss-suffix{font-weight:700; color:#6b7280; margin-left:2px; font-size:14px}
.ss-band{font-weight:800}
.ss-mid{width:1px; height:46px; background:#e5e7eb; justify-self:center}
.ss-right{display:grid; grid-template-columns:48px 1fr; align-items:center; gap:10px; padding:6px 10px}
.util-donut{grid-row:1 / span 2}
.ss-util-text{font-weight:800}
.ss-route{display:flex; align-items:center; gap:6px; color:#111827; font-weight:800; margin-top:2px}
.ss-route .flag{font-size:18px}
.ss-route .arrow{opacity:.75}
@media(max-width:560px){
  .score-snap{grid-template-columns:1fr; gap:10px}
  .ss-mid{display:none}
  .ss-right{grid-template-columns:48px auto}
}

/* Trust chips */
.cx-chips{display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:14px}
.chip{backdrop-filter:blur(8px); background:rgba(255,255,255,.08); color:#e5e7eb; border:1px solid rgba(255,255,255,.18); padding:8px 12px; border-radius:999px; font-weight:700}
.chip i{margin-right:6px}

/* Body */
.cx-wrap{max-width:1100px; margin:0 auto; padding:16px}
.cx-grid{display:grid; grid-template-columns:360px 1fr; gap:16px; align-items:start}
@media(max-width:980px){.cx-grid{grid-template-columns:1fr}}

/* Cards */
.card{background:#fff; border:1px solid var(--border); border-radius:14px; box-shadow:0 10px 24px rgba(0,0,0,.08); padding:14px}
.card h3{margin:4px 0 10px}
.elevate{box-shadow:0 20px 50px rgba(37,99,235,.16), 0 4px 14px rgba(0,0,0,.08)}

/* Info card */
.bullets{margin:8px 0 12px; padding-left:0; list-style:none; display:grid; gap:6px}
.bullets li{position:relative; padding-left:22px}
.bullets li::before{
  content:"✓"; position:absolute; left:0; top:0; color:#10b981; font-weight:900;
}
.contact-block{display:grid; gap:6px; margin:10px 0}
.contact-block i{margin-right:8px}
.contact-block a{text-decoration:none; color:#111827}
.mini{color:#6b7280; font-size:13px}
.note{font-size:13px; color:#374151; background:#f8fafc; border:1px dashed #cbd5e1; padding:8px 10px; border-radius:10px}

/* Form */
.topics{display:flex; flex-wrap:wrap; gap:8px; margin:2px 0 8px}
.topic{border:1px solid var(--border); background:#fff; padding:8px 10px; border-radius:999px; cursor:pointer; font-weight:700}
.topic.is-active{border-color:#a7f3d0; background:#f0fdf4; color:#065f46}
.hints{margin:0 0 6px; padding-left:16px; color:#374151; font-size:13px}
.row{display:grid; grid-template-columns:1fr 1fr; gap:10px}
@media(max-width:680px){.row{grid-template-columns:1fr}}
label{display:grid; gap:6px; margin-bottom:10px}
input, textarea{border:1px solid var(--border); border-radius:10px; padding:10px 12px; font:inherit; background:#fff; color:#0b1220}
input:focus, textarea:focus{outline:none; border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.35)}

/* Preferred contact (side-by-side radios) */
.prefs{border:none; margin:6px 0 0; padding:0}
.prefs legend{font-weight:800; margin-bottom:6px}
.pref-row{display:flex; gap:10px; flex-wrap:wrap}
.radio{display:inline-flex; align-items:center; gap:8px; border:1px solid var(--border); padding:8px 10px; border-radius:999px; cursor:pointer; font-weight:800}
.radio input{margin:0}
.radio .ico{font-size:16px}
.radio.is-active{border-color:#bfdbfe; background:#eff6ff; color:#1e40af}

.consent{display:flex; align-items:center; gap:8px; margin-top:10px}
.actions{display:flex; align-items:center; gap:10px; margin-top:10px}
.btn{border:1px solid var(--border); background:#fff; padding:10px 14px; border-radius:10px; cursor:pointer; font-weight:800}
.btn.primary{background:#2563eb; color:#fff; border-color:#2563eb}
.btn[disabled]{opacity:.75; cursor:not-allowed}
.msg{font-size:14px}
.msg.ok{color:#10b981}
.msg.err{color:#ef4444}
.msg.warn{color:#f59e0b}
`;
