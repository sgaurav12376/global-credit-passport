// src/synergy_resources/credit_app/pages/dashboard/BankingInsights.jsx
import { useEffect, useMemo, useState } from "react";
import { Landmark } from "lucide-react";

const API_BANK = "/api/data/banking-insights";

/* ───────────────── Demo datasets ───────────────── */
const SAMPLE_V1 = [
  { month: "2024-09", income: 4800, expense: 5100 }, // neg
  { month: "2024-10", income: 5050, expense: 4900 },
  { month: "2024-11", income: 5200, expense: 5400 }, // neg (Black Friday)
  { month: "2024-12", income: 5300, expense: 5700 }, // neg (Holidays)
  { month: "2025-01", income: 5200, expense: 4700 },
  { month: "2025-02", income: 5150, expense: 5200 }, // near flat
  { month: "2025-03", income: 5450, expense: 5000 },
  { month: "2025-04", income: 5400, expense: 5200 },
  { month: "2025-05", income: 5600, expense: 5900 }, // neg (travel)
  { month: "2025-06", income: 5400, expense: 4800 },
  { month: "2025-07", income: 5600, expense: 4900 },
  { month: "2025-08", income: 5500, expense: 5200 },
  { month: "2025-09", income: 5550, expense: 5600 }, // slight neg
  { month: "2025-10", income: 5650, expense: 5300 },
  { month: "2025-11", income: 5750, expense: 5900 }, // neg (sales)
  { month: "2025-12", income: 5900, expense: 6100 }, // neg (holidays)
  { month: "2026-01", income: 5850, expense: 5400 },
  { month: "2026-02", income: 5800, expense: 5550 },
  { month: "2026-03", income: 6000, expense: 5900 },
  { month: "2026-04", income: 6100, expense: 5850 },
  { month: "2026-05", income: 6200, expense: 6450 }, // neg
  { month: "2026-06", income: 6150, expense: 5900 },
  { month: "2026-07", income: 6250, expense: 6000 },
  { month: "2026-08", income: 6300, expense: 6350 }, // slight neg
];

const SAMPLE_V2 = [
  { month: "2024-09", income: 5200, expense: 4600 },
  { month: "2024-10", income: 5150, expense: 5300 }, // neg
  { month: "2024-11", income: 5250, expense: 5200 },
  { month: "2024-12", income: 5400, expense: 5850 }, // neg
  { month: "2025-01", income: 5000, expense: 4800 },
  { month: "2025-02", income: 5050, expense: 5250 }, // neg
  { month: "2025-03", income: 5200, expense: 5100 },
  { month: "2025-04", income: 5350, expense: 5200 },
  { month: "2025-05", income: 5450, expense: 5600 }, // neg
  { month: "2025-06", income: 5550, expense: 5200 },
  { month: "2025-07", income: 5700, expense: 5750 }, // slight neg
  { month: "2025-08", income: 5650, expense: 5250 },
  { month: "2025-09", income: 5600, expense: 5400 },
  { month: "2025-10", income: 5580, expense: 5620 }, // near flat
  { month: "2025-11", income: 5620, expense: 6000 }, // neg
  { month: "2025-12", income: 5750, expense: 5900 }, // neg
  { month: "2026-01", income: 5900, expense: 5600 },
  { month: "2026-02", income: 6000, expense: 6200 }, // neg
  { month: "2026-03", income: 6150, expense: 5800 },
  { month: "2026-04", income: 6200, expense: 6000 },
  { month: "2026-05", income: 6350, expense: 6400 }, // slight neg
  { month: "2026-06", income: 6400, expense: 6100 },
  { month: "2026-07", income: 6500, expense: 6550 }, // slight neg
  { month: "2026-08", income: 6600, expense: 6200 },
];

/* Pick demo from ?demo=v1|v2 or VITE_DEMO */
function pickDemo() {
  const params = new URLSearchParams(window.location.search);
  const q = (params.get("demo") || import.meta?.env?.VITE_DEMO || "v1").toLowerCase();
  return q === "v2" ? SAMPLE_V2 : SAMPLE_V1;
}

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
      {open && (
        <div className="section-body">
          <div className="section-body-inner">{children}</div>
        </div>
      )}
    </article>
  );
}

