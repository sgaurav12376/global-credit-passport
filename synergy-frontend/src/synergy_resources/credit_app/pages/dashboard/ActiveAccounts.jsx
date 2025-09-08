import { useEffect, useMemo, useState } from "react";

/* ------- Config -------- */
const API_URL = "api/data/accounts";
const NA = "—";
const money = (n, c = "USD") =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n)
    : NA;

const META = {
  depository: { label: "Depository", color: "#0ea5e9", icon: "🏦" },
  credit:     { label: "Credit",     color: "#6366f1", icon: "💳" },
  investment: { label: "Investment", color: "#10b981", icon: "📈" },
  loan:       { label: "Loan",       color: "#f59e0b", icon: "📄"  },
  default:    { label: "Account",    color: "#6b7280", icon: "📁" },
};

export default function ActiveAccounts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // UI state
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | depository | credit | investment | loan
  const [sort, setSort] = useState("none");    // none | balDesc | balAsc | utilDesc
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await fetch(API_URL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr("Could not load accounts.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // helpers
  const utilOf = (r) =>
    r.accountType === "credit" && r.creditLimit
      ? (r.balCurrent ?? 0) / r.creditLimit
      : null;

  // search + filter
  const filtered = useMemo(() => {
    const base =
      filter === "all" ? rows : rows.filter((r) => r.accountType === filter);
    if (!q.trim()) return base;
    const s = q.toLowerCase();
    return base.filter((r) =>
      [
        r.name,
        r.officialName,
        r.accountType,
        r.accountSubtype,
        r.holderCategory,
        r.currency,
        r.institutionName,
        r.accountId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [rows, filter, q]);

  // sort
  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "balDesc") {
      copy.sort(
        (a, b) => (b.balCurrent ?? -Infinity) - (a.balCurrent ?? -Infinity)
      );
    } else if (sort === "balAsc") {
      copy.sort(
        (a, b) => (a.balCurrent ?? Infinity) - (b.balCurrent ?? Infinity)
      );
    } else if (sort === "utilDesc") {
      copy.sort(
        (a, b) => (utilOf(b) ?? -Infinity) - (utilOf(a) ?? -Infinity)
      );
    }
    return copy;
  }, [filtered, sort]);

  // paging
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);
  useEffect(() => setPage(1), [q, filter, sort, pageSize]);

  // counts for chips
  const counts = useMemo(() => {
    const c = { depository: 0, credit: 0, investment: 0, loan: 0 };
    rows.forEach((r) => (c[r.accountType] !== undefined ? c[r.accountType]++ : null));
    return c;
  }, [rows]);

  return (
    <section className="page">
      {/* Header row: title on left; controls to the right */}
      <div className="aa-headrow">
        <h1 className="aa-title">Accounts</h1>

        <div className="aa-controls">
          <input
            className="aa-input"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search accounts"
          />

          <select
            className="aa-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort"
          >
            <option value="none">Sort: None</option>
            <option value="balDesc">Balance: High → Low</option>
            <option value="balAsc">Balance: Low → High</option>
            <option value="utilDesc">Utilization: High → Low</option>
          </select>

          <select
            className="aa-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {[8, 12, 16, 24].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter chips */}
      <div className="aa-chips">
        <Chip
          label={`All (${rows.length})`}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <Chip
          label={`Depository (${counts.depository})`}
          color={META.depository.color}
          active={filter === "depository"}
          onClick={() => setFilter("depository")}
        />
        <Chip
          label={`Credit (${counts.credit})`}
          color={META.credit.color}
          active={filter === "credit"}
          onClick={() => setFilter("credit")}
        />
        <Chip
          label={`Investment (${counts.investment})`}
          color={META.investment.color}
          active={filter === "investment"}
          onClick={() => setFilter("investment")}
        />
        <Chip
          label={`Loan (${counts.loan})`}
          color={META.loan.color}
          active={filter === "loan"}
          onClick={() => setFilter("loan")}
        />
      </div>

      {/* Info / Error */}
      {err && <div className="aa-error">⚠️ {err}</div>}

      {/* Grid */}
      {loading ? (
        <div className="aa-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="aa-grid">
          {pageRows.map((acc) => (
            <Card key={acc.accountId} acc={acc} />
          ))}
          {pageRows.length === 0 && (
            <div className="aa-empty">No accounts match your filters.</div>
          )}
        </div>
      )}

      {/* Pager */}
      <div className="aa-pager">
        <button
          className="aa-btn"
          onClick={() => setPage(1)}
          disabled={page === 1}
          title="First"
        >
          ⏮
        </button>
        <button
          className="aa-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          title="Prev"
        >
          ◀
        </button>
        <span className="aa-page">
          Page <strong>{page}</strong> / {totalPages}
        </span>
        <button
          className="aa-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          title="Next"
        >
          ▶
        </button>
        <button
          className="aa-btn"
          onClick={() => setPage(totalPages)}
          disabled={page === totalPages}
          title="Last"
        >
          ⏭
        </button>
      </div>
    </section>
  );
}

