// src/synergy_resources/credit_app/pages/dashboard/RecentBehavior.jsx
import { useEffect, useMemo, useState } from "react";

/* ===============================
   Config + helpers
   =============================== */
const API_URL = "/api/data/recent-behavior"; // adjust if your backend differs

const NA = "—";
const money = (n, c = "USD") =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n)
    : NA;

const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const daysAgo = (n) => { const d = today(); d.setDate(d.getDate() - n); return d; };

function yyyymm(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}
function monthShort(d) {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
}
function buildMonths(n) {
  const out = [];
  const base = today(); base.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(base);
    x.setMonth(base.getMonth() - i);
    out.push({ key: yyyymm(x), label: monthShort(x) });
  }
  return out;
}

/* ===============================
   Sample data (auto fits last 12m)
   =============================== */
const SAMPLE = (function makeSample() {
  const months = buildMonths(12);
  // spend baseline + a couple of spikes
  const base = 1800;
  const seq = months.map((_, i) => {
    const wobble = base * (0.92 + 0.16 * Math.random()); // ±8%
    return Math.round(wobble);
  });
  // add two spikes
  if (seq.length > 5) seq[seq.length - 5] = Math.round(seq[seq.length - 5] * 1.45);
  if (seq.length > 2) seq[seq.length - 2] = Math.round(seq[seq.length - 2] * 1.60);

  const utilSeq = seq.map((sp, i) => {
    // pretend total revolving limit is $8k; util ~ (rolling balance / limit)
    const bal = Math.max(0, sp - (i ? Math.round(seq[i - 1] * 0.9) : 1200));
    const pct = Math.min(95, Math.max(5, Math.round((bal / 8000) * 100)));
    return pct;
  });

  const monthly = months.map((m, i) => ({
    yyyymm: m.key,
    label: m.label,
    spend: seq[i],
    payments: Math.round(seq[i] * (0.85 + Math.random() * 0.25)), // 85–110% of spend
    utilPct: utilSeq[i],
  }));

  return {
    periodDays: 365,
    currency: "USD",
    monthly,
    newAccounts: [
      { id: "cc-new-1", name: "Rewards Plus", type: "credit", opened: yyyymm(daysAgo(75)) + "-10", limit: 3500 },
      { id: "store-1",  name: "Retail Store Card", type: "credit", opened: yyyymm(daysAgo(35)) + "-05", limit: 1200 },
    ],
    riskFlags: [
      { code: "UTIL_JUMP",   label: "Utilization jumped >15% MoM", month: monthly[monthly.length-2].yyyymm, severity: "med" },
      { code: "SPEND_SPIKE", label: "Spend spiked >40% vs recent avg", month: monthly[monthly.length-5].yyyymm, severity: "med" },
    ],
    overlimitEvents: 0,
    returnedPayments: 0,
  };
})();

/* Compute spikes vs trailing 3-month average */
function computeSpikes(monthly) {
  const out = [];
  for (let i = 3; i < monthly.length; i++) {
    const prev3 = monthly.slice(i - 3, i);
    const base = prev3.reduce((a, b) => a + b.spend, 0) / prev3.length;
    const delta = base ? ((monthly[i].spend - base) / base) * 100 : 0;
    out.push({
      yyyymm: monthly[i].yyyymm,
      label: monthly[i].label,
      spend: monthly[i].spend,
      deltaPct: Math.round(delta),
    });
  }
  return out.sort((a, b) => b.deltaPct - a.deltaPct);
}

/* ===============================
   Component
   =============================== */