const fmtUSD = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short", year: "2-digit" });
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function BankingInsights() {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState({ trend: false, summary: false });
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API_BANK);
        const ok = r.ok;
        const data = ok ? await r.json() : pickDemo();
        if (!alive) return;
        setRows(Array.isArray(data) ? data : pickDemo());
        if (!ok) {
          setToastMsg("Showing sample data (API not reachable).");
          setToast(true);
          setTimeout(() => setToast(false), 2400);
        }
      } catch {
        if (!alive) return;
        setRows(pickDemo());
        setToastMsg("Showing sample data (API not reachable).");
        setToast(true);
        setTimeout(() => setToast(false), 2400);
      }
    })();
    return () => { alive = false; };
  }, []);

  const data = rows ?? pickDemo();
  const ordered = useMemo(
    () => data.slice().sort((a, b) => (a.month < b.month ? -1 : 1)), // oldest → newest
    [data]
  );

  const totals = useMemo(() => {
    const income = ordered.reduce((s, r) => s + (r.income || 0), 0);
    const expense = ordered.reduce((s, r) => s + (r.expense || 0), 0);
    const net = income - expense;
    const months = ordered.length || 1;
    const avgIncome = Math.round(income / months);
    const avgExpense = Math.round(expense / months);
    const perMonthRates = ordered
      .map((r) => (r.income > 0 ? (r.income - r.expense) / r.income : 0))
      .filter((x) => Number.isFinite(x));
    const avgSavingsRate = Math.round((perMonthRates.reduce((s, x) => s + x, 0) / (perMonthRates.length || 1)) * 100);
    const annotated = ordered.map((r) => ({ ...r, net: (r.income || 0) - (r.expense || 0) }));
    const best = annotated.reduce((a, b) => (a.net >= b.net ? a : b), annotated[0] || { month: "", net: 0 });
    const worst = annotated.reduce((a, b) => (a.net <= b.net ? a : b), annotated[0] || { month: "", net: 0 });
    const pos = annotated.filter((r) => r.net >= 0).length;
    const neg = annotated.length - pos;
    return { income, expense, net, avgIncome, avgExpense, avgSavingsRate, best, worst, pos, neg };
  }, [ordered]);

  const maxVal = useMemo(() => {
    const maxI = Math.max(...ordered.map((r) => r.income || 0), 1);
    const maxE = Math.max(...ordered.map((r) => r.expense || 0), 1);
    return Math.max(maxI, maxE);
  }, [ordered]);

  const CSS = `
  .wrap{max-width:1100px;margin:0 auto;padding:0 10px}
  .hero{background:radial-gradient(1400px 320px at 50% -60px,#dcfce7 0%,#f0fdf4 100%);
    border:1px solid #d1d5db;border-radius:16px;padding:10px 12px;margin:4px 0 10px;
    display:flex;align-items:center;justify-content:space-between;gap:10px}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:6px 9px;font-weight:800}

  .section{border:1px solid #d1d5db;border-radius:14px;background:#fff;margin:10px 0;
    box-shadow:0 6px 16px rgba(0,0,0,.06);overflow:hidden}
  .section-head{width:100%;border:none;background:transparent;text-align:left;display:flex;align-items:center;
    justify-content:space-between;padding:12px;cursor:pointer}
  .section-title{font-weight:900}
  .section-sub{color:#374151;font-size:12px;margin-top:2px}
  .section-right{display:flex;align-items:center;gap:8px}
  .mini{display:inline-flex;align-items:center;gap:6px;border:1px solid #d1d5db;background:#f8fafc;border-radius:10px;padding:6px 8px;font-weight:800}

  .section-body{display:block}
  .section-body-inner{padding:12px;border-top:1px solid #e5e7eb;max-width:100%}

  .row{display:flex;align-items:center;justify-content:space-between;border:1px solid #e5e7eb;border-radius:10px;
    padding:8px 10px;background:#fff;margin-bottom:8px;gap:10px;flex-wrap:wrap}
  .muted{color:#6b7280;font-size:12px}
  .pill{border:1px solid #d1d5db;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:800}

  /* Inline bars */
  .bars{display:flex;align-items:center;gap:10px;min-width:260px}
  .bar{height:8px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:999px;overflow:hidden}
  .income{width:140px}
  .expense{width:140px}
  .fill-income{height:100%;background:#86efac}
  .fill-expense{height:100%;background:#93c5fd}

  /* Summary grid */
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
  .card{border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;padding:10px}
  .value{font-weight:900;font-size:18px}
  .label{font-size:12px;color:#6b7280}

  .toast{position:fixed;left:16px;bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;
    box-shadow:0 10px 24px rgba(0,0,0,.18);padding:10px 12px;font-weight:800;opacity:0;transform:translateY(6px);
    transition:opacity .18s,transform .18s;z-index:80}
  .toast.show{opacity:1;transform:translateY(0)}
  `;

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="wrap">
        {/* Hero */}
        <div className="hero">
          <div>
            <h1 style={{ margin: 0 }}>Banking Insights</h1>
            <div className="chips">
              <span className="chip">
                <Landmark size={14}/> Net Flow <strong>{totals.net >= 0 ? "+" : ""}{fmtUSD(totals.net)}</strong>
              </span>
              <span className="chip">Avg Savings Rate <strong>{totals.avgSavingsRate}%</strong></span>
              <span className="chip">Positive Months <strong>{totals.pos}/{ordered.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Monthly Flow */}
        <Section
          title="Monthly Flow"
          subtitle="Income vs Expense (oldest to newest)"
          open={open.trend}
          onToggle={()=>setOpen(o=>({...o, trend:!o.trend}))}
          right={<span className="mini">{ordered.length}</span>}
        >
          <div>
            {ordered.map((r)=> {
              const net = (r.income || 0) - (r.expense || 0);
              const iw = Math.round((clamp(r.income || 0, 0, maxVal) / maxVal) * 140);
              const ew = Math.round((clamp(r.expense || 0, 0, maxVal) / maxVal) * 140);
              return (
                <div key={r.month} className="row">
                  <div style={{ fontWeight: 700 }}>{monthLabel(r.month)}</div>

                  <div className="bars">
                    <div className="bar income" aria-label="income bar">
                      <div className="fill-income" style={{ width: `${iw}px` }} />
                    </div>
                    <span className="muted">{fmtUSD(r.income)}</span>

                    <div className="bar expense" aria-label="expense bar">
                      <div className="fill-expense" style={{ width: `${ew}px` }} />
                    </div>
                    <span className="muted">{fmtUSD(r.expense)}</span>
                  </div>

                  <span className="pill" style={{ color: net >= 0 ? "#10b981" : "#ef4444" }}>
                    Net {net >= 0 ? "+" : ""}{fmtUSD(net)}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Summary */}
        <Section
          title="Summary"
          subtitle="Totals and averages for the selected period"
          open={open.summary}
          onToggle={()=>setOpen(o=>({...o, summary:!o.summary}))}
          right={<span className="mini">Overview</span>}
        >
          <div className="grid">
            <div className="card">
              <div className="value">{fmtUSD(totals.income)}</div>
              <div className="label">Total Income</div>
            </div>
            <div className="card">
              <div className="value">{fmtUSD(totals.expense)}</div>
              <div className="label">Total Expense</div>
            </div>
            <div className="card">
              <div className="value">{totals.net >= 0 ? "+" : ""}{fmtUSD(totals.net)}</div>
              <div className="label">Net Flow</div>
            </div>
            <div className="card">
              <div className="value">{fmtUSD(totals.avgIncome)}</div>
              <div className="label">Avg Monthly Income</div>
            </div>
            <div className="card">
              <div className="value">{fmtUSD(totals.avgExpense)}</div>
              <div className="label">Avg Monthly Expense</div>
            </div>
            <div className="card">
              <div className="value">{totals.avgSavingsRate}%</div>
              <div className="label">Avg Savings Rate</div>
            </div>
            <div className="card">
              <div className="value">{totals.pos} / {ordered.length}</div>
              <div className="label">Positive Months</div>
            </div>
            <div className="card">
              <div className="value">{totals.neg}</div>
              <div className="label">Negative Months</div>
            </div>
            <div className="card">
              <div className="value">
                {monthLabel(totals.best?.month || "—")} · {totals.best ? (totals.best.net >= 0 ? "+" : "") + fmtUSD(totals.best.net) : "—"}
              </div>
              <div className="label">Best Month (by net)</div>
            </div>
            <div className="card">
              <div className="value">
                {monthLabel(totals.worst?.month || "—")} · {totals.worst ? (totals.worst.net >= 0 ? "+" : "") + fmtUSD(totals.worst.net) : "—"}
              </div>
              <div className="label">Worst Month (by net)</div>
            </div>
          </div>
        </Section>
      </div>

      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </section>
  );
}
