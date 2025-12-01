import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* ======================
   Helpers
====================== */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const money = (n, c = "USD") =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n)
    : "—";
const pctInt = (x) => (typeof x === "number" ? Math.round(x) : 0);
const pctText = (x) => (typeof x === "number" ? `${pctInt(x)}%` : "—");

const dateFmt = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(+d)) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};
const monthsBetween = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(+d)) return null;
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  return Math.max(0, months);
};
const ymText = (months) => {
  if (months == null) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y && m) return `${y}y ${m}m`;
  if (y) return `${y}y`;
  return `${m}m`;
};

/* ======================
   API endpoints
====================== */
const MIX_API  = (import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "") + "/api/data/account-mix";
const ACC_API  = "/api/data/accounts";
const UTIL_API = "/api/data/utilization";

/* ======================
   Labels
====================== */
const labelOf = (cat = "") =>
  ({
    LOAN_STUDENT: "Student Loan",
    LOAN_MORTGAGE: "Mortgage",
    DEPOSIT_SAVINGS: "Savings",
    DEPOSIT_CHECKING: "Checking",
    INVESTMENT: "Investment",
    CREDIT: "Credit",
  }[cat] || cat.replace(/_/g, " "));

/* ======================
   DEMO DATASETS (V1 & V2)
   Pick dataset via:
   - URL: ?demo=v1 or ?demo=v2
   - ENV:  VITE_DEMO=v1|v2
   - Code: DEFAULT_DEMO below
====================== */
// ---- MIX
function sampleMixV1() {
  const entries = [
    { category: "LOAN_MORTGAGE", accounts: 1, exposure: 245000 },
    { category: "CREDIT", accounts: 3, exposure: 4700 },
    { category: "DEPOSIT_SAVINGS", accounts: 1, exposure: 7200 },
    { category: "DEPOSIT_CHECKING", accounts: 2, exposure: 5250 },
    { category: "INVESTMENT", accounts: 2, exposure: 25230 },
    { category: "LOAN_STUDENT", accounts: 1, exposure: 12800 },
  ];
  const totalExposure = entries.reduce((s, e) => s + e.exposure, 0);
  entries.forEach((e) => (e.exposureShare = e.exposure / totalExposure));
  return { entries, totalExposure };
}
function sampleMixV2() {
  const entries = [
    { category: "CREDIT", accounts: 2, exposure: 11000 },
    { category: "DEPOSIT_SAVINGS", accounts: 1, exposure: 15000 },
    { category: "DEPOSIT_CHECKING", accounts: 1, exposure: 5400 },
    { category: "INVESTMENT", accounts: 1, exposure: 43200 },
    { category: "LOAN_STUDENT", accounts: 0, exposure: 0 },
    { category: "LOAN_MORTGAGE", accounts: 0, exposure: 0 },
  ];
  const totalExposure = entries.reduce((s, e) => s + e.exposure, 0);
  entries.forEach((e) => (e.exposureShare = totalExposure ? e.exposure / totalExposure : 0));
  return { entries, totalExposure };
}