export default function RecentBehavior() {
  const [data, setData] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(6); // last N months in KPIs/tips

  // load data with sample fallback
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

  const currency = data?.currency || "USD";
  const monthly = data?.monthly || [];
  const lastN = useMemo(
    () => monthly.slice(-Math.max(1, Math.min(range, monthly.length))),
    [monthly, range]
  );

  // KPIs (last N months)
  const newAcctCount = useMemo(() => {
    if (!data?.newAccounts?.length) return 0;
    const nMonthsAgo = daysAgo(range * 30);
    return data.newAccounts.filter((a) => new Date(a.opened) >= nMonthsAgo).length;
  }, [data, range]);

  const utilNow = lastN.length ? lastN[lastN.length - 1].utilPct : null;
  const utilPrev = lastN.length > 1 ? lastN[lastN.length - 2].utilPct : null;
  const utilDelta = utilNow != null && utilPrev != null ? utilNow - utilPrev : null;

  const spikes = useMemo(() => computeSpikes(monthly), [monthly]);
  const topSpikes = spikes.filter(s => s.deltaPct > 10).slice(0, 3); // show strongest positives

  const riskCount = (data?.riskFlags || []).length + (data?.overlimitEvents || 0) + (data?.returnedPayments || 0);

  // Tips (coach)
  const tips = useMemo(() => {
    const res = [];
    if ((utilNow ?? 0) >= 50) res.push("Pay down revolving balances to keep utilization < 30% (10% is great).");
    if (newAcctCount >= 2) res.push("Avoid opening more accounts for a few months to keep your score stable.");
    if (topSpikes.length) res.push("Review months with high spend; set category budgets or alerts.");
    if ((data?.returnedPayments || 0) > 0) res.push("Returned payments hurt—confirm autopay and sufficient funds.");
    if (res.length < 4) res.push("Keep on-time payments and low utilization for steady gains.");
    return res.slice(0, 4);
  }, [utilNow, newAcctCount, topSpikes, data]);

  // Sample-data toast
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (isSample) {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 2400);
      return () => clearTimeout(t);
    }
  }, [isSample]);

  // CSS (page-scoped)
  const CSS = `
  .rb-wrap{max-width:100%;margin:0 auto;padding:0 0 16px}
  .rb-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:4px 0 10px}
  .rb-sub{margin:0;color:#374151}
  .rb-ctrls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .rb-select{border:1px solid #d1d5db;background:#fff;border-radius:10px;padding:6px 10px;cursor:pointer}

  .rb-grid{display:grid;grid-template-columns:1fr 360px;gap:12px;align-items:start}
  @media (max-width: 980px){ .rb-grid{grid-template-columns:1fr} }

  .card{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .kpi-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:8px 0 12px}
  @media (max-width: 980px){ .kpi-row{grid-template-columns:repeat(2,1fr)} }
  .kpi{border:1px solid #e5e7eb;border-radius:10px;padding:10px;background:#f8fafc}
  .kpi .k{font-size:12px;color:#6b7280}
  .kpi .v{font-weight:800}
  .kpi .sub{font-size:12px;color:#6b7280}

  .bars{display:grid;grid-template-columns:repeat(12, 1fr);align-items:end;gap:6px;height:160px}
  .bar{display:grid;grid-template-rows:1fr auto;gap:6px}
  .fill{background:#60a5fa;border-radius:6px 6px 0 0}
  .lbl{font-size:10px;color:#6b7280;text-align:center}
  .avgline{position:relative;height:160px;margin-top:-160px}
  .avgline svg{display:block}

  .list{display:grid;gap:8px}
  .row{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px}
  .pill{border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;font-size:12px}
  .delta.up{color:#b91c1c}
  .delta.down{color:#16a34a}

  .coach{display:grid;gap:10px}
  .tip{border:1px solid #d1d5db;border-radius:12px;padding:10px;background:#f8fafc;font-weight:600}

  .toast-float{position:fixed;left:16px;bottom:16px;background:#fff;border:1px solid #d1d5db;border-radius:12px;box-shadow:0 10px 20px rgba(0,0,0,.12);padding:10px 12px;font-weight:800;z-index:80}
  @keyframes growH{from{height:0}}
  `;

  // Spend bars + moving average
  const maxSpend = Math.max(1, ...monthly.map(m => m.spend || 0));
  const ma3 = monthly.map((m, i, arr) => {
    const a = Math.max(0, i - 2), b = i + 1;
    const slice = arr.slice(a, b);
    const avg = slice.reduce((s, x) => s + (x.spend || 0), 0) / slice.length;
    return Math.round(avg);
  });

  // Util mini-line (right column)
  const utilSeries = monthly.map(m => m.utilPct ?? 0);
  const utilMax = Math.max(100, ...utilSeries);
  const utilPath = (() => {
    if (!utilSeries.length) return "";
    const W = 300, H = 120, pad = 8;
    const step = (W - pad*2) / (utilSeries.length - 1 || 1);
    const mapY = (v) => H - pad - ((v / utilMax) * (H - pad*2));
    return utilSeries.map((v, i) => `${i ? "L" : "M"} ${pad + i*step} ${mapY(v)}`).join(" ");
  })();

  return (
    <section className="page">
      <style>{CSS}</style>

      <div className="rb-wrap">
        {/* Header */}
        <div className="rb-head">
          <div>
            <h1 style={{ margin: 0 }}>Recent Behavior</h1>
            <p className="rb-sub">New accounts, spend spikes, utilization jumps, and other short-term signals.</p>
          </div>
          <div className="rb-ctrls">
            <label style={{ fontWeight: 700, color: "#374151" }}>Window</label>
            <select className="rb-select" value={range} onChange={(e) => setRange(Number(e.target.value))}>
              {[3, 6, 12].map(n => <option key={n} value={n}>Last {n} months</option>)}
            </select>
          </div>
        </div>

        {/* KPI row */}
        <div className="kpi-row">
          <div className="kpi">
            <div className="k">New accounts</div>
            <div className="v">{newAcctCount}</div>
            <div className="sub">opened in window</div>
          </div>
          <div className="kpi">
            <div className="k">Utilization (now)</div>
            <div className="v">{utilNow == null ? NA : `${utilNow}%`}</div>
            <div className="sub">{utilDelta == null ? "" : utilDelta >= 0 ? <span className="delta up">+{utilDelta}% vs prev</span> : <span className="delta down">{utilDelta}% vs prev</span>}</div>
          </div>
          <div className="kpi">
            <div className="k">Largest spend spike</div>
            <div className="v">{topSpikes.length ? `+${topSpikes[0].deltaPct}%` : "—"}</div>
            <div className="sub">{topSpikes.length ? `${topSpikes[0].label}` : "no spikes"}</div>
          </div>
          <div className="kpi">
            <div className="k">Risk events</div>
            <div className="v">{riskCount}</div>
            <div className="sub">flags & incidents</div>
          </div>
        </div>

        {/* BODY GRID */}
        <div className="rb-grid">
          {/* LEFT: Spend trend + lists */}
          <section className="card">
            <h3 style={{ marginTop: 0 }}>Monthly spend (last 12 months)</h3>
            {/* bars */}
            <div className="bars" role="img" aria-label="Monthly spend bars">
              {monthly.map((m, i) => (
                <div className="bar" key={m.yyyymm} title={`${m.label} • ${money(m.spend, currency)}`}>
                  <div
                    className="fill"
                    style={{ height: `${((m.spend || 0) / maxSpend) * 100}%`, animation: "growH .5s ease both" }}
                  />
                  {(i % 2 === 0 || i === monthly.length - 1) && <div className="lbl">{m.label}</div>}
                </div>
              ))}
            </div>
            {/* moving average overlay (thin line) */}
            <div className="avgline" aria-hidden>
              <svg width="100%" height="160" viewBox="0 0 720 160" preserveAspectRatio="none">
                {ma3.length > 1 && (() => {
                  const H = 160, W = 720, pad = 8;
                  const maxA = Math.max(1, ...ma3);
                  const step = (W - pad*2) / (ma3.length - 1);
                  const mapY = (v) => H - pad - ((v / maxA) * (H - pad*2));
                  const d = ma3.map((v, i) => `${i ? "L" : "M"} ${pad + i*step} ${mapY(v)}`).join(" ");
                  return <path d={d} fill="none" stroke="#0ea5e9" strokeWidth="2" opacity="0.85" />;
                })()}
              </svg>
            </div>

            {/* Top spikes list */}
            <h4 style={{ margin: "12px 0 6px" }}>Top spend spikes</h4>
            <div className="list">
              {topSpikes.length ? topSpikes.map((s) => (
                <div key={s.yyyymm} className="row">
                  <div><strong>{s.label}</strong> &nbsp; <span className="pill">+{s.deltaPct}%</span></div>
                  <div style={{ color: "#374151" }}>{money(s.spend, currency)}</div>
                </div>
              )) : <div className="row" style={{ color: "#6b7280" }}>No notable spikes detected.</div>}
            </div>

            {/* New accounts */}
            <h4 style={{ margin: "12px 0 6px" }}>New accounts</h4>
            <div className="list">
              {(data?.newAccounts || []).length ? data.newAccounts
                .sort((a,b) => new Date(b.opened) - new Date(a.opened))
                .map((a) => (
                  <div key={a.id} className="row">
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.name}
                      </strong>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Opened {new Date(a.opened).toLocaleDateString()} • <span className="pill">{a.type}</span>
                      </div>
                    </div>
                    {a.limit != null && <div className="pill">Limit {money(a.limit, currency)}</div>}
                  </div>
                )) : <div className="row" style={{ color: "#6b7280" }}>No new accounts in the last year.</div>}
            </div>
          </section>

          {/* RIGHT: Risk + Util trend + Coach */}
          <section className="card">
            <h3 style={{ marginTop: 0 }}>Utilization trend</h3>
            <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none" aria-label="Utilization line">
              <rect x="0" y="0" width="300" height="120" fill="#f8fafc" rx="8" />
              <path d={utilPath} fill="none" stroke="#f59e0b" strokeWidth="2" />
            </svg>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Last 12 months. Keep below 30% for best results.
            </div>

            <h3 style={{ margin: "12px 0 6px" }}>Risk events</h3>
            <div className="list">
              {(data?.riskFlags || []).map((f, i) => (
                <div key={i} className="row">
                  <div><strong>{f.label}</strong></div>
                  <div className="pill">{f.month}</div>
                </div>
              ))}
              {(data?.overlimitEvents || 0) > 0 && (
                <div className="row"><div><strong>Over-limit events</strong></div><div className="pill">{data.overlimitEvents}</div></div>
              )}
              {(data?.returnedPayments || 0) > 0 && (
                <div className="row"><div><strong>Returned payments</strong></div><div className="pill">{data.returnedPayments}</div></div>
              )}
              {!riskCount && <div className="row" style={{ color: "#6b7280" }}>No risk events in the last year.</div>}
            </div>

            <h3 style={{ margin: "12px 0 6px" }}>Coach</h3>
            <div className="coach">
              {tips.map((t, i) => <div className="tip" key={i}>{t}</div>)}
            </div>
          </section>
        </div>
      </div>

      {showToast && <div className="toast-float">Showing sample data (API not reachable).</div>}
    </section>
  );
}
