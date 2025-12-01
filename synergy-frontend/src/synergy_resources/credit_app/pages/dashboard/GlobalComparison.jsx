// src/synergy_resources/credit_app/pages/dashboard/GlobalComparison.jsx
import { useEffect, useMemo, useState } from "react";
import { Globe2, Ruler } from "lucide-react";

// APIs (fallbacks if backend not ready)
const API_NORM  = "/api/country-normalization"; // expects {origin,dest,score} → {normScore, band}
const API_BANDS = "/api/score-scale";           // expects bands [{name,min,max,color}...]

const SAMPLE_BANDS = [
  { name: "Poor",       min: 300, max: 579, color: "#ef4444" },
  { name: "Fair",       min: 580, max: 669, color: "#f59e0b" },
  { name: "Good",       min: 670, max: 739, color: "#84cc16" },
  { name: "Very Good",  min: 740, max: 799, color: "#10b981" },
  { name: "Excellent",  min: 800, max: 850, color: "#0ea5e9" },
];

function Section({ title, subtitle, right, open, onToggle, children }) {
  return (
    <article className="section">
      <button className="section-head" onClick={onToggle} aria-expanded={open}>
        <div>
          <div className="section-title">{title}</div>
          {subtitle && <div className="section-sub">{subtitle}</div>}
        </div>
        <div className="section-right">
          {right}
          <svg width="16" height="16" viewBox="0 0 24 24"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .18s" }}>
            <path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </button>
      <div className="section-body" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="section-body-inner">{children}</div>
      </div>
    </article>
  );
}

export default function GlobalComparison() {
  // Use the same country codes saved by Topbar, fall back to IN→US
  const [origin, setOrigin] = useState(localStorage.getItem("originCode") || "IN");
  const [dest,   setDest]   = useState(localStorage.getItem("destCode")   || "US");
  const lastScore = Number(localStorage.getItem("lastGlobalScore")) || 712;

  const [norm, setNorm]   = useState({ normScore: lastScore, band: "Good" });
  const [bands, setBands] = useState(SAMPLE_BANDS);
  const [open, setOpen]   = useState({ normalized: false, scale: false });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API_NORM, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, dest, score: lastScore }),
        });
        if (r.ok) setNorm(await r.json());
      } catch {}
      try {
        const r2 = await fetch(API_BANDS);
        if (r2.ok) setBands(await r2.json());
      } catch {}
    })();
  }, [origin, dest, lastScore]);

  const CSS = `
  .wrap{max-width:1100px;margin:0 auto;padding:0 10px}
  .hero{background:radial-gradient(1400px 320px at 50% -60px,#e0e7ff 0%,#eef2f7 100%);
    border:1px solid #d1d5db;border-radius:16px;padding:10px 12px;margin:4px 0 10px;
    display:flex;align-items:center;justify-content:space-between;gap:10px}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:6px 9px;font-weight:800}
  .section{border:1px solid #d1d5db;border-radius:14px;background:#fff;margin:10px 0;box-shadow:0 6px 16px rgba(0,0,0,.06)}
  .section-head{width:100%;border:none;background:transparent;text-align:left;display:flex;align-items:center;justify-content:space-between;padding:12px;cursor:pointer}
  .section-title{font-weight:900}
  .section-sub{color:#374151;font-size:12px;margin-top:2px}
  .section-body{display:grid;transition:grid-template-rows .18s ease}
  .section-body-inner{overflow:hidden}
  .sb{padding:12px;border-top:1px solid #e5e7eb}
  .row{display:flex;align-items:center;justify-content:space-between;border:1px solid #e5e7eb;border-radius:10px;padding:6px 10px;background:#fff;margin-bottom:6px}
  .muted{color:#6b7280;font-size:12px}
  .pill{border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;font-size:12px}
  .band-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #e5e7eb;border-radius:999px;padding:4px 8px;font-weight:800}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}
  `;

  // chip color by band name (fallback)
  const bandColor = useMemo(() => {
    const b = bands.find(b => b.name.toLowerCase() === String(norm.band || "").toLowerCase());
    return b?.color || "#84cc16";
  }, [bands, norm.band]);

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="hero">
          <div>
            <h1>Global Comparison</h1>
            <div className="chips">
              <span className="chip"><Globe2 size={14}/> {origin} → {dest}</span>
              <span className="chip"><Ruler size={14}/> Score <strong>{lastScore}</strong></span>
              <span className="chip" style={{ borderColor:"#e5e7eb", color: bandColor }}>
                Band <strong>{norm.band}</strong>
              </span>
            </div>
          </div>
        </div>

        <Section
          title="Normalized Score"
          subtitle="Your score aligned across countries"
          open={open.normalized}
          onToggle={()=>setOpen(o=>({...o, normalized:!o.normalized}))}
          right={<span className="pill">{origin} → {dest}</span>}
        >
          <div className="sb">
            <div className="row">
              <span>Normalized score</span>
              <span><strong>{norm.normScore}</strong></span>
            </div>
            <div className="row">
              <span>Equivalent band</span>
              <span className="band-chip" style={{ color: bandColor }}>{norm.band}</span>
            </div>
            <div className="muted">We use a mapping of score distributions between countries to present an apples-to-apples comparison.</div>
          </div>
        </Section>

        <Section
          title="Score Scale"
          subtitle="What each band means"
          open={open.scale}
          onToggle={()=>setOpen(o=>({...o, scale:!o.scale}))}
        >
          <div className="sb">
            <div className="grid">
              {bands.map(b=>(
                <div key={b.name} className="row" style={{ borderColor:"#e5e7eb" }}>
                  <span className="band-chip" style={{ color:b.color }}>{b.name}</span>
                  <span className="muted">{b.min}–{b.max}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </section>
  );
}
