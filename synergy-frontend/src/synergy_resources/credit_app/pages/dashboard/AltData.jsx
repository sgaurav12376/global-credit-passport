import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* ===== Config ===== */
const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
const API_URL = `${API_BASE}/api/data/alt-data`;
const NA = "—";

/* ===== Page ===== */
export default function AltData() {
  /* ---- page-scoped CSS ---- */
  const CSS = `
  .container{max-width:100%;margin:0 auto;padding:0 10px}
  .page-header{display:grid;gap:6px;margin-bottom:10px}
  .page-sub{color:#374151;margin:0}

  /* KPIs */
  .ad-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:6px 0 12px}
  @media(max-width:1120px){.ad-kpis{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:820px){.ad-kpis{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:520px){.ad-kpis{grid-template-columns:1fr}}
  .kpi{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .kpi .k{color:#6b7280;font-size:12px;margin-bottom:4px}
  .kpi .v{font-weight:800}
  .kpi .sub{color:#6b7280;font-size:12px;margin-top:2px}

  /* Controls */
  .ad-headrow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
  .ad-controls{display:flex;gap:8px;align-items:center}
  .ad-input{padding:8px 10px;border:1px solid #d1d5db;border-radius:10px;width:220px;background:#fff}
  .ad-select{border:1px solid #d1d5db;background:#fff;padding:8px 10px;border-radius:10px;cursor:pointer}

  /* Filter chips */
  .ad-chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 10px}
  .ad-chip{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:6px 10px;font-size:13px;cursor:pointer;transition:transform .1s,box-shadow .1s}
  .ad-chip:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(0,0,0,.08)}
  .ad-chip.is-active{background:#f8fbff;border-color:#c9d3e0}

  /* 2-col layout */
  .ad-layout{display:grid;grid-template-columns:2fr 1fr;gap:12px;align-items:start;margin-top:6px}
  @media(max-width:1040px){.ad-layout{grid-template-columns:1fr}}

  /* Cards grid */
  .ad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
  .ad-card{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06);display:grid;gap:8px}
  .ad-head{display:flex;align-items:center;gap:10px}
  .ad-ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#eef2f7;border:1px solid #e5e7eb;font-size:18px;flex:0 0 auto}
  .ad-titles{min-width:0}
  .ad-name{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ad-sub{color:#6b7280;font-size:12px}
  .ad-meta{display:grid;gap:4px;font-size:14px}
  .ad-row{display:flex;justify-content:space-between;gap:10px}
  .ad-k{color:#6b7280}
  .ad-v{font-weight:700}

  /* Progress */
  .progress{height:10px;background:#eef2f7;border-radius:999px;overflow:hidden}
  .bar{height:100%;width:0;background:#10b981;animation:fillGrow .6s ease forwards}

  /* Flags */
  .flag{display:inline-flex;align-items:center;gap:6px;border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:4px 8px;font-weight:700;font-size:12px}
  .flag.ok{color:#10b981;border-color:#d1fae5;background:#f0fdf4}
  .flag.warn{color:#f59e0b;border-color:#fef3c7;background:#fffbeb}
  .flag.danger{color:#b91c1c;border-color:#fee2e2;background:#fef2f2}

  /* Coach */
  .coach{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .coach h3{margin:0 0 6px}
  .coach-chips{display:flex;flex-wrap:wrap;gap:8px}
  .coach-chip{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:6px 10px;font-weight:700;text-decoration:none;color:#111827}
  .coach-chip:hover{background:#f8fbff;border-color:#c9d3e0}
  .tips{display:grid;gap:8px;margin-top:10px}
  .tip{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px;box-shadow:0 4px 10px rgba(0,0,0,.06);font-size:14px}

  /* Toast */
  .sample-toast{position:fixed;right:20px;bottom:20px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 10px 24px rgba(0,0,0,.18);padding:12px 14px;font-weight:700;color:#111827;opacity:0;transform:translateY(6px);transition:opacity .18s,transform .18s;z-index:80}
  .sample-toast.show{opacity:1;transform:translateY(0)}

  .err{color:#b91c1c;margin-top:8px}
  .ad-empty{color:#6b7280;padding:16px}
  @keyframes fillGrow{from{width:0}}
  `;

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  // UI
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | utilities | telecom | rent | subs
  const [sort, setSort] = useState("name");    // name | ontime | tenure

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setErr(""); setLoading(true);
        const r = await fetch(API_URL, { signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!ac.signal.aborted) setData(j);
      } catch {
        if (!ac.signal.aborted) {
          const sample = getSampleAltData();
          setData(sample);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3600);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // Flatten providers into one list with a type tag for filtering/sorting
  const providers = useMemo(() => {
    if (!data) return [];
    const u = (data.utilities || []).map((p) => ({ ...p, _type: "utilities" }));
    const t = (data.telecom || []).map((p) => ({ ...p, _type: "telecom" }));
    const s = (data.subscriptions || []).map((p) => ({ ...p, _type: "subs" }));
    const r = data.rent ? [{ ...data.rent, provider: "Reported Rent", _type: "rent" }] : [];
    return [...u, ...t, ...s, ...r];
  }, [data]);

  const filtered = useMemo(() => {
    const list = filter === "all" ? providers : providers.filter((p) => p._type === filter);
    if (!q.trim()) return list;
    const s = q.toLowerCase();
    return list.filter((p) =>
      [p.provider, p.type, p.account, p.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [providers, filter, q]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "ontime") copy.sort((a, b) => (b.onTimePct ?? -1) - (a.onTimePct ?? -1));
    else if (sort === "tenure") copy.sort((a, b) => (b.tenureMonths ?? -1) - (a.tenureMonths ?? -1));
    else copy.sort((a, b) => String(a.provider).localeCompare(String(b.provider)));
    return copy;
  }, [filtered, sort]);

  // top-level KPIs
  const k = data?.kpis || {};
  const lastUpdated = k.lastUpdated ? new Date(k.lastUpdated).toLocaleDateString() : NA;
  const overallOnTime =
    providers.length
      ? Math.round(
          providers.reduce((s, p) => s + (p.onTimePct ?? 0), 0) / providers.length
        )
      : null;

  // Coach suggestions
  const coach = useMemo(() => {
    const tips = [];
    if (overallOnTime != null && overallOnTime < 95) tips.push("Enable autopay to keep on-time rate high.");
    if (providers.some((p) => p.delinquent)) tips.push("Bring any past-due utility/telecom bills current.");
    if (!(k?.verifiedPhone || false)) tips.push("Verify your phone for stronger identity signals.");
    if (providers.filter((p) => p._type === "rent").length === 0) tips.push("Add rent reporting to build history.");
    return tips.slice(0, 4);
  }, [overallOnTime, providers, k]);

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="container">
        {/* Header */}
        <header className="page-header">
          <h1 style={{ margin: 0 }}>Alt-Data</h1>
          <p className="page-sub">Phone, utilities, rent, telecom & subscriptions that can support your credit profile.</p>
        </header>

        {/* KPIs */}
        <section className="ad-kpis" aria-label="Key metrics">
          <div className="kpi">
            <div className="k">Phone Verified</div>
            <div className="v">
              <span className={`flag ${k.verifiedPhone ? "ok" : "warn"}`}>{k.verifiedPhone ? "Verified" : "Unverified"}</span>
            </div>
            <div className="sub">Email: <span className={`flag ${k.emailVerified ? "ok" : "warn"}`} style={{ marginLeft: 6 }}>{k.emailVerified ? "Verified" : "Unverified"}</span></div>
          </div>
          <div className="kpi">
            <div className="k">Active Utility/Telecom</div>
            <div className="v">{(data?.utilities?.length || 0) + (data?.telecom?.length || 0)}</div>
            <div className="sub">Providers reporting</div>
          </div>
          <div className="kpi">
            <div className="k">Overall On-time Rate</div>
            <div className="v">{overallOnTime == null ? NA : `${overallOnTime}%`}</div>
            <div className="sub">Across providers</div>
          </div>
          <div className="kpi">
            <div className="k">Last Updated</div>
            <div className="v">{lastUpdated}</div>
            <div className="sub">Most recent report</div>
          </div>
        </section>

        {/* Controls */}
        <div className="ad-headrow">
          <div className="ad-chips">
            <Chip label={`All (${providers.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
            <Chip label={`Utilities (${data?.utilities?.length || 0})`} active={filter === "utilities"} onClick={() => setFilter("utilities")} />
            <Chip label={`Telecom (${data?.telecom?.length || 0})`} active={filter === "telecom"} onClick={() => setFilter("telecom")} />
            <Chip label={`Rent (${data?.rent ? 1 : 0})`} active={filter === "rent"} onClick={() => setFilter("rent")} />
            <Chip label={`Subs (${data?.subscriptions?.length || 0})`} active={filter === "subs"} onClick={() => setFilter("subs")} />
          </div>
          <div className="ad-controls">
            <input className="ad-input" placeholder="Search providers…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="ad-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="name">Sort: Name</option>
              <option value="ontime">Sort: On-time</option>
              <option value="tenure">Sort: Tenure</option>
            </select>
          </div>
        </div>

        {/* Content + Coach */}
        <div className="ad-layout">
          {/* Cards grid */}
          <section className="ad-grid" aria-label="Providers">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                {sorted.map((p, i) => <ProviderCard key={i} p={p} />)}
                {sorted.length === 0 && <div className="ad-empty">No providers match your filters.</div>}
              </>
            )}
            {err && <div className="err">⚠️ {err}</div>}
          </section>

          {/* Coach */}
          <aside className="coach">
            <h3>Coach</h3>
            <div className="coach-chips" style={{ marginBottom: 8 }}>
              <Link to="/payment-history" className="coach-chip">Payment history</Link>
              <Link to="/utilization" className="coach-chip">Utilization</Link>
              <Link to="/recent-behavior" className="coach-chip">Recent behavior</Link>
              <Link to="/adverse-records" className="coach-chip">Adverse records</Link>
            </div>
            <div className="tips">
              {coach.map((t) => <div key={t} className="tip">• {t}</div>)}
              {coach.length === 0 && <div className="tip">Looking good! Keep everything on autopay and current.</div>}
            </div>
          </aside>
        </div>
      </div>

      {/* Sample toast */}
      <div className={`sample-toast ${showToast ? "show" : ""}`} role="status" aria-live="polite">
        Showing sample data (API not reachable).
      </div>
    </section>
  );
}

/* ===== Parts ===== */
function Chip({ label, active, onClick }) {
  return (
    <button type="button" className={`ad-chip ${active ? "is-active" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function ProviderCard({ p }) {
  const ico = p._type === "utilities" ? "💡"
            : p._type === "telecom"   ? "📶"
            : p._type === "subs"      ? "🎬"
            : "🏠";

  const color = p._type === "utilities" ? "#0ea5e9"
              : p._type === "telecom"   ? "#6366f1"
              : p._type === "subs"      ? "#10b981"
              : "#f59e0b";

  const onTime = typeof p.onTimePct === "number" ? Math.max(0, Math.min(100, Math.round(p.onTimePct))) : null;
  const status =
    p.delinquent ? "danger"
    : onTime != null && onTime < 90 ? "warn"
    : "ok";

  return (
    <article className="ad-card">
      <div className="ad-head">
        <div className="ad-ico" style={{ color }}>{ico}</div>
        <div className="ad-titles">
          <div className="ad-name" title={p.provider || "Provider"}>{p.provider || "Provider"}</div>
          <div className="ad-sub">{(p.type || p._type || "").toString().replace(/_/g, " ")}</div>
        </div>
        <span className={`flag ${status}`} style={{ marginLeft: "auto" }}>
          {p.delinquent ? "Past-due" : "OK"}
        </span>
      </div>

      {onTime != null && (
        <>
          <div className="ad-row"><div className="ad-k">On-time</div><div className="ad-v">{onTime}%</div></div>
          <div className="progress"><div className="bar" style={{ width: `${onTime}%`, background: color }} /></div>
        </>
      )}

      {p.tenureMonths != null && (
        <div className="ad-row"><div className="ad-k">Tenure</div><div className="ad-v">{p.tenureMonths} mo</div></div>
      )}
      {p.lastPayment && (
        <div className="ad-row"><div className="ad-k">Last payment</div><div className="ad-v">{new Date(p.lastPayment).toLocaleDateString()}</div></div>
      )}
      {p.amount != null && (
        <div className="ad-row"><div className="ad-k">Typical bill</div><div className="ad-v">${Number(p.amount).toFixed(2)}</div></div>
      )}
      {p.monthsReported != null && (
        <div className="ad-row"><div className="ad-k">Months reported</div><div className="ad-v">{p.monthsReported}</div></div>
      )}
    </article>
  );
}

function SkeletonCard() {
  return (
    <article className="ad-card">
      <div className="ad-head">
        <div className="ad-ico" />
        <div className="ad-titles">
          <div className="ad-name" style={{ background:"#eef2f7", height:14, borderRadius:6, width:"60%" }} />
          <div className="ad-sub"  style={{ background:"#eef2f7", height:12, borderRadius:6, width:"40%", marginTop:6 }} />
        </div>
      </div>
      <div className="progress"><div className="bar" style={{ width: "0%" }} /></div>
      <div className="ad-row"><div className="ad-k">—</div><div className="ad-v" style={{ background:"#eef2f7", height:12, borderRadius:6, width:80 }} /></div>
    </article>
  );
}

/* ===== Sample fallback ===== */
function getSampleAltData() {
  const today = new Date();
  const d = (offset) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset).toISOString();

  return {
    kpis: {
      verifiedPhone: true,
      emailVerified: true,
      activeUtilityAccounts: 2,
      onTimePaymentsPct: 94,
      lastUpdated: d(3),
    },
    utilities: [
      { provider: "ConEd", type: "electric", start: "2023-05-01", status: "active", onTimePct: 98, delinquent: false, lastPayment: d(4), amount: 120.34, tenureMonths: 22 },
      { provider: "NYC Water", type: "water", start: "2024-02-10", status: "active", onTimePct: 96, delinquent: false, lastPayment: d(28), amount: 48.20, tenureMonths: 12 },
    ],
    telecom: [
      { provider: "Verizon Wireless", type: "mobile", active: true, onTimePct: 92, lastPayment: d(5), amount: 85.99, tenureMonths: 26, delinquent: false },
      { provider: "Spectrum", type: "internet", active: true, onTimePct: 88, lastPayment: d(38), amount: 69.99, tenureMonths: 10, delinquent: true },
    ],
    rent: { reported: true, onTimePct: 94, monthsReported: 18, lastReport: d(9), tenureMonths: 24, amount: 1850, delinquent: false, _type: "rent" },
    subscriptions: [
      { provider: "Netflix", type: "streaming", active: true, onTimePct: 100, amount: 15.99, tenureMonths: 36 },
      { provider: "Spotify", type: "music", active: true, onTimePct: 100, amount: 9.99, tenureMonths: 44 },
    ],
  };
}
