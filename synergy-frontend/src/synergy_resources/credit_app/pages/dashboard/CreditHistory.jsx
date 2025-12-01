// src/synergy_resources/credit_app/pages/dashboard/CreditHistory.jsx
import { useEffect, useMemo, useState } from "react";

/* ───────────────── Demo selection (same as Utilization) ───────────────── */
const DEFAULT_DEMO = "v1";
const FORCE_DEMO = false;
const DEMO_ENV = import.meta?.env?.VITE_DEMO;
const pickDemoKey = () => {
  const usp = new URLSearchParams(window.location.search);
  const fromUrl = usp.get("demo"); // ?demo=v1|v2
  return (fromUrl || DEMO_ENV || DEFAULT_DEMO).toLowerCase() === "v2" ? "v2" : "v1";
};

/* ───────────────── Helpers ───────────────── */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtPct = (n) => (typeof n === "number" ? `${Math.round(n * 100)}%` : "—"); // n assumed 0..1
const plural = (n, s) => `${n} ${s}${n === 1 ? "" : "s"}`;
const ageFmt = (months = 0) => {
  const y = Math.floor(months / 12), m = months % 12;
  if (y && m) return `${y}y ${m}m`;
  if (y) return `${y}y`;
  return `${m}m`;
};
const ymd = (d) => d.toISOString().slice(0, 10);

/* Endpoints (fallback to sample if unreachable) */
const API_PAY = "/api/data/payment-history";   // { onTimeRate, incidents:[{date,account,daysLate}], months:[{ym,status}] }
const API_AGE = "/api/data/credit-length";     // { avgMonths, oldestMonths, newestMonths, accounts:[{id,name,openedYm}] }

