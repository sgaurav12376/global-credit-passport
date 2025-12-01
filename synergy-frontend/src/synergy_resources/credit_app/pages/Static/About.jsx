import { useEffect, useState } from "react";

/**
 * About page (modern, credit/banking themed)
 * - Mount under your app layout (Topbar/Sidebar/Footer live outside this component)
 * - Styles are component-scoped via <style>
 * - Includes: hero snapshot, mission/values, highlights, product links,
 *   timeline, team, trust badges, FAQ, and CTA
 */
export default function About() {
  // Snapshot: score, utilization, route (origin→dest)
  const [score, setScore] = useState(() => {
    const v = Number(localStorage.getItem("lastGlobalScore"));
    return Number.isFinite(v) ? v : null;
  });
  const [util, setUtil] = useState(null);
  const [route, setRoute] = useState({
    origin: localStorage.getItem("originCode") || "IN",
    dest:   localStorage.getItem("destCode")   || "US",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // If your API needs a leading slash, change to "/api/data/utilization"
        const r = await fetch("api/data/utilization");
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (!alive) return;
        const p = Number(j?.utilizationPercent);
        if (Number.isFinite(p)) setUtil(Math.max(0, Math.min(100, Math.round(p))));
      } catch { /* silent */ }
    })();
    return () => { alive = false; };
  }, []);

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

  return (
    <div className="aboutx">
      <style>{CSS}</style>

      {/* HERO */}
      <section className="ax-hero">
        <div className="ax-sheen" aria-hidden />
        <div className="ax-inner">
          <h1>About Us</h1>
          <p>Financial-grade tech for credit scoring, banking signals, and secure data workflows.</p>

          {/* Impact Snapshot */}
          <div className="ax-snap reveal">
            <div className="snap-left">
              <div className="sk">Global Score</div>
              <div className="sv" style={{ color: bandColor }}>
                {score == null ? "—" : score}<span className="sfx"> / 1000</span>
              </div>
              <div className="sb" style={{ color: bandColor }}>{band || "—"}</div>
            </div>
            <div className="snap-mid" />
            <div className="snap-right">
              <UtilDonut pct={util} />
              <div className="ut">{util == null ? "Util —" : `Util ${util}%`}</div>
              <div className="rt">
                <span className="flag">{flagEmoji(route.origin)}</span>
                <span className="arrow">→</span>
                <span className="flag">{flagEmoji(route.dest)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION + VALUES */}
      <section className="ax-wrap">
        <div className="ax-grid">
          <div className="card reveal">
            <h3>Our mission</h3>
            <p>
              Help institutions and end-users make fair, fast, and secure credit decisions. We unify
              credit data, normalize scores across countries, and surface banking signals—backed by
              privacy, compliance, and measurable outcomes.
            </p>
            <div className="bullets">
              <div>✅ Accuracy & transparency</div>
              <div>✅ Security-first architecture</div>
              <div>✅ Real-time analytics & coaching</div>
            </div>
          </div>

          <div className="card reveal">
            <h3>What we build</h3>
            <ul className="list">
              <li><a href="/score">Global Score normalization</a></li>
              <li><a href="/utilization">Utilization intelligence & pay-down planning</a></li>
              <li><a href="/payment-history">Payment history insights</a></li>
              <li><a href="/banking">Banking & cash-flow signals</a></li>
              <li><a href="/account-mix">Account mix & risk indicators</a></li>
              <li><a href="/country-normalization">Cross-border alignment</a></li>
            </ul>
          </div>

          <div className="card reveal">
            <h3>Security & compliance</h3>
            <p>
              Built with encryption in transit and at rest, strict data minimization, audit logging,
              and least-privilege access. We integrate with bank-approved providers and follow
              industry frameworks to keep your data safe.
            </p>
            <div className="badges">
              <span>Encryption</span><span>RBAC</span><span>Audit Logs</span><span>PII Controls</span>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS STRIP */}
      <section className="ax-high">
        <div className="high-grid">
          <div className="kpi reveal">
            <div className="k">HQ</div>
            <div className="v">New Jersey, USA</div>
          </div>
          <div className="kpi reveal">
            <div className="k">Email</div>
            <div className="v">Support@synergyresourcesgrp.com</div>
          </div>
          <div className="kpi reveal">
            <div className="k">Phone</div>
            <div className="v">(848) 334-8460</div>
          </div>
          <div className="kpi reveal">
            <div className="k">Focus</div>
            <div className="v">Credit, Banking, AI</div>
          </div>
        </div>
      </section>

      {/* PRODUCT LINKS */}
      <section className="ax-mods">
        <div className="mods-grid">
          {MODS.map(m => (
            <a key={m.to} href={m.to} className="mod reveal">
              <div className="ico">{m.ico}</div>
              <div className="mm">
                <div className="tt">{m.title}</div>
                <div className="dd">{m.desc}</div>
              </div>
              <div className="arr">→</div>
            </a>
          ))}
        </div>
      </section>

      {/* TIMELINE */}
      <section className="ax-timeline">
        <h3 className="sec-title">Our journey</h3>
        <div className="tl">
          {TIMELINE.map((t, i) => (
            <div className="tl-item reveal" key={i}>
              <div className="dot" />
              <div className="year">{t.year}</div>
              <div className="title">{t.title}</div>
              <div className="desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM */}
      <section className="ax-team">
        <h3 className="sec-title">Leadership</h3>
        <div className="team-grid">
          {TEAM.map((m) => (
            <article className="member reveal" key={m.name}>
              <div className="avatar" aria-hidden>{m.initials}</div>
              <div className="meta">
                <div className="name">{m.name}</div>
                <div className="role">{m.role}</div>
                <p className="bio">{m.bio}</p>
                {m.link && <a className="plink" href={m.link} target="_blank" rel="noreferrer">Profile →</a>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="ax-faq">
        <h3 className="sec-title">FAQ</h3>
        <div className="faq-grid">
          {FAQ.map((q, i) => (
            <details key={i} className="qa reveal">
              <summary>{q.q}</summary>
              <p>{q.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ax-cta">
        <div className="cta-card reveal">
          <div className="cta-main">
            <h3>Want to learn more?</h3>
            <p>See how score normalization and banking signals can level-up your decisions.</p>
          </div>
          <div className="cta-actions">
            <a className="btn ghost" href="/score">View Global Score</a>
            <a className="btn primary" href="/contact">Contact Support</a>
          </div>
        </div>
      </section>
    </div>
  );
}

/* Small utilization donut for the snapshot */
function UtilDonut({ pct }) {
  const r = 18;
  const C = 2 * Math.PI * r;
  const seg = pct == null ? 0 : Math.max(0, Math.min(100, pct)) / 100 * C;
  const color = pct == null ? "#9CA3AF"
    : pct < 30 ? "#10B981"
    : pct < 60 ? "#84CC16"
    : pct < 80 ? "#F59E0B" : "#EF4444";
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-label={pct == null ? "Utilization —" : `Utilization ${pct}%`}>
      <circle cx="24" cy="24" r={18} fill="none" stroke="#E5E7EB" strokeWidth="6" />
      <circle
        cx="24" cy="24" r={18} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${seg} ${C - seg}`}
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
}

/* ===== Product modules used above ===== */
const MODS = [
  { to: "/score",               ico: "🌐", title: "Global Score",        desc: "Normalized credit across countries" },
  { to: "/utilization",         ico: "📊", title: "Utilization",         desc: "Credit used vs available limit" },
  { to: "/payment-history",     ico: "💳", title: "Payment History",     desc: "On-time rate & delinquencies" },
  { to: "/banking",             ico: "🏦", title: "Banking Signals",     desc: "Cash-flow & income stability" },
  { to: "/inquiries",           ico: "🔎", title: "Inquiries",           desc: "Recent hard pulls" },
  { to: "/account-mix",         ico: "🧩", title: "Account Mix",         desc: "Mix & risk indicators" },
];

/* ===== Data you asked me to fill in (timeline + team) ===== */
const TIMELINE = [
  { year: "2019", title: "Company founded", desc: "Launched to modernize credit analytics and data flows for institutions." },
  { year: "2020", title: "Score v1 released", desc: "First normalized score with transparent bands and audit notes." },
  { year: "2021", title: "Banking Signals", desc: "Added cash-flow health, income stability, and anomaly detection." },
  { year: "2022", title: "Cross-border scoring", desc: "Origin→Destination normalization launched for multi-country users." },
  { year: "2023", title: "Partner APIs", desc: "Secure, versioned endpoints for read-only analytics and event webhooks." },
  { year: "2024", title: "Coaching engine", desc: "Real-time utilization planning and score improvement tips." },
  { year: "2025", title: "Institutional rollout", desc: "Enterprise features: RBAC, SSO, data retention controls, and SIEM hooks." },
];

const TEAM = [
  { name: "Arjun Sharma",  role: "Head of Credit Analytics",   initials: "AS", bio: "Leads score methodology, model monitoring, and regulatory alignment across markets.", link: "" },
  { name: "Jaya Patel",    role: "Director of Banking Signals", initials: "JP", bio: "Owns cash-flow analytics, anomaly detection, and partner data integrations.", link: "" },
  { name: "Monica Lee",    role: "Security & Compliance Lead", initials: "ML", bio: "Drives encryption, RBAC, audit logging, and PII governance across systems.", link: "" },
  { name: "Rafael Gomez",  role: "Product & UX",               initials: "RG", bio: "Focuses on customer experience: dashboards, accessibility, and mobile flows.", link: "" },
];

const FAQ = [
  { q: "Do you store my bank credentials?", a: "No. We use approved providers (e.g., OAuth/Plaid) so credentials are never shared with us." },
  { q: "Is my score impacted when I view it here?", a: "No. Viewing your score in the app is a soft check and does not impact your credit." },
  { q: "How do you handle cross-country normalization?", a: "We map local bureau signals to a unified range with banding, documented assumptions, and versioned models." },
  { q: "Can institutions integrate directly?", a: "Yes—use our partner endpoints for read-only analytics, coaching recommendations, and event webhooks." },
];

/* ===== Component-scoped CSS ===== */
const CSS = `
.aboutx{--border:#d1d5db; --muted:#6b7280; color:#0b1220}
.reveal{animation:reveal .5s ease both; transform-origin:50% 60%}
@keyframes reveal{from{opacity:0; transform:translateY(8px) scale(.995)}}

/* Hero (animated sheen) */
.ax-hero{position:relative; padding:84px 16px 68px; background:#0b1020; overflow:hidden; isolation:isolate}
.ax-sheen{
  position:absolute; inset:0;
  background:
    linear-gradient(120deg, rgba(37,99,235,.35), rgba(16,185,129,.22) 45%, rgba(99,102,241,.28)),
    repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 2px, transparent 2px 8px);
  background-size:140% 140%, auto;
  animation:sheen 8s ease-in-out infinite alternate;
  opacity:.85;
}
@keyframes sheen { to { background-position:60% 40%, 0 0; } }
.ax-inner{max-width:1100px; margin:0 auto; text-align:center; position:relative; z-index:1}
.ax-inner h1{margin:0 0 8px; font-size:42px; color:#fff}
.ax-inner p{margin:0 0 16px; color:#dbeafe}

/* Snapshot card */
.ax-snap{
  margin:12px auto 8px; max-width:680px;
  background:#fff; border:1px solid var(--border); border-radius:16px;
  box-shadow:0 18px 40px rgba(0,0,0,.18);
  display:grid; grid-template-columns:1fr 1px 1fr; align-items:center; padding:12px;
}
.snap-left{display:grid; gap:4px; text-align:left; padding:6px 10px}
.sk{color:#374151; font-size:12px}
.sv{font-weight:900; font-size:26px}
.sfx{font-weight:700; color:#6b7280; margin-left:2px; font-size:14px}
.sb{font-weight:800}
.snap-mid{width:1px; height:46px; background:#e5e7eb; justify-self:center}
.snap-right{display:grid; grid-template-columns:48px 1fr; align-items:center; gap:10px; padding:6px 10px}
.ut{font-weight:800}
.rt{display:flex; align-items:center; gap:6px; font-weight:800; margin-top:2px}
.rt .flag{font-size:18px} .rt .arrow{opacity:.75}
@media(max-width:560px){
  .ax-snap{grid-template-columns:1fr; gap:10px}
  .snap-mid{display:none}
  .snap-right{grid-template-columns:48px auto}
}

/* Mission/Values grid */
.ax-wrap{max-width:1100px; margin:0 auto; padding:16px}
.ax-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:12px}
@media(max-width:980px){.ax-grid{grid-template-columns:1fr}}
.card{background:#fff; border:1px solid var(--border); border-radius:14px; box-shadow:0 10px 24px rgba(0,0,0,.08); padding:14px}
.card h3{margin:4px 0 10px}
.bullets{display:grid; gap:6px; margin-top:8px}
.list{margin:0; padding-left:18px}
.badges{display:flex; flex-wrap:wrap; gap:8px; margin-top:8px}
.badges span{border:1px solid var(--border); background:#f8fafc; border-radius:999px; padding:6px 10px; font-weight:800; font-size:12px}

/* Highlight KPIs */
.ax-high{max-width:1100px; margin:0 auto; padding:4px 16px 0}
.high-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:10px}
.kpi{background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 4px 10px rgba(0,0,0,.06)}
.k{color:#6b7280; font-size:12px} .v{font-weight:800}
@media(max-width:980px){.high-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.high-grid{grid-template-columns:1fr}}

/* Product links */
.ax-mods{max-width:1100px; margin:0 auto; padding:12px 16px}
.mods-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:10px}
@media(max-width:1100px){.mods-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:660px){.mods-grid{grid-template-columns:1fr}}
.mod{
  display:flex; align-items:center; gap:10px; text-decoration:none; color:#111827;
  background:#fff; border:1px solid var(--border); border-radius:12px; padding:10px 12px;
  box-shadow:0 4px 10px rgba(0,0,0,.06); transition:.15s; min-height:64px;
}
.mod:hover{transform:translateY(-2px); box-shadow:0 10px 20px rgba(0,0,0,.10); border-color:#c9d3e0; background:#f9fbff}
.ico{width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:#eef2f7; border:1px solid #e5e7eb; font-size:18px}
.mm{flex:1; min-width:0}
.tt{font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.dd{font-size:12px; color:#374151; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.arr{font-weight:900; opacity:.5}

/* Timeline */
.ax-timeline{max-width:1100px; margin:0 auto; padding:6px 16px 10px}
.sec-title{margin:6px 0 10px; font-size:20px; font-weight:900}
.tl{position:relative; border-left:2px dashed #e5e7eb; margin-left:8px; padding-left:16px; display:grid; gap:10px}
.tl-item{position:relative; background:#fff; border:1px solid var(--border); border-radius:12px; padding:10px 12px; box-shadow:0 4px 10px rgba(0,0,0,.06)}
.tl-item .dot{position:absolute; left:-22px; top:14px; width:10px; height:10px; background:#10b981; border-radius:999px; box-shadow:0 0 0 4px rgba(16,185,129,.18)}
.tl-item .year{font-weight:900; font-size:12px; color:#6b7280}
.tl-item .title{font-weight:900}
.tl-item .desc{color:#374151}

/* Team */
.ax-team{max-width:1100px; margin:0 auto; padding:6px 16px 10px}
.team-grid{display:grid; grid-template-columns:repeat(2,1fr); gap:10px}
@media(max-width:860px){.team-grid{grid-template-columns:1fr}}
.member{display:flex; gap:12px; background:#fff; border:1px solid var(--border); border-radius:12px; padding:12px; box-shadow:0 4px 10px rgba(0,0,0,.06)}
.avatar{width:48px; height:48px; border-radius:12px; display:grid; place-items:center; background:#2563eb; color:#fff; font-weight:900}
.meta .name{font-weight:900}
.meta .role{color:#374151; font-size:14px; margin-bottom:4px}
.bio{margin:0}
.plink{display:inline-block; margin-top:6px; text-decoration:none; font-weight:800; color:#2563eb}

/* FAQ */
.ax-faq{max-width:1100px; margin:0 auto; padding:6px 16px 10px}
.faq-grid{display:grid; grid-template-columns:repeat(2,1fr); gap:10px}
@media(max-width:860px){.faq-grid{grid-template-columns:1fr}}
.qa{background:#fff; border:1px solid var(--border); border-radius:12px; padding:10px 12px; box-shadow:0 4px 10px rgba(0,0,0,.06)}
.qa summary{cursor:pointer; font-weight:900}
.qa p{color:#374151}

/* CTA */
.ax-cta{max-width:1100px; margin:0 auto; padding:10px 16px 20px}
.cta-card{
  background:#fff; border:1px solid var(--border); border-radius:16px; box-shadow:0 14px 32px rgba(0,0,0,.10);
  padding:14px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
}
.btn{border:1px solid var(--border); background:#fff; padding:10px 14px; border-radius:10px; cursor:pointer; font-weight:800; text-decoration:none; color:#111827}
.btn.primary{background:#2563eb; color:#fff; border-color:#2563eb}
.btn.ghost:hover{background:#f8fafc}
`;
