import React, { useEffect, useState } from "react";

export default function Terms() {
  const UPDATED = "2025-01-01";
  const [active, setActive] = useState("");

  const sections = [
    { id: "use",        title: "Use of Service" },
    { id: "accounts",   title: "Accounts & Security" },
    { id: "eligibility",title: "Eligibility" },
    { id: "credit",     title: "Credit Score & Banking Information" },
    { id: "acceptable", title: "Acceptable Use" },
    { id: "thirdparty", title: "Third-Party Services (Bureaus, Plaid/OAuth)" },
    { id: "fees",       title: "Fees & Billing" },
    { id: "disclaimer", title: "Disclaimers & Limitation of Liability" },
    { id: "termination",title: "Termination" },
    { id: "changes",    title: "Changes to These Terms" },
    { id: "law",        title: "Governing Law & Contact" },
  ];

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
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
          <h1>Terms &amp; Conditions</h1>
          <div className="muted">Last updated: <span className="chip">{UPDATED}</span></div>
        </div>
      </header>

      {/* Body */}
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
            <div className="toc-note">
              Questions? <a href="mailto:Support@synergyresourcesgrp.com">Support@synergyresourcesgrp.com</a>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <article className="lx-body">
          <div className="card">
            <p className="lead">
              By accessing or using this application (the “Service”), you agree to these Terms and
              any policies referenced here. If you do not agree, do not use the Service.
            </p>

            <h2 id="use">Use of Service</h2>
            <p>
              You may use the Service only for lawful purposes and in accordance with applicable
              regulations. You will not attempt to access data you are not authorized to view or
              interfere with Service operation.
            </p>

            <h2 id="accounts">Accounts &amp; Security</h2>
            <p>
              You’re responsible for maintaining the confidentiality of your credentials and for all
              activity under your account. Notify us immediately of any unauthorized use. We may
              require MFA or revoke access to protect users.
            </p>

            <h2 id="eligibility">Eligibility</h2>
            <p>
              You represent that you are at least the age of majority in your jurisdiction and have
              authority to accept these Terms on behalf of yourself or your organization.
            </p>

            <h2 id="credit">Credit Score &amp; Banking Information</h2>
            <ul>
              <li>
                <strong>Informational only.</strong> Score displays and banking signals are for
                educational/institutional decision support and may differ from lender models.
              </li>
              <li>
                <strong>No hard pulls.</strong> Viewing your score here uses soft inquiries and
                does not impact your credit.
              </li>
              <li>
                <strong>Bank connections.</strong> When you link a bank, we use approved providers
                (e.g., OAuth/Plaid). We never receive your bank credentials.
              </li>
            </ul>

            <h2 id="acceptable">Acceptable Use</h2>
            <ul>
              <li>No reverse engineering, scraping, or rate-limiting circumvention.</li>
              <li>No misuse of personal data or violation of applicable privacy laws.</li>
              <li>No attempts to introduce malware or disrupt Service integrity.</li>
            </ul>

            <h2 id="thirdparty">Third-Party Services (Bureaus, Plaid/OAuth)</h2>
            <p>
              We may rely on third-party providers for data access, analytics, delivery, and
              communications. Your use may be subject to their terms. We are not responsible for
              their content or practices.
            </p>

            <h2 id="fees">Fees &amp; Billing</h2>
            <p>
              If your plan includes paid features, you agree to pay applicable fees and taxes.
              Fees are non-refundable except as required by law or expressly stated otherwise.
            </p>

            <h2 id="disclaimer">Disclaimers &amp; Limitation of Liability</h2>
            <p>
              THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE FULLEST EXTENT PERMITTED
              BY LAW, WE DISCLAIM ALL WARRANTIES AND WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
            </p>

            <h2 id="termination">Termination</h2>
            <p>
              We may suspend or terminate access if you violate these Terms or to protect the
              Service. You may stop using the Service at any time.
            </p>

            <h2 id="changes">Changes to These Terms</h2>
            <p>
              We may update these Terms. Material changes will be posted in-app. Continued use after
              changes means you accept the updated Terms.
            </p>

            <h2 id="law">Governing Law &amp; Contact</h2>
            <p>
              These Terms are governed by U.S. law (without regard to conflicts of law rules).
              Contact: <a href="mailto:Support@synergyresourcesgrp.com">Support@synergyresourcesgrp.com</a> • (848) 334-8460
            </p>

            <div className="foot-cta">
              <a className="btn ghost" href="/privacy">View Privacy Policy</a>
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
.lx-toc{position:relative}
.lx-toc .card{position:sticky; top:76px}
.toc-title{font-weight:900; margin-bottom:8px}
.lx-toc ul{list-style:none; margin:0; padding:0; display:grid; gap:6px}
.lx-toc a{display:block; padding:6px 8px; border-radius:8px; text-decoration:none; color:#111827; border:1px solid transparent}
.lx-toc a:hover{background:#f8fafc; border-color:#e5e7eb}
.lx-toc a.is-active{background:#eef7ff; border-color:#bfdbfe; color:#1d4ed8}
.toc-note{margin-top:10px; font-size:13px; color:var(--muted)}

/* body */
.lx-body .lead{font-size:15px; color:#374151}
.lx-body h2{margin:14px 0 6px; font-size:20px}
.lx-body p, .lx-body li{color:#374151}
.foot-cta{display:flex; gap:10px; margin-top:12px; flex-wrap:wrap}
.btn{border:1px solid var(--border); background:#fff; padding:10px 14px; border-radius:10px; cursor:pointer; font-weight:800; text-decoration:none; color:#111827}
.btn.primary{background:#2563eb; color:#fff; border-color:#2563eb}
.btn.ghost:hover{background:#f8fafc}
`;