// ---- ACCOUNTS (your original shape)
function sampleAccountsV1() {
  return [
    { accountId: "CHK-001", name: "Everyday Checking", accountType: "depository", accountSubtype: "checking", currency: "USD", institutionName: "BlueBank", balAvailable: 1850, balCurrent: 1850, status: "open", openedAt: "2021-04-10" },
    { accountId: "SAV-002", name: "Rainy Day Savings", accountType: "depository", accountSubtype: "savings", currency: "USD", institutionName: "BlueBank", balAvailable: 7200, balCurrent: 7200, status: "open", openedAt: "2020-11-02" },

    { accountId: "CRD-003", name: "Freedom", accountType: "credit", accountSubtype: "credit card", currency: "USD", creditLimit: 6000, balCurrent: 2600, status: "open", openedAt: "2019-07-15" },
    { accountId: "CRD-004", name: "Travel Mastercard", accountType: "credit", accountSubtype: "credit card", currency: "USD", creditLimit: 8000, balCurrent: 900, status: "open", openedAt: "2022-03-05" },
    { accountId: "CRD-008", name: "Store Card", accountType: "credit", accountSubtype: "store card", currency: "USD", creditLimit: 3000, balCurrent: 0, status: "closed", openedAt: "2018-01-10", closedAt: "2023-02-18" },
    { accountId: "CRD-011", name: "Cashback Amex", accountType: "credit", accountSubtype: "credit card", currency: "USD", creditLimit: 15000, balCurrent: 1200, status: "open", openedAt: "2021-09-22" },

    { accountId: "INV-005", name: "Brokerage", accountType: "investment", accountSubtype: "brokerage", currency: "USD", institutionName: "Investly", balCurrent: 15430, status: "open", openedAt: "2017-05-30" },
    { accountId: "INV-009", name: "Roth IRA", accountType: "investment", accountSubtype: "retirement", currency: "USD", balCurrent: 9800, status: "open", openedAt: "2015-08-20" },

    { accountId: "LOA-006", name: "Auto Loan", accountType: "loan", accountSubtype: "auto", currency: "USD", balCurrent: 0, status: "closed", openedAt: "2018-03-01", closedAt: "2022-08-15" },
    { accountId: "LOA-007", name: "Student Loan", accountType: "loan", accountSubtype: "student", currency: "USD", balCurrent: 12800, status: "open", openedAt: "2014-09-01" },
    { accountId: "LOA-012", name: "Mortgage", accountType: "loan", accountSubtype: "mortgage", currency: "USD", balCurrent: 245000, status: "open", openedAt: "2019-12-11" },

    { accountId: "CHK-010", name: "Joint Checking", accountType: "depository", accountSubtype: "checking", currency: "USD", balAvailable: 3400, balCurrent: 3400, status: "open", openedAt: "2023-06-09" },
  ];
}
function sampleAccountsV2() {
  return [
    { accountId: "CHK-200", name: "Joint Checking", accountType: "depository", accountSubtype: "checking", currency: "USD", institutionName: "BlueBank", balAvailable: 5400, balCurrent: 5400, status: "open", openedAt: "2023-02-12" },
    { accountId: "SAV-201", name: "Emergency Fund", accountType: "depository", accountSubtype: "savings", currency: "USD", institutionName: "BlueBank", balAvailable: 15000, balCurrent: 15000, status: "open", openedAt: "2019-08-15" },

    { accountId: "CRD-210", name: "Cashback Visa", accountType: "credit", accountSubtype: "credit card", currency: "USD", creditLimit: 7000, balCurrent: 2100, status: "open", openedAt: "2021-09-20" },
    { accountId: "CRD-211", name: "Platinum AmEx", accountType: "credit", accountSubtype: "credit card", currency: "USD", creditLimit: 9000, balCurrent: 3800, status: "open", openedAt: "2020-02-01" },
    { accountId: "CRD-212", name: "Retail Card", accountType: "credit", accountSubtype: "store card", currency: "USD", creditLimit: 2500, balCurrent: 0, status: "closed", openedAt: "2018-10-01", closedAt: "2024-03-15" },

    { accountId: "INV-230", name: "Retirement 401k", accountType: "investment", accountSubtype: "retirement", currency: "USD", institutionName: "Investly", balCurrent: 43200, status: "open", openedAt: "2016-05-18" },

    { accountId: "LOA-240", name: "Personal Loan", accountType: "loan", accountSubtype: "personal", currency: "USD", balCurrent: 4200, status: "open", openedAt: "2021-07-10" },
  ];
}

// ---- UTILIZATION (revolving lines)
const UTIL_SAMPLE_V1 = {
  currency: "USD",
  lines: [
    { id: "c1", name: "Freedom", issuer: "Chase", status: "open", limit: 6000, balance: 2600, apr: 20.99, openedAt: "2019-07-15", lastStatementAt: "2025-10-01", nextDueAt: "2025-10-25" },
    { id: "c2", name: "Platinum", issuer: "Citi",  status: "open", limit: 4500, balance:  900, apr: 23.49, openedAt: "2021-02-11", lastStatementAt: "2025-10-03", nextDueAt: "2025-10-28" },
    { id: "c3", name: "Cash+",    issuer: "US Bank",status: "open", limit: 3500, balance:  400, apr: 19.99, openedAt: "2020-05-20", lastStatementAt: "2025-09-29", nextDueAt: "2025-10-24" },
    { id: "c4", name: "Blue",     issuer: "AmEx",   status: "open", limit: 8000, balance: 1800, apr: 18.49, openedAt: "2022-10-08", lastStatementAt: "2025-10-04", nextDueAt: "2025-10-26" },
  ],
};
const UTIL_SAMPLE_V2 = {
  currency: "USD",
  lines: [
    { id: "d1", name: "Cashback Visa", issuer: "Visa", status: "open", limit: 7000, balance: 2100, apr: 19.9, openedAt: "2021-09-20" },
    { id: "d2", name: "Platinum", issuer: "AmEx", status: "open", limit: 9000, balance: 3800, apr: 22.4, openedAt: "2020-02-01" },
    // closed example (ignored in current util)
    { id: "d3", name: "Retail Card", issuer: "DeptStore", status: "closed", limit: 2500, balance: 0, openedAt: "2018-10-01", closedAt: "2024-03-15" },
  ],
};

/* === Choose which demo set to use if API is unavailable === */
const DEFAULT_DEMO = "v1"; // change to "v2" if you want to hardcode dataset 2
const pickDemoKey = () => {
  const fromQuery = (() => {
    try { return new URLSearchParams(window.location.search).get("demo"); } catch { return null; }
  })();
  const fromEnv = import.meta?.env?.VITE_DEMO;
  return (fromQuery || fromEnv || DEFAULT_DEMO)?.toLowerCase() === "v2" ? "v2" : "v1";
};
const demoData = (key) =>
  key === "v2"
    ? { mix: sampleMixV2(), accounts: sampleAccountsV2(), util: UTIL_SAMPLE_V2 }
    : { mix: sampleMixV1(), accounts: sampleAccountsV1(), util: UTIL_SAMPLE_V1 };

