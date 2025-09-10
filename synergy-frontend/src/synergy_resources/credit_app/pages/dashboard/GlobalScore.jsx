// src/synergy_resources/credit_app/pages/dashboard/GlobalScore.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CreditGauge from "../../components/CreditGauge";
import ConfettiBurst from "../../components/ConfettiBurst";

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

// simple suggestions for the back face
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

/* --- small flip card --- */
function FlipDial({ title, icon, score }) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped(f => !f);
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
        /* fixed height so the card doesn't jump when flipping */
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

  const sortedPages = useMemo(
    () => [...PAGES].sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  return (
    <section className="page">
      <ConfettiBurst fire={combined >= 670} />

      {/* Title + description */}
      <div className="page-header" style={{ marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Global Score</h1>
        <p className="page-sub" style={{ margin: "4px 0 0" }}>
          Cross-country normalized credit summary.
        </p>
        <p className="page-sub" style={{ margin: "2px 0 0", color: "#374151" }}>
          Normalized from <strong>{originName}</strong> → <strong>{destName}</strong> • Last 30 days
        </p>
      </div>

      {/* Hub tiles */}
      <div className="hub-grid compact" role="list" style={{ marginTop: 10 }}>
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
      </div>

      {/* KPI row (mini boxes) */}
      <div className="score-grid compact small" style={{ marginTop: 8 }}>
        <div className="score-tile sm">
          <h3 style={{ textAlign: "center", marginTop: 0 }}>{oFlag} Origin</h3>
          <div className="score-note" style={{ textAlign: "center" }}>
            <strong>{origin}</strong> ({bandName(origin)})
          </div>
        </div>
        <div className="score-tile sm">
          <h3 style={{ textAlign: "center", marginTop: 0 }}>{dFlag} Destination</h3>
          <div className="score-note" style={{ textAlign: "center" }}>
            <strong>{dest}</strong> ({bandName(dest)})
          </div>
        </div>
        <div className="score-tile sm">
          <h3 style={{ textAlign: "center", marginTop: 0 }}>🌐 Global</h3>
          <div className="score-note" style={{ textAlign: "center" }}>
            <strong>{combined}</strong> ({bandName(combined)})
          </div>
        </div>
      </div>

      {/* Dials with flip-on-click */}
      <div className="score-grid compact" style={{ marginTop: 10 }}>
        <FlipDial title="Origin Score"      icon={oFlag} score={origin} />
        <FlipDial title="Destination Score" icon={dFlag} score={dest} />
        <FlipDial title="Global Score"      icon="🌐"   score={combined} />
      </div>
    </section>
  );
}
