import { useEffect, useMemo, useState } from "react";

/* ======================================================
   Adverse Records — real-time dashboard (self-contained)
   ====================================================== */

const API_URL = "/api/data/adverse-records"; // your backend; we fall back to SAMPLE

// ---------- Sample dataset (used if API is unreachable) ----------
const SAMPLE = {
  lastUpdated: new Date().toISOString(),
  monthlyCounts24: [1,0,2,1,0,0,1,0,1,0,2,1,  0,1,0,0,1,0, 2,1,0,0,0,1], // oldest → newest
  records: [
    {
      id: "adv_1001",
      type: "collection",
      creditor: "Midland Funding",
      bureau: "Experian",
      amount: 540,
      status: "open",           // open | disputed | resolved
      opened: "2024-06-12",
      updated: "2025-01-03",
      severity: 4,              // 1–5
      accountRef: "****9923",
      notes: "Reported by collector; consumer states not theirs."
    },
    {
      id: "adv_1002",
      type: "late_60",
      creditor: "CapitalOne",
      bureau: "Equifax",
      amount: 0,
      status: "resolved",
      opened: "2023-10-01",
      updated: "2024-12-01",
      severity: 2,
      accountRef: "****1140",
      notes: "60-day late in 2023; now current."
    },
    {
      id: "adv_1003",
      type: "chargeoff",
      creditor: "Synchrony Bank",
      bureau: "TransUnion",
      amount: 1275,
      status: "open",
      opened: "2024-01-22",
      updated: "2024-12-28",
      severity: 5,
      accountRef: "****7718",
      notes: "Charged off; balance due."
    },
    {
      id: "adv_1004",
      type: "judgment",
      creditor: "State Court",
      bureau: "Equifax",
      amount: 950,
      status: "disputed",
      opened: "2023-07-14",
      updated: "2024-11-05",
      severity: 4,
      accountRef: "Case# NJ-22-390",
      notes: "Marked paid in 2024; still appears on one bureau."
    },
    {
      id: "adv_1005",
      type: "late_30",
      creditor: "Chase",
      bureau: "TransUnion",
      amount: 0,
      status: "resolved",
      opened: "2024-03-02",
      updated: "2024-08-02",
      severity: 1,
      accountRef: "****3321",
      notes: "Goodwill adjustment requested."
    },
    {
      id: "adv_1006",
      type: "bankruptcy",
      creditor: "BK Ch.7",
      bureau: "Experian",
      amount: 0,
      status: "open",
      opened: "2022-11-30",
      updated: "2024-04-10",
      severity: 5,
      accountRef: "Filed 2022",
      notes: "Public record."
    }
  ],
};

const TYPE_META = {
  collection: { label: "Collection", icon: "📬" },
  chargeoff:  { label: "Charge-off", icon: "🧾" },
  judgment:   { label: "Judgment", icon: "⚖️" },
  bankruptcy: { label: "Bankruptcy", icon: "🏛️" },
  tax_lien:   { label: "Tax Lien", icon: "🧮" },
  late_30:    { label: "30-Day Late", icon: "⏳" },
  late_60:    { label: "60-Day Late", icon: "⏳" },
  late_90:    { label: "90-Day Late", icon: "⏳" },
  default:    { label: "Adverse", icon: "⚠️" },
};

const BUREAUS = ["All", "Experian", "Equifax", "TransUnion"];

const money = (n, c = "USD") =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n)
    : "—";

const dateFmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");

function severityTone(s) {
  if (s >= 5) return { c: "#b91c1c", bg: "#fef2f2", b: "#fecaca" };   // deep red
  if (s >= 4) return { c: "#dc2626", bg: "#fff5f5", b: "#fecaca" };   // red
  if (s >= 3) return { c: "#d97706", bg: "#fffbeb", b: "#fde68a" };   // amber
  if (s >= 2) return { c: "#0ea5e9", bg: "#f0f9ff", b: "#bae6fd" };   // sky
  return { c: "#10b981", bg: "#ecfdf5", b: "#a7f3d0" };               // green
}