/* ======================
   UI atoms
====================== */
function Donut({ pct = 0 }) {
  const p = clamp(Math.round(pct), 0, 100);
  const r = 18, C = 2 * Math.PI * r, seg = (p / 100) * C;
  const color = p < 10 ? "#0ea5e9" : p < 30 ? "#10B981" : p < 50 ? "#84CC16" : p < 80 ? "#F59E0B" : "#EF4444";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-label={`Utilization ${p}%`}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx="22" cy="22" r={r}
        fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${seg} ${C - seg}`}
        transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="800">{p}%</text>
    </svg>
  );
}
function Bar({ value = 0, tone = "#2563eb" }) {
  const v = clamp(Math.round(value), 0, 100);
  return <div className="bar"><div className="bar-fill" style={{ width: `${v}%`, background: tone }} /></div>;
}
function StatusBadge({ pct }) {
  const p = clamp(Math.round(pct ?? 0), 0, 100);
  const cfg =
    p < 10 ? { label: "Excellent", c: "#0ea5e9", bg: "#eff6ff", b: "#bfdbfe" } :
    p < 30 ? { label: "Good",      c: "#10B981", bg: "#ecfdf5", b: "#a7f3d0" } :
    p < 50 ? { label: "Okay",      c: "#84CC16", bg: "#f7fee7", b: "#d9f99d" } :
    p < 80 ? { label: "High",      c: "#F59E0B", bg: "#fffbeb", b: "#fde68a" } :
             { label: "Very High", c: "#EF4444", bg: "#fef2f2", b: "#fecaca" };
  return <span className="mini" style={{ color: cfg.c, background: cfg.bg, borderColor: cfg.b }}>{cfg.label}</span>;
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

/* ======================
   Page
====================== */
export default function AccountsOverview() {
  /* CSS (scoped) */
  const CSS = `
  .au-wrap{max-width:1100px;margin:0 auto;padding:0 10px}
  .hero{background: radial-gradient(1400px 320px at 50% -60px, #cfe8ff 0%, #dbeafe 40%, #eef2f7 100%);border:1px solid #d1d5db;border-radius:16px;padding:10px 12px;margin:4px 0 10px;display:flex;align-items:center;gap:10px;justify-content:space-between}
  .h-title{margin:0}
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
  .mini{display:inline-flex;align-items:center;gap:6px;border:1px solid #d1d5db;border-radius:10px;padding:6px 8px;font-weight:800}

  .section-body{border-top:1px solid #e5e7eb}
  .section-body-inner{padding:12px}

  .sb{padding:12px}

  .grid{display:block;gap:10px}
  .grid.onecol{grid-template-columns:1fr}
  .card{border:1px solid #e5e7eb;border-radius:12px;padding:10px;background:#fff;margin:0 0 10px}
  .card.closed{opacity:.65}
  .head{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .muted{color:#6b7280}
  .pill{border:1px solid #e5e7eb;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:800}
  .pill.red{border-color:#fecaca;background:#fef2f2;color:#ef4444}
  .pill.green{border-color:#bbf7d0;background:#ecfdf5;color:#16a34a}
  .pill.blue{border-color:#bfdbfe;background:#eff6ff;color:#2563eb}
  .hint{color:#374151;font-size:12px;margin:0 0 10px}
  .bar{height:8px;background:#eef2f7;border-radius:999px;overflow:hidden}
  .bar-fill{height:100%;width:0;animation:grow .5s ease forwards}
  @keyframes grow{from{width:0}}

  .legend{display:flex;flex-wrap:wrap;gap:8px}
  .legend .lg{display:inline-flex;gap:6px;align-items:center;background:#f8fafc;border:1px solid #e5e7eb;border-radius:999px;padding:4px 8px;font-size:12px}
  .dot{width:8px;height:8px;border-radius:999px}
  .issues{display:flex;flex-wrap:wrap;gap:8px}
  .issue{display:inline-flex;gap:6px;align-items:center;background:#fff7ed;border:1px solid #fed7aa;border-radius:999px;padding:6px 8px;font-weight:800}

  .seg{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
  .segbtn{border:1px solid #e5e7eb;background:#f8fafc;border-radius:999px;padding:6px 10px;cursor:pointer;font-weight:800}
  .segbtn.is-active{background:#fff;border-color:#cbd5e1;box-shadow:0 6px 14px rgba(0,0,0,.06)}

  .calc{margin-top:8px;padding:8px;border:1px dashed #e5e7eb;border-radius:10px;background:#f8fafc;font-size:12px}
  .calc strong{font-weight:900}

  .toast{position:fixed;left:16px;bottom:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.18);padding:10px 12px;font-weight:800;opacity:0;transform:translateY(6px);transition:opacity .18s,transform .18s;z-index:80}
  .toast.show{opacity:1;transform:translateY(0)}
  `;

  /* ---- Mix ---- */
  const [mix, setMix] = useState(null);
  const [toastMix, setToastMix] = useState(false);

  /* ---- Accounts ---- */
  const [rows, setRows] = useState([]);
  const [toastAcc, setToastAcc] = useState(false);

  /* ---- Utilization ---- */
  const [util, setUtil] = useState(null);
  const [toastUtil, setToastUtil] = useState(false);

  // load APIs; on failure load chosen demo dataset (v1 or v2)
  useEffect(() => {
    const demoKey = pickDemoKey();
    const demo = demoData(demoKey);

    const ac1 = new AbortController();
    const ac2 = new AbortController();
    const ac3 = new AbortController();

    (async () => {
      try {
        const r = await fetch(MIX_API, { signal: ac1.signal });
        if (!r.ok) throw new Error();
        const j = await r.json();
        setMix(j);
      } catch {
        setMix(demo.mix);
        setToastMix(true);
        setTimeout(() => setToastMix(false), 2000);
      }
    })();

    (async () => {
      try {
        const r = await fetch(ACC_API, { signal: ac2.signal });
        if (!r.ok) throw new Error();
        const j = await r.json();
        setRows(Array.isArray(j) ? j : []);
      } catch {
        setRows(demo.accounts);
        setToastAcc(true);
        setTimeout(() => setToastAcc(false), 2000);
      }
    })();

    (async () => {
      try {
        const r = await fetch(UTIL_API, { signal: ac3.signal });
        if (!r.ok) throw new Error();
        const j = await r.json();
        setUtil(j);
      } catch {
        setUtil(demo.util);
        setToastUtil(true);
        setTimeout(() => setToastUtil(false), 2000);
      }
    })();

    return () => { ac1.abort(); ac2.abort(); ac3.abort(); };
  }, []);

  const mixEntries = mix?.entries || [];
  const mixMax = useMemo(() => Math.max(1, ...mixEntries.map((e) => Number(e.exposure) || 0)), [mixEntries]);

  const isClosedAcct = (a) => a?.status === "closed" || a?.isClosed === true || a?.accountStatus === "closed" || a?.closed === true;

  const credit = rows.filter((r) => r.accountType === "credit");
  const depository = rows.filter((r) => r.accountType === "depository");
  const loans = rows.filter((r) => r.accountType === "loan");
  const investments = rows.filter((r) => r.accountType === "investment");

  const openRows = rows.filter((r) => !isClosedAcct(r));
  const closedRows = rows.filter((r) => isClosedAcct(r));
  const openCount = openRows.length;
  const closedCount = closedRows.length;

  const totalAccounts = rows.length;
  const totalBalances = rows.reduce((s, r) => s + (Number(r.balCurrent) || 0), 0);

  /* ---- Utilization (revolving) ---- */
  const currency = util?.currency || "USD";
  const allLines = util?.lines || [];
  const isClosedLine = (l) => l?.status === "closed" || (!!l?.closedAt && new Date(l.closedAt) < new Date());
  const openLines = allLines.filter((l) => !isClosedLine(l));

  const openTotalLimit = useMemo(() => openLines.reduce((s, l) => s + (Number(l.limit) || 0), 0), [openLines]);
  const openTotalBal   = useMemo(() => openLines.reduce((s, l) => s + (Number(l.balance) || 0), 0), [openLines]);

  const computedOverall = useMemo(() => (openTotalLimit ? (openTotalBal / openTotalLimit) * 100 : 0), [openTotalBal, openTotalLimit]);
  const utilPct = useMemo(() => clamp(Math.round(computedOverall), 0, 100), [computedOverall]);

  const paydownTo30 = useMemo(() => {
    if (!openTotalLimit) return 0;
    const target = 0.3 * openTotalLimit;
    return Math.max(0, openTotalBal - target);
  }, [openTotalBal, openTotalLimit]);

  const worst = useMemo(() => {
    if (!openLines.length) return null;
    const withPct = openLines.map((l) => ({ ...l, u: l.limit ? Math.round((l.balance / l.limit) * 100) : 0 }));
    return withPct.sort((a, b) => b.u - a.u)[0];
  }, [openLines]);

  // Accordions state
  const [openAcc, setOpenAcc] = useState({ util: false, mix: false, accounts: false, coach: false });

  // Accounts by Type filter
  const [acctView, setAcctView] = useState("all");
  const filterByView = (arr) => {
    if (acctView === "open") return arr.filter((a) => !isClosedAcct(a));
    if (acctView === "closed") return arr.filter((a) => isClosedAcct(a));
    return arr;
  };

  // Mix helpers
  const mapToMixCat = (a) => {
    if (a.accountType === "credit") return "CREDIT";
    if (a.accountType === "investment") return "INVESTMENT";
    if (a.accountType === "depository") {
      if ((a.accountSubtype || "").toLowerCase().includes("savings")) return "DEPOSIT_SAVINGS";
      return "DEPOSIT_CHECKING";
    }
    if (a.accountType === "loan") {
      const sub = (a.accountSubtype || "").toLowerCase();
      if (sub.includes("student")) return "LOAN_STUDENT";
      if (sub.includes("mortgage")) return "LOAN_MORTGAGE";
      return "LOAN_OTHER";
    }
    return "OTHER";
  };
  const accountsInCategory = (cat) => rows.filter((a) => mapToMixCat(a) === cat);

  const openByMix = useMemo(() => {
    const m = {};
    rows.forEach((a) => {
      const k = mapToMixCat(a);
      if (!m[k]) m[k] = { open: 0, closed: 0, ages: [] };
      const mo = monthsBetween(a.openedAt);
      if (mo != null && !isClosedAcct(a)) m[k].ages.push(mo);
      if (isClosedAcct(a)) m[k].closed++;
      else m[k].open++;
    });
    Object.keys(m).forEach((k) => {
      const ages = m[k].ages;
      m[k].avgAgeMonths = ages.length ? Math.round(ages.reduce((s, v) => s + v, 0) / ages.length) : null;
    });
    return m;
  }, [rows]);

  // Account Mix global All/Open/Closed (like Accounts by Type)
  const [mixView, setMixView] = useState("all");
  const filterMixList = (list) =>
    mixView === "all" ? list : list.filter((a) => (mixView === "open" ? !isClosedAcct(a) : isClosedAcct(a)));

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="au-wrap">
        {/* HERO */}
        <div className="hero">
          <div>
            <h1 className="h-title">Accounts & Utilization</h1>
            <div className="chips">
              <span className="chip">Overall Utilization <strong>{pctText(utilPct)}</strong></span>
              <span className="chip">Current Balance <strong>{money(openTotalBal, currency)}</strong></span>
              <span className="chip">Available Credit <strong>{money(openTotalLimit, currency)}</strong></span>
              {paydownTo30 > 0 && <span className="chip">Paydown→30% <strong>{money(paydownTo30, currency)}</strong></span>}
              <span className="chip">Accounts <strong>{totalAccounts}</strong></span>
            </div>
          </div>
          <Donut pct={utilPct} />
        </div>

        {/* SUMMARY */}
        <div className="summary">
          <div className="stat"><div className="stat-k">Total accounts</div><div className="stat-v">{totalAccounts}</div></div>
          <div className="stat"><div className="stat-k">Balances (all)</div><div className="stat-v">{money(totalBalances)}</div></div>
          <div className="stat"><div className="stat-k">Overall utilization</div><div className="stat-v">{pctText(utilPct)}</div></div>
          <div className="stat"><div className="stat-k">Revolving lines (open)</div><div className="stat-v">{openLines.length}</div></div>
        </div>

        {/* UTILIZATION — single-column rows */}
        <Section
          title="Utilization"
          subtitle="Current Balance ÷ Available Credit on open revolving lines. Lower is better (<30%)."
          right={<StatusBadge pct={utilPct} />}
          open={openAcc.util}
          onToggle={() => setOpenAcc((o) => ({ ...o, util: !o.util }))}
        >
          <div className="sb">
            <div className="legend" style={{ marginBottom: 8 }}>
              <span className="lg"><span className="dot" style={{ background:"#0ea5e9" }} /> 0–9% Excellent</span>
              <span className="lg"><span className="dot" style={{ background:"#10B981" }} /> 10–29% Good</span>
              <span className="lg"><span className="dot" style={{ background:"#84CC16" }} /> 30–49% Okay</span>
              <span className="lg"><span className="dot" style={{ background:"#F59E0B" }} /> 50–79% High</span>
              <span className="lg"><span className="dot" style={{ background:"#EF4444" }} /> 80%+ Very High</span>
            </div>

            <div className="issues" style={{ marginBottom: 10 }}>
              {worst && <span className="issue">📈 Highest: {worst.issuer} • {worst.name} — {pctText(worst.u)}</span>}
              {paydownTo30 > 0 && <span className="issue">🎯 Pay {money(paydownTo30, currency)} to reach 30% overall</span>}
            </div>

            <div className="calc">
              <div><strong>How we calculated it:</strong></div>
              <div>Current Balance = <strong>{money(openTotalBal, currency)}</strong></div>
              <div>Available Credit = <strong>{money(openTotalLimit, currency)}</strong></div>
              <div>Overall = <strong>{pctText(openTotalLimit ? (openTotalBal / openTotalLimit) * 100 : 0)}</strong></div>
            </div>

            <div className="grid onecol" style={{ marginTop: 10 }}>
              {openLines.map((l) => {
                const u = l.limit ? clamp(Math.round((l.balance / l.limit) * 100), 0, 100) : 0;
                const tone = u < 10 ? "#0ea5e9" : u < 30 ? "#10B981" : u < 50 ? "#84CC16" : u < 80 ? "#F59E0B" : "#EF4444";
                const ageM = monthsBetween(l.openedAt);
                const linePayTo30 = l.limit ? Math.max(0, l.balance - 0.3 * l.limit) : 0;

                let cause = "Healthy utilization.";
                if (u >= 80) cause = "Very high — balance near limit; consider a paydown.";
                else if (u >= 50) cause = "High — spreading balance or a small paydown helps.";
                else if (u >= 30) cause = "Okay — staying under 30% is better.";

                return (
                  <article key={l.id} className="card">
                    <div className="head">
                      <div className="muted" title={`${l.issuer} ${l.name}`}>{l.issuer} • <strong>{l.name}</strong></div>
                      <span className={`pill ${u<30?"green":u<50?"blue":""}`}>{pctText(u)}</span>
                    </div>
                    <div className="hint">
                      Balance {money(l.balance, currency)} • Limit {money(l.limit, currency)} • APR {l.apr?.toFixed?.(2)}%
                    </div>
                    <div className="hint">
                      Opened {dateFmt(l.openedAt)}{ageM != null && <> • <strong>{ymText(ageM)}</strong> ago</>}
                      {l.lastStatementAt && <> • Last stmt {dateFmt(l.lastStatementAt)}</>}
                      {l.nextDueAt && <> • Next due {dateFmt(l.nextDueAt)}</>}
                    </div>
                    <Bar value={u} tone={tone} />
                    <div className="hint" style={{ marginTop: 4 }}>
                      {cause} {linePayTo30 > 0 && <>• Pay {money(linePayTo30, currency)} to put this line at 30%.</>}
                    </div>
                  </article>
                );
              })}

              {allLines.some(isClosedLine) && (
                <article className="card closed">
                  <div className="head">
                    <div className="muted"><strong>Closed lines</strong></div>
                    <span className="pill red">{allLines.filter(isClosedLine).length}</span>
                  </div>
                  <div className="hint">Closed lines do not affect current utilization.</div>
                  {allLines.filter(isClosedLine).map((l) => (
                    <div key={l.id} className="hint">• {l.issuer} {l.name} — opened {dateFmt(l.openedAt)} • closed {dateFmt(l.closedAt)}</div>
                  ))}
                </article>
              )}

              {!openLines.length && <div className="hint">No open revolving lines.</div>}
            </div>
          </div>
        </Section>

        {/* ACCOUNT MIX — All/Open/Closed filter + account rows */}
        <Section
          title="Account Mix"
          subtitle="Revolving, loans, deposits & investments"
          right={<span className="mini">{openCount} open • {closedCount} closed</span>}
          open={openAcc.mix}
          onToggle={() => setOpenAcc((o) => ({ ...o, mix: !o.mix }))}
        >
          <div className="sb">
            <div className="seg">
              <button className={`segbtn ${mixView==="all"?"is-active":""}`} onClick={()=>setMixView("all")}>All ({rows.length})</button>
              <button className={`segbtn ${mixView==="open"?"is-active":""}`} onClick={()=>setMixView("open")}>Open ({openCount})</button>
              <button className={`segbtn ${mixView==="closed"?"is-active":""}`} onClick={()=>setMixView("closed")}>Closed ({closedCount})</button>
            </div>

            <div className="grid">
              {mixEntries.map((e) => {
                const share = Math.round((e.exposureShare || 0) * 100);
                const p = ((Number(e.exposure) || 0) / mixMax) * 100;
                const stat = openByMix[e.category] || { open: 0, closed: 0, avgAgeMonths: null };
                const list = filterMixList(accountsInCategory(e.category));
                if (!list.length) return null;

                return (
                  <article key={e.category} className="card">
                    <div className="head">
                      <div className="muted"><strong>{labelOf(e.category)}</strong></div>
                      <span className="pill">{share}%</span>
                    </div>
                    <div className="hint">{e.accounts} account(s) • {money(e.exposure)}</div>
                    <Bar value={p} />
                    <div className="hint" style={{ marginTop: 6 }}>
                      <span className="pill green" style={{ marginRight: 6 }}>Open {stat.open}</span>
                      <span className="pill red">Closed {stat.closed}</span>
                      {stat.avgAgeMonths != null && <> • Avg age <strong>{ymText(stat.avgAgeMonths)}</strong></>}
                    </div>

                    {/* accounts inside this category */}
                    <div className="grid" style={{ marginTop: 8 }}>
                      {list.map((a) => {
                        const isClosed = isClosedAcct(a);
                        const openM = monthsBetween(a.openedAt);
                        const closedM = monthsBetween(a.closedAt);
                        const showPct = a.accountType === "credit" && !isClosed && a.creditLimit;
                        const u = showPct ? clamp(Math.round(((a.balCurrent || 0) / a.creditLimit) * 100), 0, 100) : null;
                        const tone = u == null ? "#2563eb" : u < 30 ? "#10B981" : u < 80 ? "#F59E0B" : "#EF4444";
                        return (
                          <article key={a.accountId} className={`card ${isClosed?"closed":""}`}>
                            <div className="head">
                              <div className="muted"><strong>{a.name}</strong></div>
                              <span className={`pill ${isClosed?"red":"green"}`}>{isClosed ? "Closed" : (a.accountSubtype || a.accountType)}</span>
                            </div>

                            {a.accountType === "credit" ? (
                              <>
                                <div className="hint">Balance {money(a.balCurrent, a.currency)} • Limit {money(a.creditLimit, a.currency)}</div>
                                {u != null && !isClosed && <Bar value={u} tone={tone} />}
                                {u != null && !isClosed && <div className="hint" style={{ marginTop: 4 }}>Line utilization {pctText(u)}</div>}
                              </>
                            ) : a.accountType === "depository" ? (
                              <div className="hint">Available {money(a.balAvailable, a.currency)} • Current {money(a.balCurrent, a.currency)}</div>
                            ) : a.accountType === "loan" ? (
                              <div className="hint">{isClosed ? "Paid off" : "Outstanding"} {money(a.balCurrent, a.currency)}</div>
                            ) : a.accountType === "investment" ? (
                              <div className="hint">Balance {money(a.balCurrent, a.currency)} • Institution {a.institutionName || "—"}</div>
                            ) : null}

                            <div className="hint">
                              Opened <strong className="pill green" style={{ padding: "2px 6px" }}>{dateFmt(a.openedAt)}</strong>
                              {openM!=null && <> • <strong>{ymText(openM)}</strong> ago</>}
                              {isClosed && a.closedAt && (
                                <> • Closed <strong className="pill red" style={{ padding: "2px 6px" }}>{dateFmt(a.closedAt)}</strong>{closedM!=null && <> • <strong>{ymText(closedM)}</strong> ago</>}</>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
              {!mixEntries.length && <div className="hint">No data.</div>}
            </div>
          </div>
        </Section>

        {/* ACCOUNTS BY TYPE */}
        <Section
          title="Accounts by Type"
          subtitle="Quick readout of balances by group"
          right={<span className="mini">{totalAccounts} total</span>}
          open={openAcc.accounts}
          onToggle={() => setOpenAcc((o) => ({ ...o, accounts: !o.accounts }))}
        >
          <div className="sb">
            <div className="seg">
              <button className={`segbtn ${acctView==="all"?"is-active":""}`} onClick={()=>setAcctView("all")}>All ({totalAccounts})</button>
              <button className={`segbtn ${acctView==="open"?"is-active":""}`} onClick={()=>setAcctView("open")}>Open ({openCount})</button>
              <button className={`segbtn ${acctView==="closed"?"is-active":""}`} onClick={()=>setAcctView("closed")}>Closed ({closedCount})</button>
            </div>

            {/* Depository */}
            <h4 className="muted" style={{ margin: "0 0 6px" }}>Depository ({filterByView(depository).length})</h4>
            <div className="grid">
              {filterByView(depository).map((a) => {
                const openM = monthsBetween(a.openedAt);
                const closedM = monthsBetween(a.closedAt);
                return (
                  <article key={a.accountId} className={`card ${isClosedAcct(a)?"closed":""}`}>
                    <div className="head">
                      <div className="muted"><strong>{a.name}</strong></div>
                      <span className={`pill ${isClosedAcct(a)?"red":"green"}`}>{isClosedAcct(a) ? "Closed" : (a.accountSubtype || "account")}</span>
                    </div>
                    <div className="hint">Available {money(a.balAvailable, a.currency)} • Current {money(a.balCurrent, a.currency)}</div>
                    <div className="hint">
                      Opened <strong className="pill green" style={{ padding: "2px 6px" }}>{dateFmt(a.openedAt)}</strong>
                      {openM!=null && <> • <strong>{ymText(openM)}</strong> ago</>}
                      {isClosedAcct(a) && a.closedAt && (
                        <> • Closed <strong className="pill red" style={{ padding: "2px 6px" }}>{dateFmt(a.closedAt)}</strong>{closedM!=null && <> • <strong>{ymText(closedM)}</strong> ago</>}</>
                      )}
                    </div>
                  </article>
                );
              })}
              {!filterByView(depository).length && <div className="hint">No depository accounts.</div>}
            </div>

            {/* Credit */}
            <h4 className="muted" style={{ margin: "12px 0 6px" }}>Credit ({filterByView(credit).length})</h4>
            <div className="grid">
              {filterByView(credit).map((a) => {
                const u = a.creditLimit ? clamp(Math.round(((a.balCurrent || 0) / a.creditLimit) * 100), 0, 100) : 0;
                const tone = u < 10 ? "#0ea5e9" : u < 30 ? "#10B981" : u < 50 ? "#84CC16" : u < 80 ? "#F59E0B" : "#EF4444";
                const openM = monthsBetween(a.openedAt);
                const closedM = monthsBetween(a.closedAt);
                return (
                  <article key={a.accountId} className={`card ${isClosedAcct(a)?"closed":""}`}>
                    <div className="head">
                      <div className="muted"><strong>{a.name}</strong></div>
                      <span className={`pill ${isClosedAcct(a)?"red":u<30?"green":"blue"}`}>{isClosedAcct(a) ? "Closed" : pctText(u)}</span>
                    </div>
                    <div className="hint">Balance {money(a.balCurrent, a.currency)} • Limit {money(a.creditLimit, a.currency)}</div>
                    {!isClosedAcct(a) && <Bar value={u} tone={tone} />}
                    <div className="hint">
                      Opened <strong className="pill green" style={{ padding: "2px 6px" }}>{dateFmt(a.openedAt)}</strong>
                      {openM!=null && <> • <strong>{ymText(openM)}</strong> ago</>}
                      {isClosedAcct(a) && a.closedAt && (
                        <> • Closed <strong className="pill red" style={{ padding: "2px 6px" }}>{dateFmt(a.closedAt)}</strong>{closedM!=null && <> • <strong>{ymText(closedM)}</strong> ago</>}</>
                      )}
                    </div>
                  </article>
                );
              })}
              {!filterByView(credit).length && <div className="hint">No credit accounts.</div>}
            </div>

            {/* Loans */}
            <h4 className="muted" style={{ margin: "12px 0 6px" }}>Loans ({filterByView(loans).length})</h4>
            <div className="grid">
              {filterByView(loans).map((a) => {
                const openM = monthsBetween(a.openedAt);
                const closedM = monthsBetween(a.closedAt);
                return (
                  <article key={a.accountId} className={`card ${isClosedAcct(a)?"closed":""}`}>
                    <div className="head">
                      <div className="muted"><strong>{a.name}</strong></div>
                      <span className={`pill ${isClosedAcct(a)?"red":"green"}`}>{isClosedAcct(a) ? "Closed" : (a.accountSubtype || "loan")}</span>
                    </div>
                    <div className="hint">{isClosedAcct(a) ? "Paid off" : "Outstanding"} {money(a.balCurrent, a.currency)}</div>
                    <div className="hint">
                      Opened <strong className="pill green" style={{ padding: "2px 6px" }}>{dateFmt(a.openedAt)}</strong>
                      {openM!=null && <> • <strong>{ymText(openM)}</strong> ago</>}
                      {isClosedAcct(a) && a.closedAt && (
                        <> • Closed <strong className="pill red" style={{ padding: "2px 6px" }}>{dateFmt(a.closedAt)}</strong>{closedM!=null && <> • <strong>{ymText(closedM)}</strong> ago</>}</>
                      )}
                    </div>
                  </article>
                );
              })}
              {!filterByView(loans).length && <div className="hint">No loan accounts.</div>}
            </div>

            {/* Investments */}
            <h4 className="muted" style={{ margin: "12px 0 6px" }}>Investments ({filterByView(investments).length})</h4>
            <div className="grid">
              {filterByView(investments).map((a) => {
                const openM = monthsBetween(a.openedAt);
                return (
                  <article key={a.accountId} className={`card ${isClosedAcct(a)?"closed":""}`}>
                    <div className="head">
                      <div className="muted"><strong>{a.name}</strong></div>
                      <span className="pill green">{a.accountSubtype || "investment"}</span>
                    </div>
                    <div className="hint">Balance {money(a.balCurrent, a.currency)} • Institution {a.institutionName || "—"}</div>
                    <div className="hint">
                      Opened <strong className="pill green" style={{ padding: "2px 6px" }}>{dateFmt(a.openedAt)}</strong>
                      {openM!=null && <> • <strong>{ymText(openM)}</strong> ago</>}
                    </div>
                  </article>
                );
              })}
              {!filterByView(investments).length && <div className="hint">No investment accounts.</div>}
            </div>
          </div>
        </Section>

        {/* COACH */}
        <Section
          title="Coach"
          subtitle="Keep balances low, pay on time, avoid new hard pulls"
          right={<span className="mini">Tips</span>}
          open={openAcc.coach}
          onToggle={() => setOpenAcc((o) => ({ ...o, coach: !o.coach }))}
        >
          <div className="sb" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to="/utilization" className="chip">🎯 Keep overall &lt; 30%</Link>
            <Link to="/payment-history" className="chip">✅ On-time payments</Link>
            <Link to="/inquiries" className="chip">🛑 Limit hard inquiries</Link>
            <Link to="/score-scale" className="chip">📏 See score bands</Link>
          </div>
        </Section>
      </div>

      <div className={`toast ${((mix && toastMix) || (rows.length && toastAcc) || (util && toastUtil)) ? "show" : ""}`} role="status" aria-live="polite">
        Showing sample data ({pickDemoKey().toUpperCase()}) (API not reachable).
      </div>
    </section>
  );
}
