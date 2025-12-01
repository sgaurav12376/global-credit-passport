// src/synergy_resources/credit_app/pages/dashboard/BehaviorTrends.jsx
import { useEffect, useMemo, useState } from "react";
import { CreditCard, SearchCheck, TrendingUp } from "lucide-react";

/* ───────────────── Endpoints & Samples ───────────────── */
const API_BEHAV = "/api/data/recent-behavior";
const API_INQ   = "/api/data/inquiries";

const SAMPLE_BEHAV = {
  recentAccounts: [
    { id: "A-1001", type: "credit card", issuer: "Chase",       opened: "2025-04-12" },
    { id: "A-1002", type: "auto loan",   issuer: "Capital One", opened: "2025-01-23" },
  ],
  // newest first
  spending: [
    { month: "2025-09", changePct:  +6, note: "Back-to-school shopping" },
    { month: "2025-08", changePct: +18, note: "Travel, hotels, flights" },
    { month: "2025-07", changePct:  -4, note: "Lower grocery spend" },
    { month: "2025-06", changePct:  +2, note: "Utilities up slightly" },
    { month: "2025-05", changePct:  -3, note: "" },
    { month: "2025-04", changePct:  +5, note: "Household items" },
    { month: "2025-03", changePct:  +1, note: "" },
    { month: "2025-02", changePct:  -2, note: "" },
    { month: "2025-01", changePct:  +3, note: "" },
    { month: "2024-12", changePct: +12, note: "Holiday shopping" },
    { month: "2024-11", changePct:  +4, note: "Black Friday" },
    { month: "2024-10", changePct:  -3, note: "" },
    { month: "2024-09", changePct:  +2, note: "" },
    { month: "2024-08", changePct:  +1, note: "" },
    { month: "2024-07", changePct:  -1, note: "" },
    { month: "2024-06", changePct:  +3, note: "" },
    { month: "2024-05", changePct:  +2, note: "" },
    { month: "2024-04", changePct:  -2, note: "" },
    { month: "2024-03", changePct:  +5, note: "" },
    { month: "2024-02", changePct:  -4, note: "" },
    { month: "2024-01", changePct:  +2, note: "" },
    { month: "2023-12", changePct:  +9, note: "" },
    { month: "2023-11", changePct:  +3, note: "" },
    { month: "2023-10", changePct:  -2, note: "" },
  ],
};

const SAMPLE_INQ = {
  inquiries: [
    { id: "I-1", date: "2025-09-02", bureau: "Experian",   purpose: "Credit Card", hard: true  },
    { id: "I-2", date: "2025-05-14", bureau: "Equifax",    purpose: "Auto Loan",   hard: true  },
    { id: "I-3", date: "2025-03-21", bureau: "TransUnion", purpose: "Prequal",     hard: false },
    { id: "I-4", date: "2024-12-05", bureau: "Experian",   purpose: "Mortgage",    hard: false },
  ],
};

/* ───────────────── Small helpers ───────────────── */
const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" }); }
  catch { return iso; }
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short", year: "2-digit" });
};

/* ───────────────── Demo category synthesis (used only if API lacks breakdown/util) ───────────────── */
const CATS = ["Grocery","Travel","Dining","Bills","Shopping","Education"];
function seededBreakdown(month, changePct) {
  const base = [22,18,15,20,17,8];
  const [, m] = month.split("-").map(Number);
  const rot = (m + 11) % CATS.length;
  const rotated = base.map((_, i) => base[(i + rot) % base.length]);
  const bump = Math.max(-8, Math.min(8, Math.round(changePct/3)));
  rotated[1] = clamp(rotated[1] + (changePct > 0 ? bump : 0), 5, 35);
  rotated[4] = clamp(rotated[4] + (changePct > 0 ? bump/2 : 0), 5, 35);
  const sum = rotated.reduce((a,b)=>a+b,0);
  return rotated.map((v,i)=>({ label: CATS[i], value: Math.round((v/sum)*100) }));
}
function monthUtilization(month, changePct) {
  return clamp(Math.round(28 + changePct * 0.8), 10, 95);
}

/* ───────────────── Pie helpers (CSS conic-gradient) ───────────────── */
function toPieStyle(parts, sizePx = 56) {
  const total = parts.reduce((a, p) => a + (p.value || 0), 0) || 1;
  let acc = 0;
  const segs = parts.map(p => {
    const start = (acc/total)*360; acc += p.value || 0;
    const end = (acc/total)*360;
    return `${pieColor(p.label)} ${start}deg ${end}deg`;
  }).join(", ");
  return {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    borderRadius: "999px",
    backgroundImage: `conic-gradient(${segs})`,
    border: "1px solid #e5e7eb",
  };
}
function pieColor(label){
  const map = {
    Grocery:"#93c5fd", Travel:"#a7f3d0", Dining:"#fbcfe8",
    Bills:"#fde68a", Shopping:"#c7d2fe", Education:"#fecaca"
  };
  return map[label] || "#e5e7eb";
}

