// src/synergy_resources/credit_app/pages/dashboard/GlobalScore.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CreditGauge from "../../components/CreditGauge";

/* --- helpers --- */
const API_SCORES = "/api/data/scores"; // backend: { origin, destination }

const BANDS = [
  { name: "Poor",      min:   0 },
  { name: "Fair",      min: 580 },
  { name: "Good",      min: 670 },
  { name: "Very Good", min: 740 },
  { name: "Excellent", min: 800 },
];
const bandName = (v) => {
  let idx = 0;
  for (let i = 0; i < BANDS.length; i++) if (v >= BANDS[i].min) idx = i;
  return BANDS[idx].name;
};

const COUNTRY_NAMES = {
  IN: "India", US: "United States", GB: "United Kingdom", AE: "United Arab Emirates",
  AU: "Australia", CA: "Canada", DE: "Germany", FR: "France", SG: "Singapore", JP: "Japan",
};
const flagEmoji = (code) => {
  if (!code || code.length !== 2) return "🧭";
  const A = 0x1f1e6, a = 65;
  const c1 = A + (code[0].toUpperCase().charCodeAt(0) - a);
  const c2 = A + (code[1].toUpperCase().charCodeAt(0) - a);
  return String.fromCodePoint(c1, c2);
};

const PAGES = [
  { to: "/account-mix",          label: "Account Mix",         icon: "🧩", desc: "Composition across credit, loans & deposits" },
  { to: "/active-accounts",      label: "Active Accounts",     icon: "🏦", desc: "All linked accounts and balances" },
  { to: "/adverse-records",      label: "Adverse Records",     icon: "⚠️", desc: "Collections, write-offs, bankruptcies" },
  { to: "/alt-data",             label: "Alt-Data",            icon: "🧪", desc: "Phone, utilities & other alternative data" },
  { to: "/banking",              label: "Banking",             icon: "🏛️", desc: "Cash flow signals from bank activity" },
  { to: "/credit-length",        label: "Credit Length",       icon: "⏳", desc: "Average and oldest account age" },
  { to: "/inquiries",            label: "Inquiries",           icon: "🔎", desc: "Hard pulls in recent months" },
  { to: "/payment-history",      label: "Payment History",     icon: "💳", desc: "On-time rate & delinquencies" },
  { to: "/recent-behavior",      label: "Recent Behavior",     icon: "📈", desc: "New accounts, spend spikes, risk" },
  { to: "/score-scale",          label: "Score Scale",         icon: "📏", desc: "What 0–1000 means by band" },
  { to: "/utilization",          label: "Utilization",         icon: "📊", desc: "Credit used vs. available limit" },
  { to: "/country-normalization",label: "Country Normalization", icon: "🌍", desc: "Cross-country score alignment" },
];

// reasons for flip back
function reasonsFor(score) {
  const list = [];
  if (score < 670) {
    list.push({ text: "High utilization may be hurting your score", to: "/utilization" });
    list.push({ text: "Missed / late payments in history", to: "/payment-history" });
    list.push({ text: "Short credit history (thin file)", to: "/credit-length" });
    list.push({ text: "Recent hard inquiries or new accounts", to: "/inquiries" });
  } else if (score < 740) {
    list.push({ text: "Keep utilization under 30% for a boost", to: "/utilization" });
    list.push({ text: "Stay on-time; one late hurts a lot", to: "/payment-history" });
    list.push({ text: "Diversify account mix if needed", to: "/account-mix" });
  } else {
    list.push({ text: "Nice! Maintain low utilization", to: "/utilization" });
    list.push({ text: "Keep perfect payment history", to: "/payment-history" });
    list.push({ text: "Avoid new hard inquiries", to: "/inquiries" });
  }
  return list.slice(0, 4);
}

