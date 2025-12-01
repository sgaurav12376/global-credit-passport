import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* =========================
   Config & helpers
   ========================= */
const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
const API_URL  = `${API_BASE}/api/data/inquiries`;
const NA = "—";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const monthsBetween = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
};
const fmtDate = (iso) =>
  !iso ? NA : new Date(iso).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"2-digit" });
const rel = (iso) => {
  const m = monthsBetween(iso);
  if (m === 0) return "this month";
  if (m === 1) return "1 mo ago";
  if (m < 12) return `${m} mo ago`;
  const y = Math.floor(m / 12);
  const rem = m % 12;
  return rem ? `${y}y ${rem}m ago` : `${y}y ago`;
};

const KIND = {
  hard: { label: "Hard", color: "#ef4444", chipBg: "#fef2f2", icon: "🔎" },
  soft: { label: "Soft", color: "#0ea5e9", chipBg: "#eff6ff", icon: "🪶" },
};
const BUREAU_COLOR = {
  EXPERIAN: "#6366f1", TRANSUNION: "#10b981", EQUIFAX: "#f59e0b",
  CIBIL: "#8b5cf6", OTHER: "#6b7280",
};

function impactLevel(hard12) {
  if (hard12 <= 1) return { label: "Low", color: "#10b981" };
  if (hard12 <= 3) return { label: "Moderate", color: "#f59e0b" };
  return { label: "Higher", color: "#ef4444" };
}

/* Accepts either { inquiries: [...] } or [...] */
function normalizePayload(j) {
  const list = Array.isArray(j) ? j : Array.isArray(j?.inquiries) ? j.inquiries : [];
  // ensure minimal fields and consistent casing
  return list.map((q, i) => ({
    id: q.id || `inq_${i}`,
    date: q.date || q.createdAt || new Date().toISOString(),
    type: (q.type || q.kind || "hard").toLowerCase(), // "hard" | "soft"
    bureau: (q.bureau || q.agency || "OTHER").toUpperCase(),
    requester: q.requester || q.institution || q.issuer || "Unknown",
    reason: q.reason || q.purpose || "Credit evaluation",
    country: q.country || q.market || "",
  }));
}

function sampleData() {
  const now = new Date();
  const mAgo = (m) => new Date(now.getFullYear(), now.getMonth() - m, 10).toISOString();
  return normalizePayload([
    { date: mAgo(1),  type:"hard", bureau:"EXPERIAN",   requester:"Chase Bank",      reason:"Credit card", country:"US" },
    { date: mAgo(2),  type:"soft", bureau:"EXPERIAN",   requester:"Discover (soft)", reason:"Account review", country:"US" },
    { date: mAgo(3),  type:"hard", bureau:"TRANSUNION", requester:"Capital One",     reason:"Credit card", country:"US" },
    { date: mAgo(7),  type:"hard", bureau:"EQUIFAX",    requester:"Toyota Finance",  reason:"Auto loan", country:"US" },
    { date: mAgo(14), type:"soft", bureau:"TRANSUNION", requester:"Your Bank",       reason:"Pre-approval", country:"US" },
    { date: mAgo(15), type:"hard", bureau:"EXPERIAN",   requester:"Mortgage Lender", reason:"Mortgage", country:"US" },
    { date: mAgo(20), type:"hard", bureau:"CIBIL",      requester:"HDFC Bank",       reason:"Credit card", country:"IN" },
    { date: mAgo(22), type:"soft", bureau:"EQUIFAX",    requester:"Fintech App",     reason:"Account check", country:"US" },
  ]);
}

/* =========================
   Page
   ========================= */