/* ───────────────── Samples (V1 & V2) ───────────────── */
function makeRecentMonths(n = 24) {
  const out = [];
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ ym: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}` });
  }
  return out;
}

/* ---------- V1 ---------- */
function samplePaymentHistoryV1() {
  const months = makeRecentMonths(24).map((m, idx) => {
    if (idx === 4)  return { ...m, status: "late30" };
    if (idx === 10) return { ...m, status: "late60" };
    if (idx === 18) return { ...m, status: "missed" };
    return { ...m, status: "on" };
  });
  const incidents = [
    { date: months[18].ym + "-12", account: "Chase Freedom", daysLate: 90 },
    { date: months[10].ym + "-10", account: "Citi Platinum", daysLate: 60 },
    { date: months[4].ym  + "-08", account: "US Bank Cash+", daysLate: 30 },
  ];
  const onCount = months.filter((m) => m.status === "on").length;
  const onTimeRate = Math.round((onCount / months.length) * 100);
  return { onTimeRate, months, incidents };
}
function sampleCreditLengthV1() {
  // Added utilization (0..1) + credit limit where it makes sense
  const accounts = [
    { id: "A1", name: "Chase Freedom",     openedYm: "2019-07", utilization: 0.18, limit: 8000 },
    { id: "A2", name: "Citi Platinum",     openedYm: "2021-02", utilization: 0.22, limit: 6000 },
    { id: "A3", name: "US Bank Cash+",     openedYm: "2020-05", utilization: 0.26, limit: 7000 },
    { id: "A4", name: "AmEx Blue",         openedYm: "2022-10", utilization: 0.12, limit: 9000 },
    { id: "A5", name: "Everyday Checking", openedYm: "2021-04" },
    { id: "A6", name: "Rainy Day Savings", openedYm: "2020-11" },
    { id: "A7", name: "Mortgage",          openedYm: "2019-12" },
    { id: "A8", name: "Student Loan",      openedYm: "2014-09" },
  ];
  const monthsSince = (ym) => {
    const [Y, M] = ym.split("-").map(Number);
    const d = new Date(Y, M - 1, 1);
    const now = new Date();
    return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  };
  const ages = accounts.map((a) => monthsSince(a.openedYm));
  const oldestMonths = Math.max(...ages);
  const newestMonths = Math.min(...ages);
  const avgMonths = Math.round(ages.reduce((s, v) => s + v, 0) / ages.length);
  return { avgMonths, oldestMonths, newestMonths, accounts };
}

/* ---------- V2 ---------- */
function samplePaymentHistoryV2() {
  const months = makeRecentMonths(24).map((m, idx) => (idx === 7 ? { ...m, status: "late30" } : { ...m, status: "on" }));
  const incidents = [{ date: months[7].ym + "-05", account: "Cashback Visa", daysLate: 30 }];
  const onCount = months.filter((m) => m.status === "on").length;
  const onTimeRate = Math.round((onCount / months.length) * 100);
  return { onTimeRate, months, incidents };
}
function sampleCreditLengthV2() {
  const accounts = [
    { id: "B1", name: "Cashback Visa",   openedYm: "2021-09", utilization: 0.14, limit: 10000 },
    { id: "B2", name: "AmEx Platinum",   openedYm: "2020-02", utilization: 0.19, limit: 14000 },
    { id: "B3", name: "Retail Card",     openedYm: "2018-10", utilization: 0.31, limit: 3000 },
    { id: "B4", name: "Joint Checking",  openedYm: "2023-02" },
    { id: "B5", name: "Emergency Fund",  openedYm: "2019-08" },
    { id: "B6", name: "Retirement 401k", openedYm: "2016-05" },
    { id: "B7", name: "Personal Loan",   openedYm: "2021-07" },
  ];
  const monthsSince = (ym) => {
    const [Y, M] = ym.split("-").map(Number);
    const d = new Date(Y, M - 1, 1);
    const now = new Date();
    return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  };
  const ages = accounts.map((a) => monthsSince(a.openedYm));
  const oldestMonths = Math.max(...ages);
  const newestMonths = Math.min(...ages);
  const avgMonths = Math.round(ages.reduce((s, v) => s + v, 0) / ages.length);
  return { avgMonths, oldestMonths, newestMonths, accounts };
}

/* bundle */
const demoData = (k) =>
  k === "v2"
    ? { pay: samplePaymentHistoryV2(), age: sampleCreditLengthV2(), key: "V2" }
    : { pay: samplePaymentHistoryV1(), age: sampleCreditLengthV1(), key: "V1" };

/* ───────────────── UI bits ───────────────── */
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
          <svg width="16" height="16" viewBox="0 0 24 24" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .18s" }}>
            <path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
const Chip = ({ children }) => <span className="chip">{children}</span>;
function BandBadge({ onTimeRate }) {
  const p = clamp(Math.round(onTimeRate ?? 0), 0, 100);
  const cfg =
    p >= 99 ? { t: "Perfect", c: "#0ea5e9", bg: "#eff6ff", b: "#bfdbfe" } :
    p >= 95 ? { t: "Excellent", c: "#10B981", bg: "#ecfdf5", b: "#a7f3d0" } :
    p >= 90 ? { t: "Good", c: "#84CC16", bg: "#f7fee7", b: "#d9f99d" } :
    p >= 80 ? { t: "Fair", c: "#F59E0B", bg: "#fffbeb", b: "#fde68a" } :
              { t: "Needs Work", c: "#EF4444", bg: "#fef2f2", b: "#fecaca" };
  return <span className="mini" style={{ color: cfg.c, background: cfg.bg, borderColor: cfg.b }}>{cfg.t}</span>;
}

/* calendar cell */
function Cell({ status, label }) {
  const map = {
    on: { c: "#10B981", text: "On-time" },
    late30: { c: "#84CC16", text: "30d late" },
    late60: { c: "#F59E0B", text: "60d late" },
    late90: { c: "#EF4444", text: "90d late" },
    missed: { c: "#991b1b", text: "Missed" },
  };
  const s = map[status] || map.on;
  return (
    <div className="ph-cell" title={s.text}>
      <div className="ph-dot" style={{ background: s.c }} />
      <div className="ph-l">{label}</div>
    </div>
  );
}

/* ───────────────── Main ───────────────── */
export default function CreditHistory() {
  /* CSS */
  const CSS = `
  .wrap{max-width:1100px;margin:0 auto;padding:0 10px}
  .hero{background: radial-gradient(1400px 320px at 50% -60px,#cfe8ff 0%,#dbeafe 40%,#eef2f7 100%);border:1px solid #d1d5db;border-radius:16px;padding:10px 12px;margin:4px 0 10px;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .chip{display:inline-flex;gap:6px;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:6px 9px;font-weight:800}

  .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}
  @media(max-width:880px){.summary{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.summary{grid-template-columns:1fr}}
  .stat{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px}
  .stat-k{font-size:12px;color:#6b7280}
  .stat-v{font-weight:900}

  .section{border:1px solid #d1d5db;border-radius:14px;background:#fff;box-shadow:0 6px 16px rgba(0,0,0,.06);overflow:hidden;margin:10px 0}
  .section-head{width:100%;background:transparent;border:none;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;cursor:pointer}
  .section-title{font-weight:900}
  .section-sub{color:#374151;font-size:12px;margin-top:2px}
  .section-right{display:flex;align-items:center;gap:10px}
  .mini{display:inline-flex;align-items:center;gap:6px;border:1px solid #d1d5db;background:#f8fafc;border-radius:10px;padding:6px 8px;font-weight:800}

  /* Keep inner width stable; no sideways expansion */
  .section-body{display:block}
  .section-body-inner{padding:12px;border-top:1px solid #e5e7eb;max-width:100%;overflow-x:hidden}

  .legend{display:flex;flex-wrap:wrap;gap:8px}
  .leg{display:inline-flex;gap:6px;align-items:center;background:#f8fafc;border:1px solid #e5e7eb;border-radius:999px;padding:4px 8px;font-size:12px}
  .dot{width:8px;height:8px;border-radius:999px}

  /* Horizontal-scrolling timeline container */
  .timeline-scroll{display:flex;gap:8px;overflow-x:auto;padding:6px 2px;scroll-behavior:smooth}
  .timeline-scroll::-webkit-scrollbar{height:6px}
  .timeline-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px}

  /* Month grid block — fixed min width to avoid reflow widening */
  .ph-grid{display:grid;grid-auto-flow:column;grid-auto-columns:80px;gap:8px;min-width:720px}

  .ph-cell{display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:6px}
  .ph-dot{width:10px;height:10px;border-radius:999px}
  .ph-l{font-size:11px;color:#374151}

  .counts{display:flex;flex-wrap:wrap;gap:8px}
  .count{display:inline-flex;gap:6px;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:6px 8px;font-weight:800}

  /* Combined timeline rows */
  .tl-acc{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin:8px 0;max-width:100%}
  .acc-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px}
  .pill{border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:800}
  .muted{color:#6b7280}
  .util-info{font-size:12px;color:#4b5563;background:#f3f4f6;border-radius:6px;padding:2px 6px}
  `;

  /* data loads */
  const [pay, setPay] = useState(null);
  const [age, setAge] = useState(null);
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("Showing sample data (API not reachable).");

  useEffect(() => {
    const key = pickDemoKey();
    const demo = demoData(key);

    if (FORCE_DEMO) {
      setPay(demo.pay);
      setAge(demo.age);
      setToastMsg(`Showing sample data (${demo.key}).`);
      setToast(true);
      const t = setTimeout(() => setToast(false), 2400);
      return () => clearTimeout(t);
    }

    let alive = true;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([fetch(API_PAY), fetch(API_AGE)]);
        if (!r1.ok || !r2.ok) throw new Error();
        const j1 = await r1.json();
        const j2 = await r2.json();
        if (!alive) return;
        setPay(j1);
        setAge(j2);
      } catch {
        if (!alive) return;
        setPay(demo.pay);
        setAge(demo.age);
        setToastMsg(`Showing sample data (${demo.key}) (API not reachable).`);
        setToast(true);
        setTimeout(() => setToast(false), 2400);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* Derived (global) */
  const months = pay?.months || [];              // 24 months list
  const incidents = pay?.incidents || [];        // [{date, account, daysLate}]
  const onTimeRate = (pay?.onTimeRate ?? null) / 100; // as 0..1 for fmtPct

  const totals = useMemo(() => {
    const t = { on: 0, late30: 0, late60: 0, late90: 0, missed: 0 };
    months.forEach((m) => { if (t[m.status] !== undefined) t[m.status] += 1; });
    return t;
  }, [months]);

  const oldest = age?.oldestMonths ?? null;
  const avg = age?.avgMonths ?? null;
  const newest = age?.newestMonths ?? null;
  const oldestMax = Math.max(1, oldest || 1);

  // month name labels (Jan..Dec... repeated)
  const labels = useMemo(() => {
    return months.map((m) => {
      const [Y, M] = m.ym.split("-").map(Number);
      const d = new Date(Y, M - 1, 1);
      return d.toLocaleString("en-US", { month: "short" });
    });
  }, [months]);

  /* ── Per-account 2-year history (integrates Credit Age + Payment History) ── */
  const monthsIndex = useMemo(() => {
    const map = new Map();
    months.forEach((m, i) => map.set(m.ym, i));
    return map;
  }, [months]);

  const mapLate = (days) =>
    days >= 90 ? "late90" : days >= 60 ? "late60" : days >= 30 ? "late30" : "on";

  // Merge account list from age.accounts and any incident-only accounts
  const accountMap = useMemo(() => {
    const m = new Map();
    (age?.accounts || []).forEach((a) =>
      m.set(a.name, { name: a.name, openedYm: a.openedYm, utilization: a.utilization, limit: a.limit })
    );
    incidents.forEach((ev) => {
      if (!m.has(ev.account)) m.set(ev.account, { name: ev.account, openedYm: null });
    });
    return m;
  }, [age?.accounts, incidents]);

  const perAccount = useMemo(() => {
    const out = [];
    const now = new Date();
    const monthsSince = (ym) => {
      if (!ym) return null;
      const [Y, M] = ym.split("-").map(Number);
      const d = new Date(Y, M - 1, 1);
      return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    };

    for (const acc of accountMap.values()) {
      const track = Array.from({ length: months.length }, (_, i) => ({ ...months[i], status: "on" }));
      incidents
        .filter((ev) => ev.account === acc.name)
        .forEach((ev) => {
          const ym = ev.date.slice(0, 7);
          const idx = monthsIndex.get(ym);
          if (idx != null) track[idx] = { ym, status: mapLate(ev.daysLate) };
        });

      out.push({
        name: acc.name,
        openedYm: acc.openedYm,
        ageMonths: acc.openedYm ? monthsSince(acc.openedYm) : null,
        utilization: acc.utilization,
        limit: acc.limit,
        months: track,
        incidents: incidents.filter((ev) => ev.account === acc.name).slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
      });
    }

    // Oldest first, then by name
    out.sort((a, b) => {
      const am = a.ageMonths ?? -1;
      const bm = b.ageMonths ?? -1;
      if (am !== bm) return bm - am;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [accountMap, months, monthsIndex, incidents]);

  // Accordions closed by default
  const [open, setOpen] = useState({ pay: false, combined: false });

  // per-account expand state
  const [exp, setExp] = useState(() => ({}));
  const toggleAcc = (name) => setExp((o) => ({ ...o, [name]: !o[name] }));

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="wrap">
        {/* Hero */}
        <div className="hero">
          <div>
            <h1 style={{ margin: 0 }}>Credit History</h1>
            <div className="chips">
              <Chip>On-time <strong>{fmtPct(onTimeRate)}</strong></Chip>
              <Chip>Oldest <strong>{oldest == null ? "—" : ageFmt(oldest)}</strong></Chip>
              <Chip>Average <strong>{avg == null ? "—" : ageFmt(avg)}</strong></Chip>
              <Chip>Window <strong>2y</strong></Chip>
            </div>
          </div>
          <BandBadge onTimeRate={Math.round((onTimeRate ?? 0) * 100)} />
        </div>

        {/* Summary */}
        <div className="summary">
          <div className="stat"><div className="stat-k">On-time rate</div><div className="stat-v">{fmtPct(onTimeRate)}</div></div>
          <div className="stat"><div className="stat-k">Oldest account</div><div className="stat-v">{oldest == null ? "—" : ageFmt(oldest)}</div></div>
          <div className="stat"><div className="stat-k">Average age</div><div className="stat-v">{avg == null ? "—" : ageFmt(avg)}</div></div>
          <div className="stat"><div className="stat-k">Newest account</div><div className="stat-v">{newest == null ? "—" : ageFmt(newest)}</div></div>
        </div>

        {/* Global view (2 years) — stays same width; inner area scrolls */}
        <Section
          title="Payment History (2 years)"
          subtitle="Scroll horizontally to view more months."
          right={<BandBadge onTimeRate={Math.round((onTimeRate ?? 0) * 100)} />}
          open={open.pay}
          onToggle={() => setOpen(o => ({ ...o, pay: !o.pay }))}
        >
          <div>
            {/* Legend */}
            <div className="legend" style={{ marginBottom: 8 }}>
              <span className="leg"><span className="dot" style={{ background:"#10B981" }} /> On-time</span>
              <span className="leg"><span className="dot" style={{ background:"#84CC16" }} /> 30d late</span>
              <span className="leg"><span className="dot" style={{ background:"#F59E0B" }} /> 60d late</span>
              <span className="leg"><span className="dot" style={{ background:"#EF4444" }} /> 90d late</span>
              <span className="leg"><span className="dot" style={{ background:"#991b1b" }} /> Missed</span>
            </div>

            {/* One continuous scrollable row of months */}
            {months.length ? (
              <div className="timeline-scroll" aria-label="Global payment history months">
                <div className="ph-grid">
                  {months.map((m, i) => <Cell key={m.ym} status={m.status} label={labels[i]} />)}
                </div>
              </div>
            ) : (
              <div className="muted">No payment data available.</div>
            )}

            <div className="counts" style={{ marginTop: 10 }}>
              <span className="count">✅ {plural(totals.on, "on-time")}</span>
              <span className="count">⏱️ {totals.late30} × 30d</span>
              <span className="count">⏱️ {totals.late60} × 60d</span>
              <span className="count">⏱️ {totals.late90} × 90d</span>
              <span className="count">❌ {plural(totals.missed, "missed")}</span>
            </div>
          </div>
        </Section>

        {/* Combined: per-account history + credit age + utilization/limit */}
        <Section
          title="Payment History & Timeline"
          subtitle="Scroll horizontally to view more months. Click an account to see its monthly history, utilization, and late events."
          right={<span className="mini">{perAccount.length} accounts</span>}
          open={open.combined}
          onToggle={() => setOpen(o => ({ ...o, combined: !o.combined }))}
        >
          <div>
            {perAccount.map((acc) => {
              const isOpen = !!exp[acc.name];
              return (
                <div key={acc.name} className="tl-acc">
                  <div className="acc-head">
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{acc.name}</strong>
                      {typeof acc.utilization === "number" && (
                        <span className="util-info">Avg util {fmtPct(acc.utilization)}{acc.limit ? ` • Limit $${acc.limit.toLocaleString()}` : ""}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="muted">
                        {acc.openedYm ? <>Opened {acc.openedYm}</> : "Opened —"}
                        {acc.ageMonths != null && <> • <strong>{ageFmt(acc.ageMonths)}</strong></>}
                      </span>
                      <button className="pill" onClick={() => toggleAcc(acc.name)} aria-expanded={isOpen}>
                        {isOpen ? "Hide history" : "Show history"}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 10 }}>
                      {/* Scrollable 2y calendar for this account */}
                      <div className="timeline-scroll" aria-label={`${acc.name} monthly history`}>
                        <div className="ph-grid">
                          {acc.months.map((m, i) => (
                            <Cell key={`${acc.name}-${m.ym}`} status={m.status} label={labels[i]} />
                          ))}
                        </div>
                      </div>

                      {/* Incident list (if any) */}
                      {acc.incidents.length > 0 ? (
                        <div style={{ marginTop: 10 }}>
                          {acc.incidents.map((ev, idx) => {
                            const sev =
                              ev.daysLate >= 90 ? { t: "90d late", c: "#EF4444" } :
                              ev.daysLate >= 60 ? { t: "60d late", c: "#F59E0B" } :
                              ev.daysLate >= 30 ? { t: "30d late", c: "#84CC16" } :
                              { t: "On-time", c: "#10B981" };
                            return (
                              <div key={idx} className="acc-head" style={{ paddingTop: 6 }}>
                                <div className="muted">{ymd(new Date(ev.date))}</div>
                                <span className="pill" style={{ borderColor: sev.c, color: sev.c }}>{sev.t}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="muted" style={{ marginTop: 10 }}>
                          No late payments on record for this account in the past 2 years.
                        </div>
                      )}

                      {/* Relative credit-age bar */}
                      {acc.ageMonths != null && oldestMax > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div className="muted">Relative age</div>
                          <div style={{ height: 10, background:"#eef2f7", borderRadius: 999, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${clamp((acc.ageMonths/oldestMax)*100,0,100)}%`, background:"#2563eb" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {perAccount.length === 0 && <div className="muted">No accounts to display.</div>}
          </div>
        </Section>
      </div>

      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </section>
  );
}
