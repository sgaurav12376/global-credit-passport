import React, { useEffect, useState } from "react";

export default function Privacy() {
  const UPDATED = "2025-01-01";
  const [active, setActive] = useState("");

  const sections = [
    { id: "collect",   title: "Data We Collect" },
    { id: "sources",   title: "Sources of Data" },
    { id: "use",       title: "How We Use Data" },
    { id: "share",     title: "Sharing & Disclosure" },
    { id: "retention", title: "Data Retention" },
    { id: "security",  title: "Security" },
    { id: "transfer",  title: "International Transfers" },
    { id: "rights",    title: "Your Rights & Choices" },
    { id: "children",  title: "Children’s Privacy" },
    { id: "contact",   title: "Contact" },
  ];

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.25, 0.6] }
    );
    document.querySelectorAll(".lx-body h2[id]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="legalx">
      <style>{CSS}</style>

      {/* Hero */}
      <header className="lx-hero">
        <div className="lx-sheen" aria-hidden />
        <div className="lx-inner">
          <h1>Privacy Policy</h1>
          <div className="muted">Last updated: <span className="chip">{UPDATED}</span></div>
        </div>
      </header>

      <section className="lx-wrap">
        {/* TOC */}
        <aside className="lx-toc">
          <nav className="card">
            <div className="toc-title">On this page</div>
            <ul>
              {sections.map((s) => (
                <li key={s.id}>
                  <a className={active === s.id ? "is-active" : ""} href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ul>
            <div className="toc-note">We don’t sell personal data.</div>
          </nav>
        </aside>

        {/* Content */}
        <article className="lx-body">
          <div className="card">
            {/* At-a-glance summary */}
            <div className="summary-grid">
              <div className="sum">
                <div className="k">Sales of data</div>
                <div className="v ok">No</div>
              </div>
              <div className="sum">
                <div className="k">Bank credentials stored</div>
                <div className="v ok">No</div>
              </div>
              <div className="sum">
                <div className="k">Security</div>
                <div className="v">Encryption • RBAC • Audit</div>
              </div>
            </div>

            <h2 id="collect">Data We Collect</h2>
            <ul>
              <li><strong>Account:</strong> name, email, role, organization.</li>
              <li><strong>Usage:</strong> app interactions, device, approximate IP, cookies.</li>
              <li><strong>Financial signals:</strong> read-only score/metrics you choose to view or link (no bank credentials).</li>
              <li><strong>Support:</strong> messages and attachments you submit.</li>
            </ul>

            <h2 id="sources">Sources of Data</h2>
            <ul>
              <li><strong>You</strong> (forms, profile, support).</li>
              <li><strong>Connected banks</strong> via approved providers (e.g., OAuth/Plaid).</li>
              <li><strong>Service providers</strong> (cloud hosting, analytics, email).</li>
            </ul>

            <h2 id="use">How We Use Data</h2>
            <ul>
              <li>Operate, secure, and improve the Service.</li>
              <li>Provide score/banking insights and coaching features you request.</li>
              <li>Detect abuse and ensure compliance.</li>
              <li>Communicate important updates (you can opt-out of marketing).</li>
            </ul>

            <h2 id="share">Sharing &amp; Disclosure</h2>
            <p>
              We do not sell personal data. We share with processors under contract (cloud, email,
              analytics, customer support) only as needed to provide the Service or comply with law.
            </p>

            <h2 id="retention">Data Retention</h2>
            <p>
              We retain personal data for as long as needed to deliver the Service and for legitimate
              business or legal purposes. We apply minimization and deletion schedules where feasible.
            </p>

            <h2 id="security">Security</h2>
            <p>
              Encryption in transit/at rest, RBAC/least-privilege access, audit logging, and
              dedicated monitoring. No storage of bank credentials.
            </p>

            <h2 id="transfer">International Transfers</h2>
            <p>
              Data may be processed in the U.S. and other regions with appropriate safeguards and
              standard contractual commitments where required.
            </p>

            <h2 id="rights">Your Rights &amp; Choices</h2>
            <ul>
              <li>Access, correct, port, or delete your data (subject to verification).</li>
              <li>Opt-out of marketing messages at any time.</li>
              <li>Control cookies in your browser settings.</li>
            </ul>

            <h2 id="children">Children’s Privacy</h2>
            <p>
              The Service is not directed to children under 13 (or relevant minimum age). We do not
              knowingly collect such data. If you believe we have, contact us to delete it.
            </p>

            <h2 id="contact">Contact</h2>
            <p>
              <a href="mailto:Support@synergyresourcesgrp.com">Support@synergyresourcesgrp.com</a> • (848) 334-8460
            </p>

            <div className="foot-cta">
              <a className="btn ghost" href="/terms">View Terms</a>
              <a className="btn primary" href="/contact">Contact Support</a>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

const CSS = `
.legalx{--border:#d1d5db; --muted:#6b7280; color:#0b1220}
.lx-hero{position:relative; padding:72px 16px 56px; background:#0b1020; overflow:hidden}
.lx-sheen{position:absolute; inset:0; background:
  linear-gradient(120deg, rgba(37,99,235,.35), rgba(16,185,129,.22) 45%, rgba(99,102,241,.28)),
  repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 2px, transparent 2px 8px);
  background-size:140% 140%, auto; animation:sheen 8s ease-in-out infinite alternate; opacity:.85}
@keyframes sheen { to { background-position:60% 40%, 0 0 } }
.lx-inner{max-width:1100px; margin:0 auto; text-align:center; position:relative; z-index:1}
.lx-inner h1{margin:0 0 8px; font-size:38px; color:#fff}
.lx-inner .muted{color:#dbeafe}
.chip{display:inline-block; border:1px solid rgba(255,255,255,.35); padding:4px 10px; border-radius:999px}

/* layout */
.lx-wrap{max-width:1100px; margin:0 auto; padding:14px 16px; display:grid; grid-template-columns:280px 1fr; gap:12px}
@media(max-width:980px){.lx-wrap{grid-template-columns:1fr}}
.card{background:#fff; border:1px solid var(--border); border-radius:14px; box-shadow:0 10px 24px rgba(0,0,0,.08); padding:14px}

/* toc */
.lx-toc .card{position:sticky; top:76px}
.toc-title{font-weight:900; margin-bottom:8px}
.lx-toc ul{list-style:none; margin:0; padding:0; display:grid; gap:6px}
.lx-toc a{display:block; padding:6px 8px; border-radius:8px; text-decoration:none; color:#111827; border:1px solid transparent}
.lx-toc a:hover{background:#f8fafc; border-color:#e5e7eb}
.lx-toc a.is-active{background:#eef7ff; border-color:#bfdbfe; color:#1d4ed8}
.toc-note{margin-top:10px; font-size:13px; color:var(--muted)}

/* summary strip */
.summary-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:8px}
@media(max-width:860px){.summary-grid{grid-template-columns:1fr}}
.sum{background:#f8fafc; border:1px solid var(--border); border-radius:12px; padding:10px 12px}
.k{color:#6b7280; font-size:12px} .v{font-weight:800} .v.ok{color:#10b981}

/* body */
.lx-body h2{margin:14px 0 6px; font-size:20px}
.lx-body p, .lx-body li{color:#374151}
.foot-cta{display:flex; gap:10px; margin-top:12px; flex-wrap:wrap}
.btn{border:1px solid var(--border); background:#fff; padding:10px 14px; border-radius:10px; cursor:pointer; font-weight:800; text-decoration:none; color:#111827}
.btn.primary{background:#2563eb; color:#fff; border-color:#2563eb}
.btn.ghost:hover{background:#f8fafc}
`;