/* --- tiny color system for KPI tone --- */
function toneFor(score) {
  if (score >= 800) {
    return { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", shadow: "rgba(16,185,129,.18)" }; // emerald
  }
  if (score >= 670) {
    return { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", shadow: "rgba(34,197,94,.16)" }; // green
  }
  if (score >= 580) {
    return { color: "#d97706", bg: "#fffbeb", border: "#fde68a", shadow: "rgba(245,158,11,.16)" }; // amber
  }
  return { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", shadow: "rgba(239,68,68,.16)" }; // red
}
const pct = (score) => Math.max(0, Math.min(100, Math.round((Number(score) || 0) / 10)));

/* --- small flip card --- */
function FlipDial({ title, icon, score }) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped((f) => !f);
  const onKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } };

  return (
    <div className="score-tile" style={{ width: 263 }}>
      <h3 style={{ textAlign: "center", marginTop: 0 }}>{icon} {title}</h3>

      <div
        className={`flip ${flipped ? "is-flipped" : ""}`}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={`Toggle details for ${title}`}
        onClick={toggle}
        onKeyDown={onKey}
        style={{ height: 230 }}
      >
        <div className="flip-inn">
          {/* FRONT: dial */}
          <div className="flip-face flip-front">
            <CreditGauge score={score} width={240} />
            <div className="score-note" style={{ textAlign: "center" }}>
              Band: <strong>{bandName(score)}</strong>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", marginTop: 6 }}>
              Click to see why
            </div>
          </div>

          {/* BACK: brief reasons + links */}
          <div className="flip-face flip-back">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Why this score</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
              {reasonsFor(score).map((r, i) => (
                <li key={i}><Link to={r.to}>{r.text}</Link></li>
              ))}
            </ul>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: "auto" }}>
              Click to go back
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- page --- */
export default function GlobalScore() {
  // countries from Topbar/localStorage
  const [originCode, setOriginCode] = useState(localStorage.getItem("originCode") || "IN");
  const [destCode, setDestCode]     = useState(localStorage.getItem("destCode") || "US");
  useEffect(() => {
    const onRoute = () => {
      setOriginCode(localStorage.getItem("originCode") || "IN");
      setDestCode(localStorage.getItem("destCode") || "US");
    };
    window.addEventListener("countryRouteChanged", onRoute);
    return () => window.removeEventListener("countryRouteChanged", onRoute);
  }, []);

  const originName = COUNTRY_NAMES[originCode] || originCode;
  const destName   = COUNTRY_NAMES[destCode]   || destCode;
  const oFlag = flagEmoji(originCode);
  const dFlag = flagEmoji(destCode);

  // scores
  const [origin, setOrigin] = useState(680);
  const [dest,   setDest]   = useState(720);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API_SCORES);
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (!alive) return;
        if (typeof j?.origin === "number")      setOrigin(j.origin);
        if (typeof j?.destination === "number") setDest(j.destination);
      } catch { /* silent fallback */ }
    })();
    return () => { alive = false; };
  }, []);

  const combined = useMemo(() => Math.round((origin + dest) / 2), [origin, dest]);

  // persist for Topbar pill + sparkline
  useEffect(() => {
    if (!Number.isFinite(combined)) return;
    localStorage.setItem("lastGlobalScore", String(combined));
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem("scoreHistory") || "[]"); } catch {}
    if (!hist.length || hist[hist.length - 1] !== combined) {
      const next = [...hist, combined].slice(-50);
      localStorage.setItem("scoreHistory", JSON.stringify(next));
    }
  }, [combined]);

  const sortedPages = useMemo(
    () => [...PAGES].sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  // tones
  const tO = toneFor(origin);
  const tD = toneFor(dest);
  const tG = toneFor(combined);

  return (
    <section className="page">
      <div className="container">
        {/* small style block JUST for the Overview row */}
        <style>{`
          .kpi{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px;
               box-shadow:0 4px 10px rgba(0,0,0,.06);display:grid;gap:8px}
          .kpi-top{display:flex;align-items:center;justify-content:space-between}
          .kpi-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;
                    border:1px solid currentColor;font-weight:800;font-size:12px;line-height:1}
          .kpi-dot{width:7px;height:7px;border-radius:999px;background:currentColor;position:relative}
          .kpi-dot::after{content:"";position:absolute;inset:-4px;border-radius:999px;border:2px solid currentColor;opacity:.35;animation:tpulse 1.6s ease-out infinite}
          .kpi-num{font-weight:800}
          .kpi-sub{font-size:12px;color:#6b7280}
          .kpi-bar{height:8px;background:#eef2f7;border-radius:999px;overflow:hidden}
          .kpi-fill{height:100%;width:0;background:currentColor;animation:fillGrow .6s ease forwards}
          .k-accent{background:var(--k-bg);border-color:var(--k-border);box-shadow:0 8px 22px var(--k-shadow), inset 0 0 0 1px var(--k-border)}
        `}</style>

  

        {/* Header */}
        <header className="page-header" style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0 }}>Global Score</h1>
          <p className="page-sub" style={{ margin: "4px 0 0" }}>
            Cross-country normalized credit summary.
          </p>
          <div
            style={{
              display: "inline-block",
              marginTop: 6,
              fontSize: 13,
              color: "#374151",
              background: "#ffffffcc",
              border: "1px solid #d1d5db",
              padding: "6px 10px",
              borderRadius: 999,
              backdropFilter: "blur(6px)",
            }}
          >
            Normalized from <strong>{COUNTRY_NAMES[originCode] || originCode}</strong> →{" "}
            <strong>{COUNTRY_NAMES[destCode] || destCode}</strong> • Last 30 days
          </div>
        </header>

        {/* 1) Overview strip (accented KPIs) */}
        <section className="score-grid compact small" aria-label="Overview">
          {/* Origin */}
          <div
            className="kpi"
            style={{ color: tO.color }}
          >
            <div className="kpi-top">
              <h3 style={{ margin: 0 }}>{oFlag} Origin</h3>
              <span className="kpi-chip"><span className="kpi-dot" />{bandName(origin)}</span>
            </div>
            <div><span className="kpi-num">{origin}</span> / 1000</div>
            <div className="kpi-bar"><div className="kpi-fill" style={{ width: pct(origin) + "%"}} /></div>
            <div className="kpi-sub">Health relative to maximum</div>
          </div>

          {/* Destination */}
          <div
            className="kpi"
            style={{ color: tD.color }}
          >
            <div className="kpi-top">
              <h3 style={{ margin: 0 }}>{dFlag} Destination</h3>
              <span className="kpi-chip"><span className="kpi-dot" />{bandName(dest)}</span>
            </div>
            <div><span className="kpi-num">{dest}</span> / 1000</div>
            <div className="kpi-bar"><div className="kpi-fill" style={{ width: pct(dest) + "%"}} /></div>
            <div className="kpi-sub">Health relative to maximum</div>
          </div>

          {/* Global (accent) */}
          <div
            className="kpi k-accent"
            style={{
              color: tG.color,
              // inject CSS vars for accent
              ["--k-bg"]: tG.bg,
              ["--k-border"]: tG.border,
              ["--k-shadow"]: tG.shadow,
            }}
          >
            <div className="kpi-top">
              <h3 style={{ margin: 0 }}>🌐 Global</h3>
              <span className="kpi-chip"><span className="kpi-dot" />{bandName(combined)}</span>
            </div>
            <div><span className="kpi-num">{combined}</span> / 1000</div>
            <div className="kpi-bar"><div className="kpi-fill" style={{ width: pct(combined) + "%"}} /></div>
            <div className="kpi-sub">Combined performance (avg of both)</div>
          </div>
        </section>

        {/* 2) Quick modules grid */}
        <section className="hub-grid compact" role="list" style={{ marginTop: 10 }}>
          {sortedPages.map(({ to, label, desc, icon }) => (
            <Link key={to} to={to} className="hub-card slim" role="listitem" title={desc}>
              <div className="hub-icon small" aria-hidden>{icon}</div>
              <div className="hub-main">
                <div className="hub-title">{label}</div>
                <div className="hub-desc">{desc}</div>
              </div>
              <div className="hub-arrow" aria-hidden>→</div>
            </Link>
          ))}
        </section>

        {/* 3) Gauges with flip-on-click */}
        <section className="score-grid compact" style={{ marginTop: 10 }} aria-label="Scores">
          <FlipDial title="Origin Score"      icon={oFlag} score={origin} />
          <FlipDial title="Destination Score" icon={dFlag} score={dest} />
          <FlipDial title="Global Score"      icon="🌐"   score={combined} />
        </section>
      </div>
    </section>
  );
}
