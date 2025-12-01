// src/synergy_resources/credit_app/pages/dashboard/GlobalScore.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* =========================
   (UNCHANGED) Embedded CreditGauge + FlipDial (keep original dial design)
   ========================= */
function CreditGauge({ score = 680, width = 260, duration = 700, zeroAt = "left", size = "md" }) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const target = clamp(score, 0, 1000);

  const [anim, setAnim] = useState(target);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const fromRef = useRef(target);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = 0;
    fromRef.current = anim;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const v = fromRef.current + (target - fromRef.current) * ease(t);
      setAnim(v);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  const W = width;
  const H = Math.round(W * 0.6);
  const cx = W / 2;
  const cy = H * 0.98;
  const r = Math.min(W, H) * 0.74;

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  const tickAngle = (v) => (zeroAt === "left" ? Math.PI * (1 - v / 1000) : Math.PI * (v / 1000));
  const ticks = Array.from({ length: 11 }, (_, i) => i * 100);

  const isSm = size === "sm";
  const LABEL_OFFSET = isSm ? 1.06 : 1.09;
  const EDGE_EXTRA = 0.05;
  const EDGE_NUDGE = 0.02;
  const labelAt = [0, 250, 500, 750, 1000];
  const labelFont = isSm ? 10 : 12;

  const s = Math.max(0, Math.min(1000, Math.round(anim)));
  const band =
    s >= 800
      ? { label: "Excellent", color: "#3B82F6" }
      : s >= 740
      ? { label: "Very Good", color: "#10B981" }
      : s >= 670
      ? { label: "Good", color: "#84CC16" }
      : s >= 580
      ? { label: "Fair", color: "#F59E0B" }
      : { label: "Poor", color: "#EF4444" };

  const angle = zeroAt === "left" ? -90 + (anim / 1000) * 180 : 90 - (anim / 1000) * 180;
  const needleLen = r * 0.84;

  const safeAnim = anim >= 1000 ? 999.5 : anim;
  const dash = `${safeAnim} ${1000 - safeAnim}`;
  const dashOffset = zeroAt === "left" ? 0 : 1000 - safeAnim;

  return (
    <div className={`gauge ${isSm ? "sm" : ""}`} style={{ width: W }}>
      <svg viewBox={`0 0 ${280} ${143}`} width={280} height={143} aria-label={`Score ${s} of 1000`}>
        <path d={arcPath} fill="none" stroke="#E5E7EB" strokeWidth={isSm ? 10 : 12} />
        <path d={arcPath} fill="none" stroke="#CBD5E1" strokeWidth={isSm ? 2.5 : 3} />
        <path
          d={arcPath}
          fill="none"
          stroke={band.color}
          strokeWidth={isSm ? 8.5 : 10}
          strokeLinecap="butt"
          pathLength="1000"
          strokeDasharray={dash}
          strokeDashoffset={dashOffset}
        />
        {ticks.map((v) => {
          const a = tickAngle(v);
          const inner = r * 0.885, outer = r * 0.985;
          const x1 = cx + inner * Math.cos(a), y1 = cy - inner * Math.sin(a);
          const x2 = cx + outer * Math.cos(a), y2 = cy - outer * Math.sin(a);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9CA3AF" />;
        })}
        {labelAt.map((v) => {
  let a = tickAngle(v);
  const isEdge = v === 0 || v === 1000;
  if (isEdge) a += v === 0 ? EDGE_NUDGE : -EDGE_NUDGE;

  const rr = r * (LABEL_OFFSET + (isEdge ? EDGE_EXTRA : 0));
  let x = cx + rr * Math.cos(a);
  const y = cy - rr * Math.sin(a);

  // ✅ Hard-code x only for the starting 0 label (keep others dynamic)
  if (v === 0) x = 4.9388068397936138;

  return (
    <text key={v} x={x} y={y} fontSize={labelFont} textAnchor="middle">
      {v}
    </text>
  );
})}

        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - needleLen} stroke={band.color} strokeWidth={isSm ? 2.5 : 3} />
          <circle cx={cx} cy={cy} r={isSm ? 6.5 : 8} fill="#111827" stroke="#fff" strokeWidth="2" />
        </g>
      </svg>
      <div className="gauge-footer">
        <div className="gauge-band" style={{ color: band.color }}>{band.label}</div>
        <div className="gauge-score">{s} <span>/ 1000</span></div>
      </div>
    </div>
  );
}

