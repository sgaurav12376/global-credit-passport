// src/synergy_resources/credit_app/pages/dashboard/RiskProfile.jsx
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, DollarSign, ShieldCheck } from "lucide-react";

const API_ADV = "/api/data/adverse";
const API_ALT = "/api/data/alt-data";

/* ─────────────── Samples (used on fallback) ─────────────── */
const SAMPLE_ADV = [
  { id: 1, type: "Collection", creditor: "ABC Collections", amount: 620,  lastReported: "2025-07-11" },
  { id: 2, type: "Charge-off", creditor: "CardCo",          amount: 1300, lastReported: "2024-12-21" },
  { id: 3, type: "Late 60d",    creditor: "Auto Finance",   amount: 0,    lastReported: "2025-03-15" },
];
const SAMPLE_ALT = [
  { id: 1, provider: "AT&T",          onTimePct: 99, months: 24, avgBill: 92,  lastPaid: "2025-09-05", autopay: true,  currentBalance: 0 },
  { id: 2, provider: "Water Utility", onTimePct: 97, months: 24, avgBill: 48,  lastPaid: "2025-09-12", autopay: false, currentBalance: 0 },
  { id: 3, provider: "Electric",      onTimePct: 98, months: 24, avgBill: 120, lastPaid: "2025-09-08", autopay: true,  currentBalance: 15 },
];

/* ─────────────── Dictionaries ─────────────── */
const TYPE_DESC = {
  "Collection": "Unpaid debt placed with a collection agency.",
  "Charge-off": "Creditor wrote off the debt as a loss.",
  "Late 30d":   "Payment made 30+ days after due date.",
  "Late 60d":   "Payment made 60+ days after due date.",
  "Late 90d":   "Payment made 90+ days after due date.",
  "Bankruptcy": "Court proceeding to discharge debts.",
  "Foreclosure":"Lender repossessed property for nonpayment.",
  "Tax Lien":   "Government claim for unpaid taxes."
};

/* ─────────────── Reusable Section ─────────────── */
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

