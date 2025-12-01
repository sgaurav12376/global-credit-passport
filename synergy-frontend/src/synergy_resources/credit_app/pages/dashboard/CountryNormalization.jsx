import { useEffect, useMemo, useState } from "react";

/* =========================
   Country Normalization
   ========================= */
export default function CountryNormalization() {
  /* ---------- config ---------- */
  const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
  const API_URL  = `${API_BASE}/api/data/country-normalization`;

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

  /* ---------- page-scoped CSS ---------- */
  const CSS = `
  .container{max-width:100%;margin:0 auto;padding:0 10px}
  .page-header{display:grid;gap:6px;margin-bottom:10px}
  .page-sub{color:#374151;margin:0}
  .pill{display:inline-block;font-size:13px;color:#374151;background:#ffffffcc;border:1px solid #d1d5db;padding:6px 10px;border-radius:999px;backdrop-filter:blur(6px)}

  /* KPI strip */
  .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:8px 0 12px}
  @media(max-width:1100px){.kpis{grid-template-columns:repeat(2,1fr)}}
  .kpi{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .k{color:#6b7280;font-size:12px;margin-bottom:4px}
  .v{font-weight:800}
  .sub{font-size:12px;color:#6b7280;margin-top:2px}

  /* Layout */
  .grid{display:grid;grid-template-columns:1.25fr 1fr;gap:12px;align-items:start}
  @media(max-width:1040px){.grid{grid-template-columns:1fr}}
  .card{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .card h3{margin:0 0 8px}

  /* Band cards */
  .bands{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  @media(max-width:760px){.bands{grid-template-columns:1fr}}
  .band-row{display:flex;align-items:center;justify-content:space-between;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;margin-top:6px}
  .chip{border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;font-size:12px}
  .chip.good{color:#16a34a;border-color:#bbf7d0;background:#f0fdf4}
  .chip.warn{color:#f59e0b;border-color:#fde68a;background:#fffbeb}

  /* Converter */
  .conv{display:grid;gap:10px}
  .row{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center}
  @media(max-width:620px){.row{grid-template-columns:1fr}}
  .scorebox{border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;background:#f9fafb;font-weight:800}
  .slider{width:100%}
  .muted{color:#6b7280}

  /* Curve chart */
  .chart{width:100%;height:260px}
  .chart .axis{stroke:#9ca3af;stroke-width:.8}
  .chart .diag{stroke:#d1d5db;stroke-dasharray:5 5}
  .chart .map{stroke:#2563eb;stroke-width:2;fill:none}
  .chart .pt{fill:#2563eb;stroke:#fff;stroke-width:2}

  /* Table */
  table{width:100%;border-collapse:separate;border-spacing:0 8px}
  th{font-size:12px;color:#6b7280;text-align:left;padding:0 8px}
  tr.data{background:#fff;border:1px solid #e5e7eb;border-radius:10px}
  td{padding:10px 8px}
  td.right{text-align:right}

  /* Toast */
  .sample-toast{position:fixed;right:20px;bottom:20px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 10px 24px rgba(0,0,0,.18);padding:12px 14px;font-weight:700;color:#111827;opacity:0;transform:translateY(6px);transition:opacity .18s,transform .18s;z-index:80}
  .sample-toast.show{opacity:1;transform:translateY(0)}
  `;

  /* ---------- countries & flags from Topbar ---------- */
  const [originCode, setOriginCode] = useState(localStorage.getItem("originCode") || "IN");
  const [destCode, setDestCode]     = useState(localStorage.getItem("destCode")   || "US");
  useEffect(() => {
    const onRoute = () => {
      setOriginCode(localStorage.getItem("originCode") || "IN");
      setDestCode(localStorage.getItem("destCode")   || "US");
    };
    window.addEventListener("countryRouteChanged", onRoute);
    return () => window.removeEventListener("countryRouteChanged", onRoute);
  }, []);
  const oFlag = flagEmoji(originCode);
  const dFlag = flagEmoji(destCode);

  /* ---------- data fetch ---------- */
  const [data, setData] = useState(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch(API_URL, { signal: ac.signal });
        if (!r.ok) throw new Error();
        const j = await r.json();
        if (!ac.signal.aborted) setData(j);
      } catch {
        if (!ac.signal.aborted) {
          setData(sampleNormalization(originCode, destCode));
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3600);
        }
      }
    })();
    return () => ac.abort();
  }, [originCode, destCode]);

  /* ---------- anchors / mapping ---------- */
  // Expected shape: { anchors: [[originScore, destScore], ...] }
  const anchors = useMemo(() => {
    const a = (data?.anchors || []).slice().sort((x, y) => x[0] - y[0]);
    // ensure both ends exist
    if (!a.length || a[0][0] > 0) a.unshift([0, 0]);
    if (a[a.length - 1][0] < 1000) a.push([1000, 1000]);
    return a;
  }, [data]);

  function mapScore(s) {
    const x = Math.max(0, Math.min(1000, Number(s) || 0));
    for (let i = 1; i < anchors.length; i++) {
      const [x0, y0] = anchors[i - 1];
      const [x1, y1] = anchors[i];
      if (x <= x1) {
        const t = (x - x0) / Math.max(1, x1 - x0);
        return Math.round(y0 + (y1 - y0) * t);
      }
    }
    return 1000;
  }

  /* ---------- interactive converter ---------- */
  const [raw, setRaw] = useState(680);
  const norm = useMemo(() => mapScore(raw), [raw, anchors]);

  /* ---------- kpis ---------- */
  const k = useMemo(() => {
    const goodShift = mapScore(670) - 670;
    const vgShift   = mapScore(740) - 740;
    return {
      method: data?.method || "Percentile-anchored piecewise mapping",
      lastUpdated: data?.lastUpdated || new Date().toISOString(),
      shiftGood: goodShift,
      shiftVeryGood: vgShift,
      avgShift: Math.round(([580, 670, 740, 800].map(mapScore).reduce((s,v,i)=> s + (v - [580,670,740,800][i]), 0) / 4)),
    };
  }, [data, anchors]);

  /* ---------- chart path ---------- */
  const chart = useMemo(() => {
    const W = 520, H = 260, pad = 28;
    const sx = (x) => pad + (x / 1000) * (W - pad * 2);
    const sy = (y) => H - pad - (y / 1000) * (H - pad * 2);
    const path = anchors.map(([x,y], i) => `${i ? "L" : "M"} ${sx(x)} ${sy(y)}`).join(" ");
    const diagonal = `M ${sx(0)} ${sy(0)} L ${sx(1000)} ${sy(1000)}`;
    const pX = sx(raw), pY = sy(norm);
    const guides = {
      vLines: BANDS.slice(1).map(b => sx(b.min)),
      hLines: BANDS.slice(1).map(b => sy(b.min)),
    };
    return { W, H, pad, path, diagonal, pX, pY, sx, sy, guides };
  }, [anchors, raw, norm]);

  /* ---------- small table points ---------- */
  const examples = [500, 600, 680, 720, 800, 900].map((x) => ({ x, y: mapScore(x) }));

  /* ---------- render ---------- */
  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="container">
        {/* Header */}
        <header className="page-header">
          <h1 style={{ margin: 0 }}>Country Normalization</h1>
          <p className="page-sub">
            Align a score from one country to another using anchored percentiles and band thresholds.
          </p>
          <span className="pill">
            Normalized {flagEmoji(originCode)} <b>{COUNTRY_NAMES[originCode] || originCode}</b> → {flagEmoji(destCode)} <b>{COUNTRY_NAMES[destCode] || destCode}</b>
          </span>
        </header>

        {/* KPIs */}
        <section className="kpis" aria-label="Key metrics">
          <div className="kpi"><div className="k">Method</div><div className="v">{k.method}</div></div>
          <div className="kpi"><div className="k">Avg Band Shift</div><div className="v">{k.avgShift > 0 ? `+${k.avgShift}` : k.avgShift} pts</div><div className="sub">Across key thresholds</div></div>
          <div className="kpi"><div className="k">Good threshold shift</div><div className="v">{k.shiftGood >= 0 ? `+${k.shiftGood}` : k.shiftGood} pts</div></div>
          <div className="kpi"><div className="k">Very Good shift</div><div className="v">{k.shiftVeryGood >= 0 ? `+${k.shiftVeryGood}` : k.shiftVeryGood} pts</div><div className="sub">740 anchor</div></div>
        </section>

        {/* Main grid */}
        <div className="grid">
          {/* Left: Converter + Curve */}
          <div style={{ display:"grid", gap:12 }}>
            <section className="card">
              <h3>Interactive converter</h3>
              <div className="conv">
                <div className="row">
                  <div>
                    <div className="muted">Origin score ({COUNTRY_NAMES[originCode] || originCode})</div>
                    <div className="scorebox">{raw} / 1000 <span className="chip" style={{ marginLeft:8 }}>{bandName(raw)}</span></div>
                  </div>
                  <div aria-hidden style={{fontWeight:800}}>→</div>
                  <div>
                    <div className="muted">Normalized ({COUNTRY_NAMES[destCode] || destCode})</div>
                    <div className="scorebox">{norm} / 1000 <span className={`chip ${norm>=670?'good':'warn'}`} style={{ marginLeft:8 }}>{bandName(norm)}</span></div>
                  </div>
                </div>
                <input
                  className="slider"
                  type="range"
                  min="0"
                  max="1000"
                  step="1"
                  value={raw}
                  onChange={(e)=>setRaw(Number(e.target.value))}
                  aria-label="Origin score"
                />
                <div className="muted">Drag the slider to see how a score translates across countries.</div>
              </div>
            </section>

            <section className="card">
              <h3>Normalization curve</h3>
              <svg className="chart" viewBox={`0 0 ${chart.W} ${chart.H}`} role="img" aria-label="Normalization curve">
                {/* axes */}
                <line className="axis" x1={chart.sx(0)} y1={chart.sy(0)} x2={chart.sx(0)} y2={chart.sy(1000)} />
                <line className="axis" x1={chart.sx(0)} y1={chart.sy(0)} x2={chart.sx(1000)} y2={chart.sy(0)} />
                {/* band guides */}
                {chart.guides.vLines.map((x,i)=> <line key={"v"+i} x1={x} y1={chart.sy(0)} x2={x} y2={chart.sy(1000)} stroke="#eef2f7" />)}
                {chart.guides.hLines.map((y,i)=> <line key={"h"+i} x1={chart.sx(0)} y1={y} x2={chart.sx(1000)} y2={y} stroke="#eef2f7" />)}
                {/* diagonal */}
                <path className="diag" d={chart.diagonal} />
                {/* mapping */}
                <path className="map" d={chart.path} />
                {/* current point */}
                <circle className="pt" cx={chart.pX} cy={chart.pY} r="4.5" />
                {/* axis labels */}
                <text x={chart.sx(1000)} y={chart.sy(0)-6} fontSize="11" textAnchor="end">Destination 0–1000</text>
                <text x={chart.sx(0)} y={chart.sy(1000)+12} fontSize="11">Origin 0–1000</text>
              </svg>
              <div className="muted">Blue = mapping; gray dashed = 1:1 line. Grid lines mark band thresholds (580/670/740/800).</div>
            </section>

            <section className="card">
              <h3>Sample conversions</h3>
              <table>
                <thead>
                  <tr>
                    <th>Origin</th>
                    <th>Band</th>
                    <th className="right">→ Normalized</th>
                    <th>Band</th>
                  </tr>
                </thead>
                <tbody>
                  {examples.map((r) => (
                    <tr key={r.x} className="data">
                      <td className="td">{r.x}</td>
                      <td className="td">{bandName(r.x)}</td>
                      <td className="td right">{r.y}</td>
                      <td className="td">{bandName(r.y)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          {/* Right: Bands & Notes */}
          <aside style={{ display:"grid", gap:12 }}>
            <section className="card">
              <h3>Band alignment</h3>
              <div className="bands">
                <div className="card" style={{padding:10}}>
                  <div style={{fontWeight:800, display:"flex", alignItems:"center", gap:6}}>{oFlag} {COUNTRY_NAMES[originCode] || originCode}</div>
                  {BANDS.map((b, i) => (
                    <div key={b.name} className="band-row">
                      <div>{b.name}</div>
                      <div className="chip">{b.min}+</div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:10}}>
                  <div style={{fontWeight:800, display:"flex", alignItems:"center", gap:6}}>{dFlag} {COUNTRY_NAMES[destCode] || destCode}</div>
                  {BANDS.map((b) => {
                    const mapped = mapScore(b.min);
                    const delta  = mapped - b.min;
                    return (
                      <div key={b.name} className="band-row">
                        <div>{b.name}</div>
                        <div>
                          <span className="chip">{mapped}+ </span>
                          <span className={`chip ${delta>=0?'good':'warn'}`} style={{ marginLeft:6 }}>
                            {delta>=0?`+${delta}`:delta}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="card">
              <h3>Method & notes</h3>
              <ul style={{margin:"6px 0 0", paddingLeft:16, display:"grid", gap:6}}>
                <li><b>Anchors:</b> We align at key percentiles and band thresholds (580/670/740/800) using recent bureau/partner distributions.</li>
                <li><b>Mapping:</b> Piece-wise linear interpolation between anchors (monotonic, 0–1000 bounded).</li>
                <li><b>Updates:</b> Anchors are refreshed periodically to reflect market shifts.</li>
                <li><b>Tip:</b> Improve normalized score by keeping utilization &lt; 30% and perfect on-time history.</li>
              </ul>
              <div className="sub" style={{marginTop:8}}>Last updated: {new Date(k.lastUpdated).toLocaleDateString()}</div>
            </section>
          </aside>
        </div>
      </div>

      {/* sample toast */}
      <div className={`sample-toast ${showToast ? "show" : ""}`} role="status" aria-live="polite">
        Showing sample data (API not reachable).
      </div>
    </section>
  );
}

/* =========================
   Sample fallback data
   ========================= */
function sampleNormalization(originCode, destCode) {
  // Example: gentle uplift when normalizing IN → US. Tweak anchors as needed.
  const anchors = [
    [0, 0],
    [580, 600],
    [670, 700],
    [740, 760],
    [800, 820],
    [1000, 1000],
  ];
  return {
    originCode,
    destCode,
    anchors,
    method: "Percentile-anchored piecewise mapping",
    lastUpdated: new Date().toISOString(),
  };
}
