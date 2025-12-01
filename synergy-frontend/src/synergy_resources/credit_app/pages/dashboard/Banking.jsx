import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* =========================
   Config / helpers
   ========================= */
const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
const API_URL  = `${API_BASE}/api/data/banking`;
const NA = "—";
const fm = (n, c = "USD") =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n)
    : NA;
const pct = (n) => (typeof n === "number" ? `${Math.round(n)}%` : NA);

/* =========================
   Page
   ========================= */
export default function Banking() {
  /* ---- page-scoped CSS ---- */
  const CSS = `
  .container{max-width:100%;margin:0 auto;padding:0 10px}
  .page-header{display:grid;gap:6px;margin-bottom:10px}
  .page-sub{color:#374151;margin:0}

  /* KPI strip */
  .bk-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin:6px 0 12px}
  @media(max-width:1200px){.bk-kpis{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:760px){.bk-kpis{grid-template-columns:repeat(2,1fr)}}
  .kpi{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .kpi .k{color:#6b7280;font-size:12px;margin-bottom:4px}
  .kpi .v{font-weight:800}
  .kpi .sub{color:#6b7280;font-size:12px;margin-top:2px}
  .flag{display:inline-flex;align-items:center;gap:6px;border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:4px 8px;font-weight:700;font-size:12px}
  .flag.ok{color:#10b981;border-color:#d1fae5;background:#f0fdf4}
  .flag.warn{color:#f59e0b;border-color:#fef3c7;background:#fffbeb}
  .flag.danger{color:#b91c1c;border-color:#fee2e2;background:#fef2f2}

  /* Controls */
  .bk-headrow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
  .bk-controls{display:flex;gap:8px;align-items:center}
  .bk-input{padding:8px 10px;border:1px solid #d1d5db;border-radius:10px;width:220px;background:#fff}
  .bk-select{border:1px solid #d1d5db;background:#fff;padding:8px 10px;border-radius:10px;cursor:pointer}

  /* Layout */
  .bk-layout{display:grid;grid-template-columns:2fr 1fr;gap:12px;align-items:start;margin-top:6px}
  @media(max-width:1040px){.bk-layout{grid-template-columns:1fr}}

  /* Left column sections */
  .sec{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .sec h3{margin:0 0 8px}

  /* Accounts row */
  .acct-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
  .acct{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:10px;display:grid;gap:6px}
  .acct-top{display:flex;gap:8px;align-items:center}
  .acct-ico{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:#eef2f7;border:1px solid #e5e7eb}
  .acct-name{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .acct-sub{font-size:12px;color:#6b7280}
  .acct-row{display:flex;justify-content:space-between;font-size:14px}
  .acct-k{color:#6b7280}
  .acct-v{font-weight:700}
  .progress{height:10px;background:#eef2f7;border-radius:999px;overflow:hidden}
  .bar{height:100%;width:0;background:#10b981;animation:fillGrow .6s ease forwards}

  /* Monthly bars + sparkline */
  .month-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px}
  @media(max-width:900px){.month-grid{grid-template-columns:repeat(6,1fr)}}
  @media(max-width:520px){.month-grid{grid-template-columns:repeat(4,1fr)}}
  .mbar{display:grid;gap:4px;align-items:end}
  .mbar .lab{font-size:11px;color:#6b7280;text-align:center}
  .mbar .bars{display:grid;gap:2px}
  .mbar .inc{background:#10b981;border-radius:4px}
  .mbar .exp{background:#ef4444;border-radius:4px}

  .spark{width:100%;height:60px}
  .spark path{fill:none;stroke:#2563eb;stroke-width:2}

  /* Merchants & Recurring */
  .list{display:grid;gap:6px}
  .item{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff}
  .item .left{display:flex;gap:8px;align-items:center}
  .pill{border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;font-size:12px;color:#374151}

  /* Transactions table */
  .table{width:100%;border-collapse:separate;border-spacing:0 8px}
  .th{font-size:12px;color:#6b7280;text-align:left;padding:0 8px}
  .tr{background:#fff;border:1px solid #e5e7eb;border-radius:10px}
  .td{padding:10px 8px}
  .td.right{text-align:right}
  .type-credit{color:#10b981;font-weight:800}
  .type-debit{color:#ef4444;font-weight:800}

  /* Coach */
  .coach{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .coach h3{margin:0 0 8px}
  .coach-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}
  .coach-chip{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:6px 10px;font-weight:700;text-decoration:none;color:#111827}
  .coach-chip:hover{background:#f8fbff;border-color:#c9d3e0}
  .tips{display:grid;gap:8px}
  .tip{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px;box-shadow:0 4px 10px rgba(0,0,0,.06);font-size:14px}

  /* Toast */
  .sample-toast{position:fixed;right:20px;bottom:20px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 10px 24px rgba(0,0,0,.18);padding:12px 14px;font-weight:700;color:#111827;opacity:0;transform:translateY(6px);transition:opacity .18s,transform .18s;z-index:80}
  .sample-toast.show{opacity:1;transform:translateY(0)}

  .err{color:#b91c1c;margin-top:8px}
  @keyframes fillGrow{from{width:0}}
  `;

  /* ---- data ---- */
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  /* ---- UI state ---- */
  const [range, setRange] = useState(6); // months
  const [q, setQ]       = useState("");
  const [type, setType] = useState("all"); // all | credit | debit | fees

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
          setData(getSampleBanking());
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3600);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  /* ---- derived ---- */
  const currency = data?.currency || "USD";
  const k = data?.kpis || {};

  const months = useMemo(() => {
    const all = data?.monthly || [];
    return all.slice(-range);
  }, [data, range]);

  const tx = useMemo(() => {
    const all = (data?.transactions || []).filter((t) => {
      const d = new Date(t.date);
      const min = new Date();
      min.setMonth(min.getMonth() - range);
      return d >= min;
    });
    const filtered =
      type === "all" ? all : all.filter((t) => t.type === type || (type === "fees" && t.category === "fees"));
    const s = q.toLowerCase().trim();
    const searched = !s
      ? filtered
      : filtered.filter((t) =>
          [t.merchant, t.category, t.accountName, t.notes].filter(Boolean).join(" ").toLowerCase().includes(s)
        );
    return searched.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
  }, [data, range, q, type]);

  const coachTips = useMemo(() => {
    const tips = [];
    if (k.daysOfCash != null && k.daysOfCash < 30) tips.push("Increase buffer to at least 30 days of expenses.");
    if ((data?.flags || []).some((f) => f.type === "overdraft")) tips.push("Avoid overdrafts by enabling low-balance alerts.");
    if (k.incomeStabilityPct != null && k.incomeStabilityPct < 85) tips.push("Income is variable — try to smooth with a reserve transfer each payday.");
    if ((data?.recurring || []).some((b) => !b.autopay)) tips.push("Enable autopay for recurring bills to protect on-time history.");
    return tips.slice(0, 4);
  }, [k, data]);

  /* ---- helpers for visuals ---- */
  const maxAbs = Math.max(
    1,
    ...months.flatMap((m) => [Math.abs(m.income || 0), Math.abs(m.expenses || 0)])
  );

  const sparkPath = useMemo(() => {
    if (!months.length) return "";
    const w = 280, h = 60;
    const xs = months.map((_, i) => (i / (months.length - 1)) * (w - 4) + 2);
    const maxNet = Math.max(...months.map((m) => m.net));
    const minNet = Math.min(...months.map((m) => m.net));
    const scaleY = (v) => {
      if (maxNet === minNet) return h / 2;
      const t = (v - minNet) / (maxNet - minNet);
      return h - 6 - t * (h - 12);
    };
    return xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${scaleY(months[i].net)}`).join(" ");
  }, [months]);

  /* ---- render ---- */
  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="container">
        {/* Header */}
        <header className="page-header">
          <h1 style={{ margin: 0 }}>Banking</h1>
          <p className="page-sub">Cash-flow signals from bank activity: income, expenses, buffers and stability.</p>
        </header>

        {/* KPIs */}
        <section className="bk-kpis" aria-label="Key metrics">
          <div className="kpi"><div className="k">Avg Monthly Income</div><div className="v">{fm(k.avgIncome, currency)}</div></div>
          <div className="kpi"><div className="k">Avg Monthly Expenses</div><div className="v">{fm(k.avgExpenses, currency)}</div></div>
          <div className="kpi"><div className="k">Net Cash Flow</div><div className="v">{fm(k.netCashFlow, currency)}</div><div className="sub">Income − Expenses</div></div>
          <div className="kpi"><div className="k">Days of Cash</div><div className="v">{k.daysOfCash ?? NA}</div><div className="sub">Buffer at current burn</div></div>
          <div className="kpi"><div className="k">Income Stability</div><div className="v">{pct(k.incomeStabilityPct)}</div><div className="sub">Pay consistency</div></div>
          <div className="kpi">
            <div className="k">Expense Volatility</div>
            <div className="v">{pct(k.expenseVolatilityPct)}</div>
            <div className="sub">{(data?.flags || []).some(f => f.type==="overdraft") ? <span className="flag danger">Overdrafts</span> : <span className="flag ok">No overdrafts</span>}</div>
          </div>
        </section>

        {/* Controls */}
        <div className="bk-headrow">
          <div className="bk-controls">
            <select className="bk-select" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Time range">
              {[3,6,12,18].map((m)=> <option key={m} value={m}>{m} mo</option>)}
            </select>
            <select className="bk-select" value={type} onChange={(e)=>setType(e.target.value)} aria-label="Filter type">
              <option value="all">All</option>
              <option value="credit">Credits (income)</option>
              <option value="debit">Debits (spend)</option>
              <option value="fees">Fees</option>
            </select>
            <input className="bk-input" placeholder="Search transactions…" value={q} onChange={(e)=>setQ(e.target.value)} />
          </div>
          <div className="flag" title="Last updated">
            Updated {k.lastUpdated ? new Date(k.lastUpdated).toLocaleDateString() : NA}
          </div>
        </div>

        {/* Content & Coach */}
        <div className="bk-layout">
          <div className="left-col" style={{ display:"grid", gap:12 }}>
            {/* Accounts */}
            <section className="sec" aria-label="Accounts">
              <h3>Linked accounts</h3>
              <div className="acct-grid">
                {(data?.accounts || []).map((a, i) => {
                  const util = a.type === "credit" && a.creditLimit ? Math.max(0, Math.min(1, (a.currentBalance || 0) / a.creditLimit)) : null;
                  const ico = a.type === "depository" ? "🏦" : a.type === "credit" ? "💳" : "📈";
                  const color = a.type === "depository" ? "#0ea5e9" : a.type === "credit" ? "#6366f1" : "#10b981";
                  return (
                    <article key={i} className="acct">
                      <div className="acct-top">
                        <div className="acct-ico" style={{ color }}>{ico}</div>
                        <div style={{ minWidth:0 }}>
                          <div className="acct-name" title={a.name}>{a.name}</div>
                          <div className="acct-sub">{a.institution || "Institution"}</div>
                        </div>
                        <span className="pill" style={{ marginLeft:"auto" }}>{a.type}</span>
                      </div>
                      <div className="acct-row"><div className="acct-k">Balance</div><div className="acct-v">{fm(a.currentBalance, currency)}</div></div>
                      {a.type === "credit" && a.creditLimit != null && (
                        <>
                          <div className="acct-row"><div className="acct-k">Credit limit</div><div className="acct-v">{fm(a.creditLimit, currency)}</div></div>
                          <div className="acct-row"><div className="acct-k">Utilization</div><div className="acct-v">{util != null ? Math.round(util*100)+"%" : NA}</div></div>
                          <div className="progress"><div className="bar" style={{ width: (util || 0)*100 + "%", background: color }} /></div>
                        </>
                      )}
                    </article>
                  );
                })}
                {(data?.accounts || []).length === 0 && <div className="acct">No accounts.</div>}
              </div>
            </section>

            {/* Monthly cash flow */}
            <section className="sec" aria-label="Monthly cash flow">
              <h3>Monthly cash flow</h3>
              <div className="month-grid" style={{ marginBottom: 8 }}>
                {months.map((m, i) => {
                  const incH = Math.max(4, (Math.abs(m.income || 0) / maxAbs) * 60);
                  const expH = Math.max(4, (Math.abs(m.expenses || 0) / maxAbs) * 60);
                  const mm = new Date(m.month+"-01");
                  const label = mm.toLocaleDateString(undefined, { month: "short" });
                  return (
                    <div key={i} className="mbar" title={`${label}: ${fm(m.income,currency)} in / ${fm(m.expenses,currency)} out`}>
                      <div className="bars">
                        <div className="inc" style={{ height: incH }} />
                        <div className="exp" style={{ height: expH }} />
                      </div>
                      <div className="lab">{label}</div>
                    </div>
                  );
                })}
              </div>
              <svg className="spark" viewBox="0 0 280 60" role="img" aria-label="Net cash flow trend">
                <path d={sparkPath} />
              </svg>
            </section>

            {/* Top merchants & Recurring bills */}
            <section className="sec" aria-label="Spending insights">
              <h3>Spending insights</h3>
              <div className="list">
                <div className="item">
                  <div className="left"><strong>Top merchants</strong></div>
                  <div className="pill">Last {range} mo</div>
                </div>
                {(data?.merchants || []).slice(0,8).map((m,i)=>(
                  <div key={i} className="item">
                    <div className="left">{m.name}</div>
                    <div>{fm(m.spend, currency)}</div>
                  </div>
                ))}
                {(data?.merchants || []).length === 0 && <div className="item"><div className="left">No merchant data.</div></div>}
              </div>

              <div className="list" style={{ marginTop: 10 }}>
                <div className="item">
                  <div className="left"><strong>Recurring bills</strong></div>
                  <div className="pill">Autopay</div>
                </div>
                {(data?.recurring || []).map((b,i)=>(
                  <div key={i} className="item">
                    <div className="left">{b.name} <span className="pill">due {b.dayOfMonth}</span></div>
                    <div>{fm(b.amount, currency)} {b.autopay ? <span className="flag ok" style={{ marginLeft:8 }}>On</span> : <span className="flag warn" style={{ marginLeft:8 }}>Off</span>}</div>
                  </div>
                ))}
                {(data?.recurring || []).length === 0 && <div className="item"><div className="left">No recurring bills detected.</div></div>}
              </div>
            </section>

            {/* Transactions */}
            <section className="sec" aria-label="Recent transactions">
              <h3>Recent transactions</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Merchant</th>
                    <th className="th">Category</th>
                    <th className="th">Account</th>
                    <th className="th right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {tx.map((t) => (
                    <tr key={t.id} className="tr">
                      <td className="td">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="td">{t.merchant || t.description || "—"}</td>
                      <td className="td">{t.category || "—"}</td>
                      <td className="td">{t.accountName || "—"}</td>
                      <td className={`td right ${t.type === "credit" ? "type-credit" : "type-debit"}`}>
                        {t.type === "credit" ? "+" : "-"}{fm(Math.abs(t.amount), currency)}
                      </td>
                    </tr>
                  ))}
                  {tx.length === 0 && (
                    <tr className="tr"><td className="td" colSpan={5}>No transactions match your filters.</td></tr>
                  )}
                </tbody>
              </table>
              {err && <div className="err">⚠️ {err}</div>}
            </section>
          </div>

          {/* Coach */}
          <aside className="coach">
            <h3>Coach</h3>
            <div className="coach-chips">
              <Link to="/payment-history" className="coach-chip">Payment history</Link>
              <Link to="/utilization" className="coach-chip">Utilization</Link>
              <Link to="/recent-behavior" className="coach-chip">Recent behavior</Link>
              <Link to="/adverse-records" className="coach-chip">Adverse records</Link>
            </div>
            <div className="tips">
              {coachTips.map((t) => <div key={t} className="tip">• {t}</div>)}
              {coachTips.length === 0 && <div className="tip">Looking solid—keep your buffer and avoid fees.</div>}
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

/* =========================
   Sample fallback generator
   ========================= */
function getSampleBanking() {
  // build 12 months of sample cashflow ending this month
  const today = new Date();
  const ym = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const income = 5200 + Math.round((Math.sin(i/2)*120 + Math.random()*90));
    const expenses = 4100 + Math.round((Math.cos(i/3)*150 + Math.random()*140));
    months.push({ month: ym(d.getFullYear(), d.getMonth()), income, expenses, net: income - expenses });
  }

  const tx = [];
  let id = 1;
  const mkTx = (date, amt, type, merchant, category, accountName) =>
    tx.push({ id: id++, date, amount: amt, type, merchant, category, accountName });

  // last 60 days of sample transactions
  for (let i = 0; i < 60; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const isPayday = d.getDate() === 1 || d.getDate() === 15;
    if (isPayday) mkTx(d.toISOString(), 2600, "credit", "Direct Deposit", "income", "Checking");
    // a few debits daily
    const spend = Math.round(15 + Math.random()*85);
    mkTx(d.toISOString(), spend, "debit", ["Amazon","Groceries","Coffee","Uber","Target"][Math.floor(Math.random()*5)], "everyday", "Checking");
    if (Math.random() < 0.12) mkTx(d.toISOString(), 4.99, "debit", "Bank Fee", "fees", "Checking");
  }

  return {
    currency: "USD",
    kpis: {
      avgIncome: Math.round(months.slice(-6).reduce((s,m)=>s+m.income,0)/6),
      avgExpenses: Math.round(months.slice(-6).reduce((s,m)=>s+m.expenses,0)/6),
      netCashFlow: Math.round(months.slice(-6).reduce((s,m)=>s+m.net,0)/6),
      daysOfCash: 36,
      incomeStabilityPct: 92,
      expenseVolatilityPct: 18,
      lastUpdated: new Date().toISOString(),
    },
    flags: [{ type: "overdraft", count: 0 }],
    accounts: [
      { name: "Everyday Checking", type: "depository", institution: "Chase", currentBalance: 2450.27 },
      { name: "Savings",           type: "depository", institution: "Chase", currentBalance: 7200.11 },
      { name: "Visa Signature",    type: "credit",     institution: "Capital One", currentBalance: 860.32, creditLimit: 5000 },
      { name: "Brokerage",         type: "investment", institution: "Fidelity", currentBalance: 12550.88 },
    ],
    monthly: months,
    merchants: [
      { name: "Amazon",   spend: 420 },
      { name: "Whole Foods", spend: 360 },
      { name: "Uber",     spend: 210 },
      { name: "Target",   spend: 180 },
      { name: "Starbucks", spend: 95 },
    ],
    recurring: [
      { name: "Rent", amount: 1850, dayOfMonth: 1,  autopay: true  },
      { name: "Verizon Wireless", amount: 86, dayOfMonth: 12, autopay: true  },
      { name: "Spectrum Internet", amount: 70, dayOfMonth: 20, autopay: false },
    ],
    transactions: tx,
  };
}