/* ───────────────── Reusable Section (stable; no width jump) ───────────────── */
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

/* ───────────────── Page ───────────────── */
export default function BehaviorTrends() {
  const CSS = `
  .wrap{max-width:1100px;margin:0 auto;padding:0 10px}
  .hero{background:radial-gradient(1400px 320px at 50% -60px,#dbeafe 0%,#eef2f7 100%);
    border:1px solid #d1d5db;border-radius:16px;padding:10px 12px;margin:4px 0 10px;
    display:flex;align-items:center;justify-content:space-between;gap:10px}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;
    border-radius:999px;padding:6px 9px;font-weight:800}

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

  /* Pies & legends */
  .pie{display:inline-block;border-radius:999px}
  .legend{display:flex;flex-wrap:wrap;gap:6px}
  .legend-item{display:inline-flex;align-items:center;gap:6px;border:1px solid #e5e7eb;border-radius:999px;padding:4px 8px;background:#f9fafb}
  .swatch{width:10px;height:10px;border-radius:2px;border:1px solid #e5e7eb}

  /* Util bar */
  .util{display:flex;align-items:center;gap:6px}
  .util-bar{width:120px;height:8px;border:1px solid #e5e7eb;border-radius:999px;overflow:hidden;background:#f3f4f6}
  .util-fill{height:100%;background:#93c5fd}

  .toast{position:fixed;left:16px;bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;
    box-shadow:0 10px 24px rgba(0,0,0,.18);padding:10px 12px;font-weight:800;opacity:0;transform:translateY(6px);
    transition:opacity .18s,transform .18s;z-index:80}
  .toast.show{opacity:1;transform:translateY(0)}
  `;

  /* state */
  const [behav, setBehav] = useState(null);
  const [inq, setInq] = useState(null);
  const [open, setOpen] = useState({ openings: false, inq: false, spend: false });
  const [inqTab, setInqTab] = useState("all"); // all | hard | soft
  const [q, setQ] = useState("");
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [expandedMonth, setExpandedMonth] = useState(null); // spending month id

  /* load with graceful fallback */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rb, ri] = await Promise.all([fetch(API_BEHAV), fetch(API_INQ)]);
        const okb = rb.ok, oki = ri.ok;
        const jb = okb ? await rb.json() : SAMPLE_BEHAV;
        const ji = oki ? await ri.json() : SAMPLE_INQ;
        if (!alive) return;
        setBehav(jb);
        setInq(ji);
        if (!okb || !oki) {
          setToastMsg("Showing sample data (API not reachable).");
          setToast(true);
          setTimeout(() => setToast(false), 2400);
        }
      } catch {
        if (!alive) return;
        setBehav(SAMPLE_BEHAV);
        setInq(SAMPLE_INQ);
        setToastMsg("Showing sample data (API not reachable).");
        setToast(true);
        setTimeout(() => setToast(false), 2400);
      }
    })();
    return () => { alive = false; };
  }, []);

  const recentAccounts = behav?.recentAccounts ?? [];
  const spendingRaw = behav?.spending ?? [];
  const inquiriesRaw = inq?.inquiries ?? [];

  /* ── Inquiries derived (tabs + search) ── */
  const inquiries = useMemo(() => {
    let data = inquiriesRaw.slice().sort((a,b)=> (a.date < b.date ? 1 : -1));
    if (inqTab === "hard") data = data.filter(i => i.hard);
    if (inqTab === "soft") data = data.filter(i => !i.hard);
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      data = data.filter(i =>
        i.bureau.toLowerCase().includes(qq) ||
        (i.purpose || "").toLowerCase().includes(qq)
      );
    }
    return data;
  }, [inquiriesRaw, inqTab, q]);

  const hardCount = inquiriesRaw.filter(i => i.hard).length;
  const softCount = inquiriesRaw.length - hardCount;

  /* ── Spending derived (last 24m) ── */
  const spending24 = useMemo(() => {
    const sorted = spendingRaw.slice().sort((a,b)=> (a.month < b.month ? 1 : -1));
    return sorted.slice(0, 24);
  }, [spendingRaw]);

  // Per-month breakdown/util (prefer API fields if present)
  const monthParts = (s) => s.breakdown && s.breakdown.length ? s.breakdown : seededBreakdown(s.month, s.changePct);
  const monthUtil  = (s) => typeof s.utilization === "number" ? s.utilization : monthUtilization(s.month, s.changePct);

  // Overall 24m mix
  const overallMix = useMemo(() => {
    const acc = new Map();
    spending24.forEach(s => {
      monthParts(s).forEach(p => acc.set(p.label, (acc.get(p.label) || 0) + p.value));
    });
    const entries = Array.from(acc.entries()).map(([label, value]) => ({ label, value }));
    const sum = entries.reduce((a,b)=>a+b.value,0) || 1;
    return entries.map(e => ({ ...e, value: Math.round((e.value/sum)*100) }));
  }, [spending24]);

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="wrap">
        {/* Hero */}
        <div className="hero">
          <div>
            <h1 style={{ margin: 0 }}>Behavior & Inquiries</h1>
            <div className="chips">
              <span className="chip"><CreditCard size={14}/> New Accounts <strong>{recentAccounts.length}</strong></span>
              <span className="chip"><SearchCheck size={14}/> Inquiries <strong>{inquiriesRaw.length}</strong></span>
              <span className="chip"><SearchCheck size={14}/> Hard <strong>{hardCount}</strong></span>
              <span className="chip"><SearchCheck size={14}/> Soft <strong>{softCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Recent account openings (no link; date on the right) */}
        <Section
          title="Recent Account Openings"
          subtitle="Newly opened credit lines"
          open={open.openings}
          onToggle={()=>setOpen(o=>({...o, openings:!o.openings}))}
          right={<span className="mini">{recentAccounts.length}</span>}
        >
          <div>
            {recentAccounts.length === 0 && <div className="muted">No new accounts found.</div>}
            {recentAccounts.map(a=>(
              <div key={a.id} className="row">
                <div style={{ fontWeight: 700 }}>
                  {a.issuer} <span className="muted">— {a.type}</span>
                </div>
                <div className="muted" style={{ marginLeft: "auto" }}>{fmtDate(a.opened)}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Inquiries with tabs (no external link; compact search) */}
        <Section
          title="Credit Inquiries"
          subtitle="Hard = affects score; Soft = prequal / account review"
          open={open.inq}
          onToggle={()=>setOpen(o=>({...o, inq:!o.inq}))}
          right={<span className="mini">{inquiriesRaw.length}</span>}
        >
          <div>
            <div className="filters">
              <button className={`btn ${inqTab==="all"?"active":""}`}  onClick={()=>setInqTab("all")}>All ({inquiriesRaw.length})</button>
              <button className={`btn ${inqTab==="hard"?"active":""}`} onClick={()=>setInqTab("hard")}>Hard ({hardCount})</button>
              <button className={`btn ${inqTab==="soft"?"active":""}`} onClick={()=>setInqTab("soft")}>Soft ({softCount})</button>
              <input className="search" style={{ flex: "0 0 180px", maxWidth: 180 }} placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
            </div>

            {inquiries.length === 0 && <div className="muted">No inquiries match your view.</div>}

            {inquiries.map(i=>(
              <div key={i.id} className="row">
                <div style={{ fontWeight: 700 }}>{i.bureau} <span className="muted">— {i.purpose || "—"}</span></div>
                <div className="muted">{fmtDate(i.date)}</div>
                <span className={`pill`} style={{ color: i.hard ? "#ef4444" : "#10b981" }}>
                  {i.hard ? "Hard" : "Soft"}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Spending trends (overall pie + per-month pies; NO sparkline, NO change badge, NO stat chips) */}
        <Section
          title="Spending Trends"
          subtitle="Last 24 months • Click a month row to toggle details"
          open={open.spend}
          onToggle={()=>setOpen(o=>({...o, spend:!o.spend}))}
          right={<span className="mini"><TrendingUp size={14}/> 24m</span>}
        >
          <div>
            {/* Overall 24m Mix Pie (kept; simple high-level view) */}
            <div className="row" style={{ alignItems:"center" }}>
              <div style={{ fontWeight: 700 }}>Overall Mix (24 months)</div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div className="pie" style={toPieStyle(overallMix, 56)} aria-label="Overall spending mix (24m)"></div>
                <div className="legend">
                  {overallMix.map(p=>(
                    <span key={p.label} className="legend-item">
                      <span className="swatch" style={{ background: pieColor(p.label) }} />
                      <span className="muted">{p.label}</span>
                      <strong>{p.value}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Month rows (newest → older). Click row to toggle details. */}
            {spending24.map((s) => {
              const openM = expandedMonth === s.month;
              const parts = monthParts(s);
              const util = monthUtil(s);

              return (
                <div
                  key={s.month}
                  className="row"
                  onClick={()=>setExpandedMonth(openM ? null : s.month)}
                  style={{ cursor:"pointer" }}
                  aria-expanded={openM}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div className="pie" style={toPieStyle(parts, 48)} aria-hidden />
                    <div style={{ display:"flex", flexDirection:"column" }}>
                      <div style={{ fontWeight: 700 }}>{monthLabel(s.month)}</div>
                      <div className="muted">{s.note || "—"}</div>
                    </div>
                  </div>

                  <div className="util">
                    <span className="muted">Utilization</span>
                    <div className="util-bar" aria-hidden>
                      <div className="util-fill" style={{ width: `${util}%` }} />
                    </div>
                    <strong>{util}%</strong>
                  </div>

                  {openM && (
                    <div style={{ width:"100%" }}>
                      {/* Month breakdown legend ONLY (no change badge/stat chips) */}
                      <div className="legend" style={{ marginTop:8 }}>
                        {parts.map(p=>(
                          <span key={p.label} className="legend-item">
                            <span className="swatch" style={{ background: pieColor(p.label) }} />
                            <span className="muted">{p.label}</span>
                            <strong>{p.value}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </section>
  );
}