/* ---------- Small parts ---------- */
function Chip({ label, active, onClick, color }) {
  return (
    <button
      className={`aa-chip ${active ? "is-active" : ""}`}
      style={active && color ? { borderColor: color, color } : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Card({ acc }) {
  const meta = META[acc.accountType] || META.default;
  const util =
    acc.accountType === "credit" && acc.creditLimit
      ? Math.max(0, Math.min(1, (acc.balCurrent ?? 0) / acc.creditLimit))
      : null;

  return (
    <article className="aa-card">
      <header className="aa-card-head">
        <span className="aa-card-ico" style={{ color: meta.color }}>
          {meta.icon}
        </span>
        <div className="aa-card-titles">
          <div className="aa-card-name" title={acc.name || NA}>
            {acc.name || NA}
          </div>
          <div className="aa-card-sub">
            <span className="aa-pill" style={{ borderColor: meta.color, color: meta.color }}>
              {acc.accountSubtype || acc.accountType || "account"}
            </span>
            {acc.holderCategory && (
              <span className="aa-pill muted">{acc.holderCategory}</span>
            )}
            <span className="aa-pill ghost">
              {(META[acc.accountType]?.label) || "Account"}
            </span>
          </div>
        </div>
      </header>

      <div className="aa-card-body">
        {/* Type-specific rows */}
        {acc.accountType === "credit" ? (
          <>
            <Row k="Current Balance" v={money(acc.balCurrent, acc.currency)} />
            <Row k="Credit Limit" v={money(acc.creditLimit, acc.currency)} />
            <div className="aa-util">
              <div className="aa-util-top">
                <span>Utilization</span>
                <span>{util == null ? NA : `${Math.round(util * 100)}%`}</span>
              </div>
              <div className="aa-util-bar">
                <div
                  className="aa-util-fill"
                  style={{
                    width: util == null ? 0 : `${util * 100}%`,
                    background: meta.color,
                  }}
                />
              </div>
            </div>
          </>
        ) : acc.accountType === "depository" ? (
          <>
            <Row k="Available" v={money(acc.balAvailable, acc.currency)} />
            <Row k="Current" v={money(acc.balCurrent, acc.currency)} />
          </>
        ) : acc.accountType === "investment" ? (
          <>
            <Row k="Current Balance" v={money(acc.balCurrent, acc.currency)} />
            <Row k="Institution" v={acc.institutionName || NA} />
          </>
        ) : acc.accountType === "loan" ? (
          <>
            <Row k="Outstanding" v={money(acc.balCurrent, acc.currency)} />
            <Row k="Subtype" v={acc.accountSubtype || NA} />
          </>
        ) : null}

        {/* Common rows */}
        <Row k="Account ID" v={<code>{acc.accountId?.slice(0, 8) || NA}</code>} />
        <Row k="Currency" v={acc.currency || NA} />
      </div>
    </article>
  );
}

function Row({ k, v }) {
  return (
    <div className="aa-kv">
      <div className="aa-k">{k}</div>
      <div className="aa-v">{v ?? NA}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <article className="aa-card aa-skel">
      <div className="aa-skel-line" style={{ width: "55%" }} />
      <div className="aa-skel-line" style={{ width: "40%" }} />
      <div className="aa-skel-line" style={{ width: "90%" }} />
      <div className="aa-skel-line" style={{ width: "70%" }} />
    </article>
  );
}
