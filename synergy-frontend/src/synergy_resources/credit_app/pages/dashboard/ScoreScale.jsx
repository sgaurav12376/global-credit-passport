// src/synergy_resources/credit_app/pages/dashboard/ScoreScale.jsx
import { useEffect, useMemo, useState } from "react";

/* ======================================================
   Config + helpers
   ====================================================== */
const API_URL = "/api/data/score-scale"; // if missing, page falls back to SAMPLE

const BANDS = [
  { name: "Poor",      min:   0, max: 579, color: "#ef4444", note: "Approval odds are low. Focus on on-time payments and reducing balances." },
  { name: "Fair",      min: 580, max: 669, color: "#f59e0b", note: "Some approvals possible with higher APRs. Pay down revolving balances." },
  { name: "Good",      min: 670, max: 739, color: "#84cc16", note: "Solid access to credit. Keep utilization low and avoid new inquiries." },
  { name: "Very Good", min: 740, max: 799, color: "#10b981", note: "Strong profile. Maintain perfect payment history and low utilization." },
  { name: "Excellent", min: 800, max: 1000, color: "#3b82f6", note: "Best terms typically available. Keep doing what you’re doing." },
];
const bandOf = (score) => {
  let hit = BANDS[0];
  for (const b of BANDS) if (score >= b.min) hit = b;
  return hit;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (n) => Number(n).toLocaleString();

/* ---- Sample dataset (used when API not reachable) ---- */
// create a bell-ish distribution centered ~705 with std~90 across 20 bins
function makeSampleDist() {
  const bins = 20; // each bin covers 50 points (0..1000)
  const mu = 705, sigma = 90;
  const gauss = (x) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
  let arr = [];
  for (let i = 0; i < bins; i++) {
    const xMid = i * 50 + 25; // mid of bin
    arr.push({ start: i * 50, end: i * 50 + 50, count: gauss(xMid) });
  }
  // scale to a friendly total
  const total = arr.reduce((s, b) => s + b.count, 0);
  arr = arr.map((b) => ({ ...b, count: Math.round((b.count / total) * 1000) }));
  return arr;
}
const SAMPLE = {
  avg: 705,
  dist: makeSampleDist(), // array of {start,end,count}
  weights: [
    { label: "Payment history",   pct: 35 },
    { label: "Credit utilization",pct: 30 },
    { label: "Age of credit",     pct: 15 },
    { label: "Account mix",       pct: 10 },
    { label: "New inquiries",     pct: 10 },
  ],
  aprByBand: {
    Poor: "23%+ APR typical",
    Fair: "19–26% APR typical",
    Good: "15–22% APR typical",
    "Very Good": "12–18% APR typical",
    Excellent: "9–15% APR typical",
  }
};

/* ======================================================
   Component
   ====================================================== */
export default function ScoreScale() {
  const [data, setData] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);

  const lastFromGlobal = Number(localStorage.getItem("lastGlobalScore"));
  const [score, setScore] = useState(Number.isFinite(lastFromGlobal) ? lastFromGlobal : 700);

  // load server data with graceful fallback
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setIsSample(false);
        const r = await fetch(API_URL);
        if (!r.ok) throw new Error("bad");
        const j = await r.json();
        if (!alive) return;
        // expect { avg:number, dist:[{start,end,count}], weights:[{label,pct}], aprByBand:{...} }
        setData(j);
      } catch {
        if (!alive) return;
        setData(SAMPLE);
        setIsSample(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // toast (sample notice)
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (isSample) {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 2400);
      return () => clearTimeout(t);
    }
  }, [isSample]);

  const dist = data?.dist || [];
  const totalPop = dist.reduce((s, b) => s + b.count, 0) || 1;

  // percentile estimate from dist (<= selected score)
  const percentile = useMemo(() => {
    let sum = 0;
    for (const b of dist) {
      if (score >= b.end) sum += b.count;
      else if (score > b.start) {
        const frac = (score - b.start) / (b.end - b.start || 1);
        sum += b.count * frac;
      }
    }
    return Math.round((sum / totalPop) * 100); // 0..100
  }, [dist, totalPop, score]);

  const band = bandOf(score);
  const nextBand = useMemo(() => {
    const idx = BANDS.findIndex((b) => b.name === band.name);
    return BANDS[idx + 1] || null;
  }, [band]);

  const toNext = nextBand ? Math.max(0, nextBand.min - score) : 0;
  const aprText = (data?.aprByBand && data.aprByBand[band.name]) || SAMPLE.aprByBand[band.name];

  /* ================== CSS (scoped) ================== */
  const CSS = `
  .ss-wrap{max-width:100%;margin:0 auto;padding:0 0 16px}
  .head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:4px 0 10px}
  .sub{margin:0;color:#374151}
  .ctrl{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .slider{width:300px;accent-color:${band.color}}
  @media (max-width: 520px){ .slider{width:100%} }

  .grid{display:grid;grid-template-columns:1fr 360px;gap:12px;align-items:start}
  @media (max-width: 980px){ .grid{grid-template-columns:1fr} }

  .card{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .kpi-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:8px 0 12px}
  @media (max-width: 980px){ .kpi-row{grid-template-columns:repeat(2,1fr)} }
  .kpi{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#f8fafc}
  .kpi .k{font-size:12px;color:#6b7280}
  .kpi .v{font-weight:800}
  .kpi .sub{font-size:12px;color:#6b7280}
  .kpi .chip{display:inline-flex;align-items:center;gap:6px;border:1px solid ${band.color};color:${band.color};border-radius:999px;padding:2px 8px;font-weight:800}

  /* distribution bars */
  .bars{display:grid;grid-template-columns:repeat(${Math.max(1, dist.length)},1fr);align-items:end;gap:4px;height:180px}
  .bar{display:grid;grid-template-rows:1fr auto;gap:6px}
  .fill{background:#60a5fa;border-radius:6px 6px 0 0}
  .lbl{font-size:10px;color:#6b7280;text-align:center}
  .marker{position:relative;height:0}
  .marker>span{position:absolute;top:-184px;width:2px;background:${band.color};height:184px;left:0;transform:translateX(-1px)}
  .legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .dot{width:10px;height:10px;border-radius:999px;display:inline-block;margin-right:6px}

  /* right col */
  .weights{display:grid;gap:8px}
  .w-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
  .w-bar{height:10px;background:#eef2f7;border-radius:999px;overflow:hidden}
  .w-fill{height:100%;background:#2563eb;width:0;animation:grow .6s ease forwards}
  @keyframes grow{from{width:0}}
  .notes{display:grid;gap:8px}
  .note{border:1px solid #d1d5db;border-radius:12px;padding:10px;background:#f8fafc}

  /* bands grid */
  .bands{display:grid;grid-template-columns:repeat(5, minmax(0,1fr));gap:10px;margin-top:10px}
  @media (max-width: 1180px){ .bands{grid-template-columns:repeat(3,1fr)} }
  @media (max-width: 740px){ .bands{grid-template-columns:repeat(2,1fr)} }
  @media (max-width: 520px){ .bands{grid-template-columns:1fr} }
  .bcard{border:1px solid #e5e7eb;border-radius:12px;padding:10px}
  .bhead{display:flex;align-items:center;justify-content:space-between}
  .bname{font-weight:800}
  .brange{font-size:12px;color:#374151}
  .small{font-size:12px;color:#6b7280}

  .toast-float{position:fixed;left:16px;bottom:16px;background:#fff;border:1px solid #d1d5db;border-radius:12px;box-shadow:0 10px 20px rgba(0,0,0,.12);padding:10px 12px;font-weight:800;z-index:80}
  `;

  // distribution helpers
  const maxCount = Math.max(1, ...dist.map((d) => d.count || 0));
  // marker X% along bars
  const markerLeftPct = useMemo(() => {
    if (!dist.length) return 0;
    const totalWidth = 100; // %
    const binWidth = totalWidth / dist.length;
    const idx = Math.floor(score / 50); // because each bin is 50 wide in sample
    const within = (score % 50) / 50;
    return clamp(idx * binWidth + within * binWidth, 0, 100);
  }, [dist.length, score]);

  return (
    <section className="page">
      <style>{CSS}</style>

      <div className="ss-wrap">
        {/* Header */}
        <div className="head">
          <div>
            <h1 style={{ margin: 0 }}>Score Scale</h1>
            <p className="sub">What 0–1000 means by band, plus how different factors impact your score.</p>
          </div>
          <div className="ctrl">
            <label style={{ fontWeight: 700, color: "#374151" }} htmlFor="score-slider">
              Try a score:
            </label>
            <input
              id="score-slider"
              className="slider"
              type="range"
              min={0}
              max={1000}
              step={1}
              value={score}
              onChange={(e) => setScore(clamp(Number(e.target.value), 0, 1000))}
              aria-label="Choose a score to see your band and percentile"
            />
            <div className="kpi chip" style={{ borderColor: band.color, color: band.color, padding: "6px 10px", borderRadius: 999 }}>
              {fmt(score)} / 1000
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-row">
          <div className="kpi">
            <div className="k">Band</div>
            <div className="v" style={{ color: band.color }}>
              <span className="chip">{band.name}</span>
            </div>
            <div className="sub">{band.min}–{band.max}</div>
          </div>
          <div className="kpi">
            <div className="k">Percentile (est.)</div>
            <div className="v">{percentile}<span style={{ fontWeight: 600 }}>%</span></div>
            <div className="sub">of users scored at or below</div>
          </div>
          <div className="kpi">
            <div className="k">To next band</div>
            <div className="v">{nextBand ? `${fmt(toNext)} pts` : "—"}</div>
            <div className="sub">{nextBand ? `Next: ${nextBand.name} (${nextBand.min}+ )` : "Top band"}</div>
          </div>
          <div className="kpi">
            <div className="k">Typical terms</div>
            <div className="v">{aprText}</div>
            <div className="sub">illustrative only</div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid">
          {/* LEFT: Distribution + Bands */}
          <section className="card">
            <h3 style={{ marginTop: 0 }}>Population distribution</h3>

            <div className="bars" role="img" aria-label="Score distribution">
              {dist.map((b, i) => (
                <div key={i} className="bar" title={`${b.start}–${b.end} • ${fmt(b.count)}`}>
                  <div
                    className="fill"
                    style={{
                      height: `${(b.count / maxCount) * 100}%`,
                      background: "#93c5fd",
                    }}
                  />
                  {/* show min/max & middle labels sparsely */}
                  {(i % 2 === 0 || i === dist.length - 1) && (
                    <div className="lbl">{b.start}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Marker for chosen score */}
            <div className="marker" aria-hidden>
              <span style={{ left: `${markerLeftPct}%` }} />
            </div>

            {/* Legend for bands */}
            <div className="legend" aria-hidden>
              {BANDS.map((b) => (
                <div key={b.name} className="small">
                  <span className="dot" style={{ background: b.color }} /> {b.name} ({b.min}-{b.max})
                </div>
              ))}
            </div>

            {/* Band cards */}
            <h3 style={{ margin: "12px 0 6px" }}>Band details</h3>
            <div className="bands">
              {BANDS.map((b) => (
                <div key={b.name} className="bcard">
                  <div className="bhead">
                    <div className="bname" style={{ color: b.color }}>{b.name}</div>
                    <div className="brange">{b.min}–{b.max}</div>
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>
                    {b.note}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RIGHT: Weights + Notes */}
          <aside className="card">
            <h3 style={{ marginTop: 0 }}>What moves the needle</h3>
            <div className="weights">
              {(data?.weights || SAMPLE.weights).map((w, i) => (
                <div key={i} className="w-row">
                  <div className="w-bar">
                    <div className="w-fill" style={{ width: `${w.pct}%` }} />
                  </div>
                  <div style={{ whiteSpace: "nowrap", fontWeight: 700 }}>
                    {w.label} &nbsp; {w.pct}%
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ margin: "12px 0 6px" }}>Notes</h3>
            <div className="notes">
              <div className="note">
                Scores are normalized cross-country on this app, so bands align across Origin and Destination.
              </div>
              <div className="note">
                Keep utilization &lt; 30% (10% is great), pay on time, avoid frequent hard inquiries, and let accounts age.
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showToast && <div className="toast-float">Showing sample data (API not reachable).</div>}
    </section>
  );
}