/* ─────────────── Helpers ─────────────── */
const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" }); }
  catch { return iso; }
};
const daysSince = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
  return `${diff}d`;
};
const currency = (n) => (typeof n === "number" ? n.toLocaleString(undefined, { style:"currency", currency:"USD", maximumFractionDigits: 0 }) : "—");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ─────────────── Page ─────────────── */
export default function RiskProfile() {
  const CSS = `
  .wrap{max-width:1100px;margin:0 auto;padding:0 10px}
  .hero{background:radial-gradient(1400px 320px at 50% -60px,#fef3c7 0%,#fff7ed 100%);
    border:1px solid #d1d5db;border-radius:16px;padding:10px 12px;margin:4px 0 10px;
    display:flex;align-items:center;justify-content:space-between;gap:10px}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
  .chip{position:relative;display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;
    border-radius:999px;padding:8px 11px;font-weight:800}
  .chip .tip{pointer-events:none;position:absolute;left:0;top:calc(100% + 8px);z-index:30;min-width:260px;
    background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.15);
    padding:10px 12px;font-weight:600;opacity:0;transform:translateY(4px);transition:opacity .16s,transform .16s}
  .chip:hover .tip{opacity:1;transform:translateY(0)}

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
    padding:10px;background:#fff;margin-bottom:8px;gap:12px;flex-wrap:wrap}
  .muted{color:#6b7280;font-size:12px}
  .pill{border:1px solid #d1d5db;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:800;background:#f9fafb}

  .bar{width:180px; height:8px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:999px; overflow:hidden}
  .bar-fill{height:100%; background:#93c5fd}

  .toast{position:fixed;left:16px;bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;
    box-shadow:0 10px 24px rgba(0,0,0,.18);padding:10px 12px;font-weight:800;opacity:0;transform:translateY(6px);
    transition:opacity .18s,transform .18s;z-index:80}
  .toast.show{opacity:1;transform:translateY(0)}
  `;

  const [adv, setAdv] = useState(null);
  const [alt, setAlt] = useState(null);
  const [open, setOpen] = useState({ adv: false, alt: false });
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ra, ru] = await Promise.all([fetch(API_ADV), fetch(API_ALT)]);
        const oka = ra.ok, oku = ru.ok;
        const ja = oka ? await ra.json() : SAMPLE_ADV;
        const ju = oku ? await ru.json() : SAMPLE_ALT;
        if (!alive) return;
        setAdv(ja); setAlt(ju);
        if (!oka || !oku) {
          setToastMsg("Showing sample data (API not reachable).");
          setToast(true); setTimeout(()=>setToast(false), 2400);
        }
      } catch {
        if (!alive) return;
        setAdv(SAMPLE_ADV); setAlt(SAMPLE_ALT);
        setToastMsg("Showing sample data (API not reachable).");
        setToast(true); setTimeout(()=>setToast(false), 2400);
      }
    })();
    return () => { alive = false; };
  }, []);

  const advList = adv ?? [];
  const altList = alt ?? [];

  const openIssues = useMemo(() => advList.length, [advList]);
  const totalOwed  = useMemo(() => advList.reduce((s,a)=> s + (Number(a.amount)||0), 0), [advList]);
  const avgOnTime  = useMemo(() => {
    if (!altList.length) return 0;
    const sum = altList.reduce((s,u)=> s + (Number(u.onTimePct)||0), 0);
    return Math.round(sum / altList.length);
  }, [altList]);

  const breakdownByType = useMemo(() => {
    const map = new Map();
    advList.forEach(a => map.set(a.type, (map.get(a.type)||0)+1));
    return Array.from(map.entries()).map(([k,v])=>`${k}: ${v}`).join(" • ");
  }, [advList]);
  const owedByType = useMemo(() => {
    const map = new Map();
    advList.forEach(a => map.set(a.type, (map.get(a.type)||0)+(Number(a.amount)||0)));
    return Array.from(map.entries()).map(([k,v])=>`${k}: ${currency(v)}`).join(" • ");
  }, [advList]);
  const onTimeByProvider = useMemo(() => {
    return altList.map(u=>`${u.provider}: ${clamp(Number(u.onTimePct)||0,0,100)}%`).join(" • ");
  }, [altList]);

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="hero">
          <div>
            <h1 style={{ margin: 0 }}>Adverse & Risk Records</h1>
            <div className="chips">
              <span className="chip"><AlertTriangle size={14}/> Open Issues <strong>{openIssues}</strong>
                <span className="tip">Why {openIssues}?<br/>{breakdownByType || "No items"}</span>
              </span>
              <span className="chip"><DollarSign size={14}/> Total Owed <strong>{currency(totalOwed)}</strong>
                <span className="tip">Breakdown<br/>{owedByType || "No balances"}</span>
              </span>
              <span className="chip"><ShieldCheck size={14}/> Avg On-time <strong>{avgOnTime}%</strong>
                <span className="tip">By provider<br/>{onTimeByProvider || "No providers"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Adverse Records */}
        <Section
          title="Adverse Records"
          subtitle="Negative items that can impact your credit"
          open={open.adv}
          onToggle={()=>setOpen(o=>({...o, adv:!o.adv}))}
          right={<span className="mini">{advList.length}</span>}
        >
          <div>
            {advList.length === 0 && <div className="muted">No adverse items found.</div>}
            {advList.map(a=> {
              const desc = TYPE_DESC[a.type] || "Reported derogatory event.";
              return (
                <div key={a.id} className="row">
                  <div style={{ display:"flex", flexDirection:"column", minWidth: 250 }}>
                    <strong>{a.type}</strong>
                    <span className="muted">{a.creditor || "—"}</span>
                    <span className="muted">{desc}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span className="pill">{currency(a.amount)}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", minWidth:160 }}>
                    <span className="muted">Last reported: {fmtDate(a.lastReported)}</span>
                    <span className="muted">Age: {daysSince(a.lastReported)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Alternative Data */}
        <Section
          title="Alternative Data"
          subtitle="Utility & telecom payment signals"
          open={open.alt}
          onToggle={()=>setOpen(o=>({...o, alt:!o.alt}))}
          right={<span className="mini">{altList.length}</span>}
        >
          <div>
            {altList.length === 0 && <div className="muted">No alternative data providers.</div>}
            {altList.map(u=>(
              <div key={u.id} className="row">
                <div style={{ display:"flex", flexDirection:"column", minWidth:220 }}>
                  <strong>{u.provider}</strong>
                  <span className="muted">{u.months ? `${u.months} mo history` : "—"}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span className="muted">On-time</span>
                  <div className="bar" aria-hidden>
                    <div className="bar-fill" style={{ width: `${clamp(Number(u.onTimePct)||0,0,100)}%` }} />
                  </div>
                  <strong>{clamp(Number(u.onTimePct)||0,0,100)}%</strong>
                </div>
                <div className="muted" style={{ minWidth:120 }}>Avg bill {u.avgBill ? currency(u.avgBill) : "—"}</div>
                <div className="muted" style={{ minWidth:140 }}>Last paid {fmtDate(u.lastPaid)}</div>
                <div className="pill" style={{ minWidth:90, textAlign:"center" }}>
                  {u.autopay ? "Autopay: On" : "Autopay: Off"}
                </div>
                <div className="muted" style={{ minWidth:140 }}>Balance {u.currentBalance!=null ? currency(u.currentBalance) : "—"}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toastMsg}
      </div>
    </section>
  );
}