export default function AdverseRecords() {
  /* State */
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sample, setSample] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all"); // all | active | disputed | resolved
  const [type, setType] = useState("all");     // all | collection | chargeoff | ...
  const [bureau, setBureau] = useState("All"); // All | Experian | Equifax | TransUnion
  const [sort, setSort] = useState("severity"); // severity | updated | amount

  /* Fetch + light polling (real-time-ish) */
  async function fetchData(signal) {
    try {
      setLoading(true);
      setErr("");
      setSample(false);
      const r = await fetch(API_URL, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!signal?.aborted) {
        setData(j);
      }
    } catch {
      if (!signal?.aborted) {
        setData(SAMPLE);
        setSample(true);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal);
    const int = setInterval(() => fetchData(ac.signal), 60000); // refresh every 60s
    return () => { ac.abort(); clearInterval(int); };
  }, []);

  const records = data?.records || [];

  // Derived: global flag, counts, 24-mo strip
  const activeCount = useMemo(
    () => records.filter(r => r.status === "open").length,
    [records]
  );
  const disputedCount = useMemo(
    () => records.filter(r => r.status === "disputed").length,
    [records]
  );
  const resolved90 = useMemo(() => {
    const cut = Date.now() - 1000 * 60 * 60 * 24 * 90;
    return records.filter(r => r.status === "resolved" && new Date(r.updated).getTime() >= cut).length;
  }, [records]);

  const highestSeverity = useMemo(
    () => Math.max(0, ...records.map(r => r.severity || 0)),
    [records]
  );

  const GlobalAdverseFlag = activeCount > 0;

  // Filtering / search / sort
  const filtered = useMemo(() => {
    let list = [...records];
    if (status !== "all") {
      if (status === "active") list = list.filter(r => r.status === "open");
      else list = list.filter(r => r.status === status);
    }
    if (type !== "all") list = list.filter(r => r.type === type);
    if (bureau !== "All") list = list.filter(r => r.bureau === bureau);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(r =>
        [
          r.type, r.creditor, r.bureau, r.status, r.accountRef, r.notes
        ].filter(Boolean).join(" ").toLowerCase().includes(s)
      );
    }
    if (sort === "severity") {
      list.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
    } else if (sort === "updated") {
      list.sort((a, b) => new Date(b.updated) - new Date(a.updated));
    } else if (sort === "amount") {
      list.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
    }
    return list;
  }, [records, status, type, bureau, q, sort]);

  // CSS (scoped to this page)
  const CSS = `
  .adv-wrap{max-width:100%;margin:0 auto;padding:0 0 16px}
  .head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:4px 0 8px}
  .sub{margin:0;color:#374151}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #fecaca;background:#fff5f5;color:#dc2626;
        padding:6px 10px;border-radius:999px;font-weight:800;line-height:1}
  .live{position:relative}
  .live::before{content:"";width:8px;height:8px;border-radius:999px;background:#10b981;display:inline-block;box-shadow:0 0 0 4px rgba(16,185,129,.18);margin-right:6px}
  .filters{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
  .in{padding:8px 10px;border:1px solid #d1d5db;border-radius:10px;background:#fff}
  .sel{padding:8px 10px;border:1px solid #d1d5db;border-radius:10px;background:#fff}
  .btn{border:1px solid #d1d5db;background:#fff;padding:8px 10px;border-radius:10px;cursor:pointer;font-weight:700}
  .btn:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(0,0,0,.08)}
  .grid{display:grid;grid-template-columns:1fr;gap:12px}
  .card{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  @media (max-width:880px){ .kpi{grid-template-columns:repeat(2,1fr)} }
  @media (max-width:520px){ .kpi{grid-template-columns:1fr} }
  .kbox{border:1px solid #d1d5db;border-radius:12px;padding:10px;background:#fff;box-shadow:0 4px 10px rgba(0,0,0,.06)}
  .k{font-size:12px;color:#6b7280}
  .v{font-weight:900}
  .heat{display:grid;grid-template-columns:repeat(24,1fr);gap:4px;height:54px}
  .sq{border-radius:4px; background:#e5e7eb}
  .legend{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:8px;color:#6b7280;font-size:12px}
  .records-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
  .rec{border:1px solid #d1d5db;border-radius:12px;padding:12px;background:#fff;box-shadow:0 4px 10px rgba(0,0,0,.06);display:grid;gap:8px}
  .rhead{display:flex;justify-content:space-between;gap:8px;align-items:center}
  .rtype{display:inline-flex;align-items:center;gap:6px;font-weight:900}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;border:1px solid var(--b);background:var(--bg);color:var(--c);font-weight:800;font-size:12px}
  .row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
  .muted{color:#6b7280}
  .notes{color:#374151}
  .actions{display:flex;flex-wrap:wrap;gap:8px}
  .small{padding:6px 10px;border-radius:8px}
  .toast{position:fixed;left:16px;bottom:16px;background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px;box-shadow:0 10px 20px rgba(0,0,0,.12);font-weight:800;z-index:80}
  `;

  // heat colors (0..N events per month)
  const heatOf = (n) => {
    if (n <= 0) return "#e5e7eb";
    if (n === 1) return "#fde68a";
    if (n === 2) return "#f59e0b";
    return "#ef4444";
  };

  // quick “Dispute helper” text
  const disputeText = (r) => {
    const meta = TYPE_META[r.type] || TYPE_META.default;
    return [
      `Subject: Dispute of ${meta.label} on ${r.bureau}`,
      "",
      "Hello,",
      "",
      `I am disputing the ${meta.label.toLowerCase()} reported for the account ${r.accountRef || "(ref unknown)"} with ${r.creditor}.`,
      "I believe this entry is inaccurate or incomplete. Please investigate and provide:",
      " • Itemized details (original creditor, account, dates, and amount)",
      " • Copies of any documentation used to verify the entry",
      " • The method of verification and data furnisher contact",
      "",
      "If the entry cannot be verified, please delete or correct it and notify other bureaus as required.",
      "",
      "Thank you,",
      "[Your Name]",
      "[Address / Email / Phone]"
    ].join("\n");
  };

  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (sample) {
      setToast(true);
      const t = setTimeout(() => setToast(false), 2400);
      return () => clearTimeout(t);
    }
  }, [sample]);

  // chip tones
  const flagTone = GlobalAdverseFlag
    ? { c: "#dc2626", bg: "#fff5f5", b: "#fecaca", label: "GlobalAdverseFlag: TRUE" }
    : { c: "#10b981", bg: "#ecfdf5", b: "#a7f3d0", label: "GlobalAdverseFlag: FALSE" };

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="adv-wrap">
        {/* Header */}
        <div className="head">
          <div>
            <h1 style={{ margin: 0 }}>Adverse Records</h1>
            <p className="sub">Defaults, collections, judgments, bankruptcies, and serious delinquencies.</p>
          </div>
          <div className="chips">
            <span className="chip live">Live</span>
            <span className="chip" style={{ ["--bg"]: flagTone.bg, ["--b"]: flagTone.b, ["--c"]: flagTone.c }}>
              {flagTone.label}
            </span>
            <span className="chip">Updated {dateFmt(data?.lastUpdated) || "—"}</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi">
          <div className="kbox">
            <div className="k">Active</div>
            <div className="v">{activeCount}</div>
          </div>
          <div className="kbox">
            <div className="k">Disputed</div>
            <div className="v">{disputedCount}</div>
          </div>
          <div className="kbox">
            <div className="k">Resolved (90d)</div>
            <div className="v">{resolved90}</div>
          </div>
          <div className="kbox">
            <div className="k">Highest Severity</div>
            <div className="v">{highestSeverity || "—"}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters">
          <input className="in" placeholder="Search (creditor, status, note…)" value={q} onChange={e => setQ(e.target.value)} />
          <select className="sel" value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
            <option value="all">Status: All</option>
            <option value="active">Active (Open)</option>
            <option value="disputed">Disputed</option>
            <option value="resolved">Resolved/Closed</option>
          </select>
          <select className="sel" value={type} onChange={e => setType(e.target.value)} aria-label="Type">
            <option value="all">Type: All</option>
            {Object.keys(TYPE_META).filter(k => k !== "default").map(k => (
              <option key={k} value={k}>{TYPE_META[k].label}</option>
            ))}
          </select>
          <select className="sel" value={bureau} onChange={e => setBureau(e.target.value)} aria-label="Bureau">
            {BUREAUS.map(b => <option key={b} value={b}>Bureau: {b}</option>)}
          </select>
          <select className="sel" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">
            <option value="severity">Sort: Severity</option>
            <option value="updated">Sort: Last Updated</option>
            <option value="amount">Sort: Amount</option>
          </select>
          <button className="btn" onClick={() => fetchData()}>Refresh</button>
        </div>

        {/* 24-month activity strip */}
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
            <h3 style={{ margin: 0 }}>Activity (last 24 months)</h3>
            <div className="legend">
              <span>0</span><span style={{ width:16, height:10, background:"#e5e7eb", borderRadius:3, display:"inline-block" }} />
              <span>1</span><span style={{ width:16, height:10, background:"#fde68a", borderRadius:3, display:"inline-block" }} />
              <span>2</span><span style={{ width:16, height:10, background:"#f59e0b", borderRadius:3, display:"inline-block" }} />
              <span>3+</span><span style={{ width:16, height:10, background:"#ef4444", borderRadius:3, display:"inline-block" }} />
            </div>
          </div>
          <div className="heat" aria-hidden>
            {(data?.monthlyCounts24 || SAMPLE.monthlyCounts24).map((n, i) => (
              <div key={i} className="sq" title={`${n} event(s)`} style={{ background: heatOf(n) }} />
            ))}
          </div>
        </div>

        {/* Records list */}
        <div className="records-grid" aria-live="polite">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rec" aria-busy="true">
              <div className="rhead"><div className="rtype">⏳ Loading…</div></div>
              <div className="row"><div className="muted">Creditor</div><div>—</div></div>
              <div className="row"><div className="muted">Amount</div><div>—</div></div>
              <div className="row"><div className="muted">Status</div><div>—</div></div>
            </div>
          ))}

          {!loading && filtered.map((r) => {
            const meta = TYPE_META[r.type] || TYPE_META.default;
            const tone = severityTone(r.severity || 0);
            const statusTone =
              r.status === "open" ? { c:"#dc2626", bg:"#fff5f5", b:"#fecaca", label:"Active" } :
              r.status === "disputed" ? { c:"#0ea5e9", bg:"#f0f9ff", b:"#bae6fd", label:"Disputed" } :
              { c:"#10b981", bg:"#ecfdf5", b:"#a7f3d0", label:"Resolved" };

            return (
              <article key={r.id} className="rec">
                <div className="rhead">
                  <div className="rtype">
                    <span aria-hidden>{meta.icon}</span> {meta.label}
                  </div>
                  <span className="badge" style={{ ["--bg"]: tone.bg, ["--b"]: tone.b, ["--c"]: tone.c }}>
                    Sev {r.severity ?? "—"}
                  </span>
                </div>

                <div className="row">
                  <div className="muted">Creditor</div>
                  <div style={{ fontWeight: 800 }}>{r.creditor || "—"}</div>
                </div>

                <div className="row">
                  <div className="muted">Amount</div>
                  <div style={{ fontWeight: 800 }}>{money(r.amount)}</div>
                </div>

                <div className="row">
                  <div className="muted">Bureau</div>
                  <div>{r.bureau || "—"}</div>
                </div>

                <div className="row">
                  <div className="muted">Account</div>
                  <div><code>{r.accountRef || "—"}</code></div>
                </div>

                <div className="row">
                  <div className="muted">Opened</div>
                  <div>{dateFmt(r.opened)}</div>
                </div>

                <div className="row">
                  <div className="muted">Updated</div>
                  <div>{dateFmt(r.updated)}</div>
                </div>

                <div className="row">
                  <div className="muted">Status</div>
                  <div>
                    <span className="badge" style={{ ["--bg"]: statusTone.bg, ["--b"]: statusTone.b, ["--c"]: statusTone.c }}>
                      {statusTone.label}
                    </span>
                  </div>
                </div>

                {r.notes && <div className="notes">{r.notes}</div>}

                {/* Dispute helper */}
                <div className="actions">
                  <button
                    className="btn small"
                    onClick={() => {
                      const text = disputeText(r);
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(text);
                        setToast(true);
                        setTimeout(() => setToast(false), 1500);
                      } else {
                        alert(text);
                      }
                    }}
                    title="Copies a starter dispute template to your clipboard"
                  >
                    Dispute helper (copy)
                  </button>

                  <button
                    className="btn small"
                    onClick={() => alert(`Guidance:\n\n• Verify if the debt is yours\n• Ask for debt validation\n• If paid: request 'paid collection' update\n• If inaccurate: dispute with all three bureaus\n• Keep copies of correspondence`)}
                  >
                    Quick guidance
                  </button>
                </div>
              </article>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="card">No records match your filters.</div>
          )}
        </div>

        {/* Inline info / error */}
        {err && !sample && (
          <div className="card" style={{ marginTop: 10, borderColor: "#fecaca", background: "#fff5f5" }}>
            <strong style={{ color: "#b91c1c" }}>Error:</strong> {err}
          </div>
        )}
      </div>

      {toast && <div className="toast">{sample ? "Showing sample data" : "Copied dispute template"}</div>}
    </section>
  );
}