const API_SCORES = "/api/data/scores";
const BANDS = [
  { name: "Poor", min: 0 },
  { name: "Fair", min: 580 },
  { name: "Good", min: 670 },
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
const pct = (score) => Math.max(0, Math.min(100, Math.round((Number(score) || 0) / 10)));

/* (UNCHANGED) FlipDial using original design/behavior */
function FlipDial({ score }) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped((f) => !f);
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  };
  return (
    <div className="score-tile" style={{ width: 263 }} title="Click or hover to see why">
      <div
        className={`flip ${flipped ? "is-flipped" : ""}`}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label="Flip for reasons and quick links"
        onClick={toggle}
        onKeyDown={onKey}
        style={{ height: 230 }}
      >
        <div className="flip-inn">
          <div className="flip-face flip-front">
            <CreditGauge score={score} width={240} />
            <div className="score-note" style={{ textAlign: "center" }}>
              Band: <strong>{bandName(score)}</strong>
            </div>
          </div>
          <div className="flip-face flip-back">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Why this score</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
              {reasonsFor(score).map((r, i) => (
                <li key={i}><Link to={r.to}>{r.text}</Link></li>
              ))}
            </ul>
            <div className="back-note">Tap again to go back</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Small helpers
   ========================= */
function toneFor(score) {
  if (score >= 800) return { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", shadow: "rgba(16,185,129,.18)" };
  if (score >= 670) return { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", shadow: "rgba(34,197,94,.16)" };
  if (score >= 580) return { color: "#d97706", bg: "#fffbeb", border: "#fde68a", shadow: "rgba(245,158,11,.16)" };
  return { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", shadow: "rgba(239,68,68,.16)" };
}
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

/* ============= Sparkline (trend) ============= */
function Sparkline({ data = [] }) {
  if (!data.length) return null;
  const W = 120, H = 34, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const dx = (W - pad * 2) / Math.max(1, data.length - 1);
  const scaleY = (v) => (max === min ? H / 2 : H - pad - ((v - min) / (max - min)) * (H - pad * 2));
  const d = data.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * dx} ${scaleY(v)}`).join(" ");
  const last = data[data.length - 1] ?? 0;
  const prev = data[data.length - 2] ?? last;
  const dir = last >= prev ? "▲" : "▼";
  const tone = last >= prev ? "#16a34a" : "#dc2626";
  return (
    <div className="spark">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <path d={d} fill="none" stroke="#60a5fa" strokeWidth="2" />
      </svg>
      <div className="spark-meta" style={{ color: tone }}>{dir} {last}</div>
    </div>
  );
}

/* ============= Coach strip ============= */
function Coach({ origin, dest, combined }) {
  const map = new Map();
  [origin, dest, combined].flatMap(reasonsFor).forEach(({ text, to }) => { if (!map.has(text)) map.set(text, to); });
  const items = [...map.entries()].slice(0, 6);
  return (
    <div className="coach">
      <div className="coach-title">Coach</div>
      <div className="coach-chips">
        {items.map(([text, to]) => (
          <Link key={text} to={to} className="coach-chip" title="Go to detail">
            <span className="dot" /> {text}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ============= Factors (unchanged style) ============= */
function Factors({ score }) {
  const fx = [
    { k: "Payment history", to: "/payment-history", hint: "On-time rate & delinquencies", icon: "💳",
      status: score >= 740 ? "positive" : score >= 670 ? "neutral" : "negative" },
    { k: "Utilization", to: "/utilization", hint: "Credit used vs. limits", icon: "📊",
      status: score >= 670 ? "positive" : score >= 580 ? "neutral" : "negative" },
    { k: "Credit age", to: "/credit-length", hint: "Average & oldest account", icon: "⏳",
      status: score >= 670 ? "positive" : "neutral" },
    { k: "Inquiries", to: "/inquiries", hint: "Hard pulls recently", icon: "🔎",
      status: score >= 740 ? "positive" : score >= 670 ? "neutral" : "negative" },
    { k: "Account mix", to: "/account-mix", hint: "Installment vs revolving", icon: "🧩",
      status: score >= 670 ? "positive" : "neutral" },
  ];
  return (
    <div className="factors-grid">
      {fx.map((f) => (
        <Link key={f.k} to={f.to} className={`factor ${f.status}`}>
          <div className="f-ico">{f.icon}</div>
          <div className="f-main">
            <div className="f-k">{f.k}</div>
            <div className="f-h">{f.hint}</div>
          </div>
          <div className="f-badge">{f.status === "positive" ? "Good" : f.status === "neutral" ? "OK" : "Action"}</div>
        </Link>
      ))}
    </div>
  );
}

/* =========================
   GlobalScore (page) — reorganized but keeping original dial
   ========================= */
export default function GlobalScore() {
  const CSS = `
  .container{max-width:1100px;margin:0 auto;padding:0 10px}

  .page-header{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;justify-content:space-between;margin-bottom:8px}
  .meta{display:inline-block;font-size:13px;color:#374151;background:#ffffffcc;border:1px solid #d1d5db;padding:6px 10px;border-radius:999px;backdrop-filter:blur(6px)}
  .spark{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:6px 8px}
  .spark-meta{font-weight:800;font-size:12px}

  .welcome{display:flex;gap:10px;align-items:flex-start;background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:10px 12px;margin:8px 0}
  .welcome .w-title{font-weight:900}
  .welcome .w-dismiss{margin-left:auto;border:1px solid #c7d2fe;background:#fff;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer}

  .overview{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;box-shadow:0 4px 10px rgba(0,0,0,.06);margin:10px 0}
  .overview p{margin:6px 0}

  .callouts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}
  @media(max-width:980px){.callouts{grid-template-columns:1fr}}
  .callout{border:1px solid transparent;border-radius:12px;padding:12px}
  .callout-title{font-weight:900}
  .callout-score{font-size:18px;margin:6px 0}
  .callout-sub{font-size:12px;color:#374151}

  .score-grid{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px}
  .score-tile{background:#fff;padding:12px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.08);text-align:center;width:290px}
  .flip{position:relative;perspective:900px;border-radius:10px;cursor:pointer;user-select:none}
  .flip-inn{position:relative;width:100%;height:100%;transition:transform .45s cubic-bezier(.2,.8,.2,1);transform-style:preserve-3d}
  .flip.is-flipped .flip-inn{transform:rotateY(180deg)}
  .flip:hover .flip-inn{transform:rotateY(180deg)}
  .flip-face{position:absolute;inset:0;backface-visibility:hidden;display:grid;align-content:start}
  .flip-back{transform:rotateY(180deg);background:#fff;border:1px solid #d1d5db;border-radius:10px;padding:10px 12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .back-note{font-size:12px;color:#6b7280;margin-top:auto}

  .gauge{text-align:center}
  .gauge-footer{margin-top:6px;font-weight:700}
  .gauge-band{font-size:14px}
  .gauge-score{font-size:18px}

  .factors-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:12px}
  @media(max-width:1100px){.factors-grid{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:680px){.factors-grid{grid-template-columns:1fr}}
  .factor{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px;text-decoration:none;color:#111827;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .factor .f-ico{width:28px;height:28px;border-radius:8px;background:#eef2f7;border:1px solid #e5e7eb;display:grid;place-items:center;font-size:16px}
  .factor .f-main{flex:1;min-width:0}
  .factor .f-k{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .factor .f-h{font-size:12px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .factor .f-badge{font-weight:900;font-size:12px;border:1px solid #d1d5db;border-radius:999px;padding:2px 8px}
  .factor.positive .f-badge{color:#059669;border-color:#a7f3d0;background:#ecfdf5}
  .factor.neutral .f-badge{color:#6b7280;background:#f8fafc}
  .factor.negative .f-badge{color:#b91c1c;border-color:#fecaca;background:#fef2f2}

  .groups{display:grid;gap:10px;margin:12px 0}
  .group{background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .group-h{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e5e7eb}
  .group-title{font-weight:900}
  .group-body{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:10px 12px}
  .hub-card{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;text-decoration:none;color:#111827;transition:transform .15s,box-shadow .15s,border-color .15s,background .15s}
  .hub-card:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(0,0,0,.1);border-color:#c9d3e0;background:#f9fbff}
  .hub-icon{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:#eef2f7;border:1px solid #e5e7eb;font-size:16px;flex:0 0 auto}
  .hub-main{flex:1;min-width:0}
  .hub-title{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hub-desc{font-size:12px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .badge{min-width:18px;height:18px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;display:grid;place-items:center;font-weight:800;padding:0 4px}

  .coach{display:grid;gap:8px;margin-top:10px}
  .coach-title{font-weight:900}
  .coach-chips{display:flex;flex-wrap:wrap;gap:8px}
  .coach-chip{display:inline-flex;align-items:center;gap:8px;border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:8px 10px;text-decoration:none;color:#111827;font-weight:700}
  .coach-chip .dot{width:8px;height:8px;border-radius:999px;background:#2563eb}
  .coach-chip:hover{background:#f8fbff;border-color:#c9d3e0}

  .how{margin-top:12px}
  .how-title{font-weight:900;margin-bottom:6px}
  .steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  @media(max-width:980px){.steps{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.steps{grid-template-columns:1fr}}
  .step{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06);display:grid;gap:6px}
  .step .s-ico{font-size:18px}
  `;

  const [originCode, setOriginCode] = useState(localStorage.getItem("originCode") || "IN");
  const [destCode, setDestCode] = useState(localStorage.getItem("destCode") || "US");
  useEffect(() => {
    const onRoute = () => {
      setOriginCode(localStorage.getItem("originCode") || "IN");
      setDestCode(localStorage.getItem("destCode") || "US");
    };
    window.addEventListener("countryRouteChanged", onRoute);
    return () => window.removeEventListener("countryRouteChanged", onRoute);
  }, []);
  const originName = COUNTRY_NAMES[originCode] || originCode;
  const destName = COUNTRY_NAMES[destCode] || destCode;
  const oFlag = flagEmoji(originCode);
  const dFlag = flagEmoji(destCode);

  const [origin, setOrigin] = useState(680);
  const [dest, setDest] = useState(720);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API_SCORES);
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (!alive) return;
        if (typeof j?.origin === "number") setOrigin(j.origin);
        if (typeof j?.destination === "number") setDest(j.destination);
      } catch { /* silent fallback */ }
    })();
    return () => { alive = false; };
  }, []);
  const combined = useMemo(() => Math.round((origin + dest) / 2), [origin, dest]);

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("scoreHistory") || "[]"); } catch { return []; }
  });
  useEffect(() => {
    if (!Number.isFinite(combined)) return;
    localStorage.setItem("lastGlobalScore", String(combined));
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem("scoreHistory") || "[]"); } catch {}
    if (!hist.length || hist[hist.length - 1] !== combined) {
      const next = [...hist, combined].slice(-20);
      localStorage.setItem("scoreHistory", JSON.stringify(next));
      setHistory(next);
    }
  }, [combined]);

  const [showWelcome, setShowWelcome] = useState(() => {
    try { return localStorage.getItem("hideWelcome") !== "1"; } catch { return true; }
  });
  const dismissWelcome = () => { try { localStorage.setItem("hideWelcome", "1"); } catch {} setShowWelcome(false); };

  const counts = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("moduleCounts") || "{}"); } catch { return {}; }
  }, []);

  const groups = [
    {
      title: "Credit Health",
      items: [
        { to: "/utilization", label: "Utilization", icon: "📊", desc: "Credit used vs available limit", key: "util" },
        { to: "/account-mix", label: "Account Mix", icon: "🧩", desc: "Installment vs revolving", key: "mix" },
        { to: "/payment-history", label: "Payment History", icon: "💳", desc: "On-time rate & delinquencies", key: "pay" },
      ],
    },
    {
      title: "Behavior & History",
      items: [
        { to: "/inquiries", label: "Inquiries", icon: "🔎", desc: "Hard pulls & recency", key: "inq" },
        { to: "/credit-length", label: "Credit Age", icon: "⏳", desc: "Average & oldest account", key: "age" },
        { to: "/risk-profile", label: "Adverse Records", icon: "⚠️", desc: "Collections & charge-offs", key: "adverse" },
      ],
    },
    {
      title: "Insights",
      items: [
        { to: "/banking-insights", label: "Banking Insights", icon: "🏦", desc: "Income vs expense trends", key: "bank" },
        { to: "/behavior-trends", label: "Behavior Trends", icon: "📈", desc: "Spending & inquiries", key: "behav" },
        { to: "/accounts-util", label: "Accounts & Utilization", icon: "🗂️", desc: "Accounts and usage %", key: "acctutil" },
      ],
    },
  ];

  // tones for the three tiles (must be defined before JSX uses them)
  const tO = toneFor(origin);
  const tD = toneFor(dest);
  const tG = toneFor(combined);

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="container">
        {/* Header */}
        <header className="page-header">
          <div>
            <h1 style={{ margin: 0 }}>Your Global Credit Score</h1>
            <p style={{ margin: "4px 0 0" }}>Combined view of your origin and destination credit health.</p>
            <span className="meta">
              Normalized from <strong>{originName}</strong> → <strong>{destName}</strong> • Last 30 days
            </span>
          </div>
          <Sparkline data={history} />
        </header>

        {/* Welcome banner */}
        {showWelcome && (
          <div className="welcome" role="status" aria-live="polite">
            <div>
              <div className="w-title">Welcome!</div>
              <div>This page summarizes your credit health in one place. Scroll to see scores, key factors, and quick links to improve your profile.</div>
            </div>
            <button className="w-dismiss" onClick={dismissWelcome}>Got it</button>
          </div>
        )}

        {/* Quick Overview */}
        <section className="overview" aria-label="Quick overview">
          <p>We calculate three scores:</p>
          <p>• <strong>{oFlag} Origin</strong> — your current credit standing in <strong>{originName}</strong>.</p>
          <p>• <strong>{dFlag} Destination</strong> — how your profile maps to <strong>{destName}</strong>.</p>
          <p>• <strong>🌐 Global</strong> — a simple average to guide cross-border use.</p>
        </section>

        {/* Callout Summaries (CLICKABLE) */}
        <div className="callouts">
          <Link
            to="/score-origin"
            className="callout"
            aria-label="Open Origin score details"
            style={{
              display: "block",
              textDecoration: "none",
              borderRadius: 16,
              padding: "16px 18px",
              border: `1px solid ${tO.border}`,
              background: tO.bg,
              boxShadow: `0 8px 22px ${tO.shadow}`,
              color: tO.color
            }}
          >
            <div className="callout-title">Origin — {originName}</div>
            <div className="callout-score"><strong>{origin}</strong> / 1000</div>
            <div className="callout-sub">Local credit health</div>
          </Link>

          <Link
            to="/score-destination"
            className="callout"
            aria-label="Open Destination score details"
            style={{
              display: "block",
              textDecoration: "none",
              borderRadius: 16,
              padding: "16px 18px",
              border: `1px solid ${tD.border}`,
              background: tD.bg,
              boxShadow: `0 8px 22px ${tD.shadow}`,
              color: tD.color
            }}
          >
            <div className="callout-title">Destination — {destName}</div>
            <div className="callout-score"><strong>{dest}</strong> / 1000</div>
            <div className="callout-sub">Projected fit</div>
          </Link>

          <Link
            to="/score-global"
            className="callout"
            aria-label="Open Global (average) details"
            style={{
              display: "block",
              textDecoration: "none",
              borderRadius: 16,
              padding: "16px 18px",
              border: `1px solid ${tG.border}`,
              background: tG.bg,
              boxShadow: `0 8px 22px ${tG.shadow}`,
              color: tG.color
            }}
          >
            <div className="callout-title">Global (avg)</div>
            <div className="callout-score"><strong>{combined}</strong> / 1000</div>
            <div className="callout-sub">Combined view</div>
          </Link>
        </div>

        {/* Gauges — ORIGINAL dial design retained */}
        <section className="score-grid" aria-label="Scores">
          <div className="score-tile" style={{ width: 290 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{oFlag} Origin</div>
            <FlipDial score={origin} />
            <div className="score-note" style={{ textAlign: "center", fontSize: 12, color: "#6b7280" }}>Local bureau data</div>
          </div>

          <div className="score-tile" style={{ width: 290 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{dFlag} Destination</div>
            <FlipDial score={dest} />
            <div className="score-note" style={{ textAlign: "center", fontSize: 12, color: "#6b7280" }}>Projected fit</div>
          </div>

          <div className="score-tile" style={{ width: 290 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>🌐 Global</div>
            <FlipDial score={combined} />
            <div className="score-note" style={{ textAlign: "center", fontSize: 12, color: "#6b7280" }}>Average of both</div>
          </div>
        </section>

        {/* Key Factors */}
        <Factors score={combined} />

        {/* Sidebar-style Explore groups */}
        <section className="groups" aria-label="Explore by topic">
          {groups.map((g) => (
            <div key={g.title} className="group">
              <div className="group-h">
                <div className="group-title">{g.title}</div>
              </div>
              <div className="group-body">
                {g.items.map(({ to, label, desc, icon, key }) => (
                  <Link key={to} to={to} className="hub-card" title={desc}>
                    <div className="hub-icon" aria-hidden>{icon}</div>
                    <div className="hub-main">
                      <div className="hub-title">{label}</div>
                      <div className="hub-desc">{desc}</div>
                    </div>
                    {Number(counts?.[key]) > 0 && <div className="badge">{counts[key]}</div>}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Coach */}
        <Coach origin={origin} dest={dest} combined={combined} />

        {/* How it works */}
        <section className="how" aria-label="How Global Score works">
          <div className="how-title">How your Global Score is calculated</div>
          <div className="steps">
            <div className="step">
              <div className="s-ico">🔗</div>
              <strong>1) Connect</strong>
              <div>Securely connect bureaus & banks via approved providers.</div>
            </div>
            <div className="step">
              <div className="s-ico">⚖️</div>
              <strong>2) Normalize</strong>
              <div>Map local signals into a unified 0–1000 range with banding.</div>
            </div>
            <div className="step">
              <div className="s-ico">🧮</div>
              <strong>3) Combine</strong>
              <div>Origin & destination rolled into one view for cross-border use.</div>
            </div>
            <div className="step">
              <div className="s-ico">🧭</div>
              <strong>4) Coach</strong>
              <div>Actionable tips to raise score (utilization, payments, inquiries).</div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