export default function Inquiries() {
  const CSS = `
  .container{max-width:100%;margin:0 auto;padding:0 10px}
  .page-header{display:grid;gap:6px;margin-bottom:10px}
  .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:8px 0 12px}
  @media(max-width:1100px){.kpis{grid-template-columns:repeat(2,1fr)}}
  .kpi{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .kpi .k{color:#6b7280;font-size:12px;margin-bottom:4px}
  .kpi .v{font-weight:800}
  .kpi .pill{display:inline-flex;align-items:center;gap:6px;border:1px solid currentColor;border-radius:999px;padding:4px 8px;font-weight:800;font-size:12px}
  .kpi .dot{width:8px;height:8px;border-radius:999px;background:currentColor}

  .toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 10px}
  .input{padding:8px 10px;border:1px solid #d1d5db;border-radius:10px;background:#fff;min-width:220px}
  .select{padding:8px 10px;border:1px solid #d1d5db;border-radius:10px;background:#fff}

  .grid{display:grid;grid-template-columns:2fr 1fr;gap:12px;align-items:start}
  @media(max-width:1020px){.grid{grid-template-columns:1fr}}

  .card{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .card h3{margin:0 0 8px}

  /* List */
  .list{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
  .item{display:grid;gap:8px;border:1px solid #d1d5db;background:#fff;border-radius:12px;padding:10px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .line1{display:flex;justify-content:space-between;gap:10px;align-items:center}
  .rq{font-weight:800;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .meta{display:flex;flex-wrap:wrap;gap:6px}
  .chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:800;border:1px solid}
  .chip.bureau{background:#f8fafc}
  .chip.kind{}
  .desc{color:#374151;font-size:13px}
  .time{color:#6b7280;font-size:12px}

  /* Histogram */
  .histo{display:grid;gap:8px}
  .bars{display:flex;align-items:flex-end;gap:6px;height:120px}
  .bar{flex:1;background:#e5e7eb;border-radius:6px;position:relative;overflow:hidden}
  .bar .fill{position:absolute;left:0;right:0;bottom:0;height:0;background:#111827}
  .bar .lbl{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:10px;color:#6b7280}
  .legend{display:flex;gap:10px;align-items:center;font-size:12px}
  .lg{display:inline-flex;align-items:center;gap:6px}
  .sw{width:12px;height:12px;border-radius:3px;background:#111827}

  /* Coach */
  .coach{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .coach h3{margin:0 0 8px}
  .tips{display:grid;gap:8px}
  .tip{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px;box-shadow:0 4px 10px rgba(0,0,0,.06);font-size:14px}

  /* Toast */
  .sample-toast{position:fixed;right:20px;bottom:20px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 10px 24px rgba(0,0,0,.18);padding:12px 14px;font-weight:700;color:#111827;opacity:0;transform:translateY(6px);transition:opacity .18s,transform .18s;z-index:80}
  .sample-toast.show{opacity:1;transform:translateY(0)}
  @keyframes fillGrow{from{height:0}}
  `;

  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all"); // all | hard | soft
  const [windowM, setWindowM] = useState(24); // 12 | 24

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch(API_URL, { signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const list = normalizePayload(j);
        if (!ac.signal.aborted) setRows(list);
      } catch {
        if (!ac.signal.aborted) {
          setRows(sampleData());
          setToast(true);
          setTimeout(() => setToast(false), 3600);
        }
      }
    })();
    return () => ac.abort();
  }, []);

  // filter/search
  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - windowM);
    return rows
      .filter(r => (type === "all" ? true : r.type === type))
      .filter(r => (windowM ? new Date(r.date) >= cutoff : true))
      .filter(r => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return [r.requester, r.reason, r.bureau, r.type, r.country]
          .filter(Boolean).join(" ").toLowerCase().includes(s);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [rows, type, windowM, q]);

  const hard12 = useMemo(
    () => rows.filter(r => r.type === "hard" && monthsBetween(r.date) <= 12).length,
    [rows]
  );
  const soft12 = useMemo(
    () => rows.filter(r => r.type === "soft" && monthsBetween(r.date) <= 12).length,
    [rows]
  );
  const lastInquiry = useMemo(() => {
    if (!rows.length) return null;
    return rows.slice().sort((a,b) => new Date(b.date) - new Date(a.date))[0];
  }, [rows]);

  // build 24m histogram of HARD inquiries per month label like "M-11 … M-0"
  const hist = useMemo(() => {
    const months = 24;
    const now = new Date();
    const arr = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      return { key, y: 0, label: d.toLocaleDateString(undefined, { month: "short" }) };
    });
    rows.forEach((r) => {
      if (r.type !== "hard") return;
      const d = new Date(r.date);
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      const bin = arr.find(b => b.key === key);
      if (bin) bin.y++;
    });
    const maxY = Math.max(1, ...arr.map(b => b.y));
    arr.forEach(b => b.h = (b.y / maxY) * 100);
    return arr;
  }, [rows]);

  const impact = impactLevel(hard12);

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="container">
        {/* Header */}
        <header className="page-header">
          <h1 style={{ margin:0 }}>Inquiries</h1>
          <p className="page-sub">Hard vs. soft pulls and their short-term impact.</p>
        </header>

        {/* KPIs */}
        <section className="kpis" aria-label="Key metrics">
          <div className="kpi">
            <div className="k">Hard inquiries (12m)</div>
            <div className="v">{hard12}</div>
            <div className="sub">More hard checks can lower your score briefly</div>
          </div>
          <div className="kpi">
            <div className="k">Soft inquiries (12m)</div>
            <div className="v">{soft12}</div>
            <div className="sub">Soft checks don’t affect your score</div>
          </div>
          <div className="kpi" style={{ color: impact.color }}>
            <div className="k">Impact likelihood</div>
            <div className="v">
              <span className="pill"><span className="dot" /> {impact.label}</span>
            </div>
            <div className="sub">Based on hard pulls in the last 12 months</div>
          </div>
          <div className="kpi">
            <div className="k">Last inquiry</div>
            <div className="v">{lastInquiry ? fmtDate(lastInquiry.date) : NA}</div>
            <div className="sub">{lastInquiry ? rel(lastInquiry.date) : "—"}</div>
          </div>
        </section>

        {/* Filter/Search toolbar */}
        <div className="toolbar" role="region" aria-label="Filters">
          <input
            className="input"
            placeholder="Search by bank, bureau, reason…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">Type: All</option>
            <option value="hard">Hard only</option>
            <option value="soft">Soft only</option>
          </select>
          <select className="select" value={windowM} onChange={(e) => setWindowM(Number(e.target.value))}>
            <option value={12}>Window: 12 months</option>
            <option value={24}>Window: 24 months</option>
          </select>
        </div>

        {/* Body */}
        <div className="grid">
          {/* LEFT: List */}
          <section className="card">
            <h3>All inquiries ({filtered.length})</h3>
            <div className="list">
              {filtered.map((r) => {
                const kind = KIND[r.type] || KIND.hard;
                const bcol = BUREAU_COLOR[r.bureau] || BUREAU_COLOR.OTHER;
                return (
                  <article className="item" key={r.id}>
                    <div className="line1">
                      <div className="rq" title={r.requester}>{kind.icon} {r.requester}</div>
                      <div className="time" title={fmtDate(r.date)}>{rel(r.date)}</div>
                    </div>
                    <div className="meta">
                      <span className="chip kind" style={{ color: kind.color, borderColor: kind.color, background: kind.chipBg }}>
                        {kind.label}
                      </span>
                      <span className="chip bureau" style={{ color: bcol, borderColor: bcol }}>
                        {r.bureau}
                      </span>
                      {r.country && <span className="chip" style={{ borderColor:"#d1d5db", color:"#374151" }}>{r.country}</span>}
                    </div>
                    <div className="desc">{r.reason}</div>
                  </article>
                );
              })}
              {!filtered.length && <div style={{ color:"#6b7280" }}>No inquiries match your filters.</div>}
            </div>
          </section>

          {/* RIGHT: Histogram + Coach */}
          <div style={{ display:"grid", gap:12 }}>
            <section className="card">
              <h3>Hard inquiries — last 24 months</h3>
              <div className="histo">
                <div className="bars">
                  {hist.map((b, i) => (
                    <div className="bar" key={b.key}>
                      <div className="fill" style={{ height: `${b.h}%`, background:"#111827", animation:"fillGrow .5s ease forwards" }} />
                      {/* label every 3rd month to reduce clutter */}
                      {(i % 3 === 0 || i === hist.length - 1) && <div className="lbl">{b.label}</div>}
                    </div>
                  ))}
                </div>
                <div className="legend">
                  <span className="lg"><span className="sw" /> Hard inquiries</span>
                </div>
              </div>
            </section>

            <aside className="coach">
              <h3>Coach</h3>
              <div className="tips">
                <div className="tip">Space out applications—several hard pulls in a short time can lower your score temporarily.</div>
                <div className="tip">Soft checks (pre-approvals, your own score view) don’t affect your score.</div>
                <div className="tip">If you don’t recognize an inquiry, you can <Link to="/contact">contact support</Link> or dispute with the bureau.</div>
                <div className="tip">Rate-shopping? Multiple auto/mortgage pulls within a short window may be treated as one. Apply within a tight timeframe.</div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Sample-data toast */}
      <div className={`sample-toast ${toast ? "show" : ""}`} role="status" aria-live="polite">
        Showing sample data (API not reachable).
      </div>
    </section>
  );
}
