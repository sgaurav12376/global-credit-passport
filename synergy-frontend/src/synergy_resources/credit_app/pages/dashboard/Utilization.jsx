// src/pages/Utilization.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../../components/PageHeader";

// ----- Config -----
const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
const API_UTIL = `${API_BASE}/api/data/utilization`;
const API_ACCTS = `${API_BASE}/api/data/accounts`;
const TARGET = 30;

// ----- Helpers -----
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const currency = (n, c = "USD") =>
  typeof n === "number" && isFinite(n)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n)
    : "—";

function stableSort(arr, cmp) {
  return arr
    .map((v, i) => [v, i])
    .sort((a, b) => {
      const r = cmp(a[0], b[0]);
      return r !== 0 ? r : a[1] - b[1];
    })
    .map(([v]) => v);
}

async function fetchJson(url, opts = {}, { retries = 1, retryOn = [502, 503, 504] } = {}) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      if (retries > 0 && retryOn.includes(res.status)) {
        return fetchJson(url, opts, { retries: retries - 1, retryOn });
      }
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    if (retries > 0) return fetchJson(url, opts, { retries: retries - 1, retryOn });
    throw err;
  }
}

export default function Utilization() {
  const [percent, setPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [cards, setCards] = useState([]);

  const [open, setOpen] = useState(true);
  const [sort, setSort] = useState(() => localStorage.getItem("util.sort") || "utilDesc"); // utilDesc | utilAsc | name

  useEffect(() => {
    localStorage.setItem("util.sort", sort);
  }, [sort]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setErr("");
        setLoading(true);

        const [uJson, aJson] = await Promise.all([
          fetchJson(API_UTIL, { signal: ac.signal }),
          fetchJson(API_ACCTS, { signal: ac.signal }),
        ]);

        if (ac.signal.aborted) return;

        const p = Number(uJson?.utilizationPercent ?? 0);
        setPercent(isFinite(p) ? p : 0);

        const credit = Array.isArray(aJson)
          ? aJson.filter((r) => (r?.accountType || "").toLowerCase() === "credit")
          : [];
        setCards(credit);
      } catch (e) {
        if (ac.signal.aborted) return;
        setErr("Could not load utilization. Showing demo 45.3%.");
        setPercent(45.3);
        setCards([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  const totals = useMemo(() => {
    const totalBal = cards.reduce((t, r) => t + (Number(r.balCurrent) || 0), 0);
    const totalLimit = cards.reduce((t, r) => t + (Number(r.creditLimit) || 0), 0);
    const avg = totalLimit ? (totalBal / totalLimit) * 100 : 0;
    return { totalBal, totalLimit, avg };
  }, [cards]);

  const good = percent < TARGET;
  const warn = percent >= 80;

  const utilOf = (r) =>
    r?.creditLimit ? clamp((Number(r.balCurrent) || 0) / Number(r.creditLimit), 0, 1) : 0;

  const sortedCards = useMemo(() => {
    const arr = cards || [];
    if (sort === "name") {
      return stableSort(arr, (a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (sort === "utilAsc") {
      return stableSort(arr, (a, b) => utilOf(a) - utilOf(b));
    }
    // default utilDesc
    return stableSort(arr, (a, b) => utilOf(b) - utilOf(a));
  }, [cards, sort]);

  return (
    <section className="page" aria-labelledby="utilization-title">
      <div className="container">
        <PageHeader
          title="Utilization"
          subtitle="Credit used vs available limit (lower is better)."
          donut={{ value: clamp(percent, 0, 100), label: "Utilization" }}
          kpis={[
            { k: "Current", v: `${Math.round(percent)}%` },
            { k: "Target", v: `≤ ${TARGET}%` },
            { k: "Avg. Utilization", v: `${Math.round(totals.avg)}%` },
          ]}
        />

        {/* TWO-COLUMN CENTERED LAYOUT */}
        <div className="util-layout">
          {/* LEFT: donut + tips */}
          <div className="util-left">
            <div className="util-ring" role="img" aria-label={`Utilization ${percent.toFixed(1)}%`}>
              <Donut value={percent} size={190} warn={warn} good={good} />
              <div className="util-center">
                <Odometer value={percent} suffix="%" />
              </div>
              {good && <Bubbles />}
            </div>

            <div className="util-notes">
              {loading && <div className="tip" role="status">Loading…</div>}
              {err && <div className="tip danger" role="alert">{err}</div>}
              <Tip ok={percent < 50}>
                Keep utilization under <b>30%</b> for a healthy score.
              </Tip>
              <Tip ok={percent < 40}>
                Pay mid-cycle to drop utilization before statement cut.
              </Tip>
            </div>
          </div>

          {/* RIGHT: KPIs + strategy */}
          <div className="util-right">
            <div className="kpi-row">
              <KPI label="Total Limit" value={currency(totals.totalLimit)} />
              <KPI label="Used" value={currency(totals.totalBal)} />
              <KPI label="Avg. Utilization" value={`${Math.round(totals.avg)}%`} />
            </div>

            <div className="strategy">
              <div className="strategy-head">
                <span>Progress to target ({TARGET}%)</span>
                <span className="strategy-val">
                  {Math.max(0, percent - TARGET).toFixed(1)}% to go
                </span>
              </div>
              <div className="strategy-bar" aria-hidden>
                <div
                  className="strategy-fill"
                  style={{ width: `${Math.min(100, (percent / TARGET) * 100)}%` }}
                />
                <div className="strategy-mark" style={{ left: "100%" }}>
                  {TARGET}%
                </div>
              </div>
              <ul className="strategy-list">
                <li>Consider a mid-cycle payment to reduce statement balance.</li>
                <li>Keep any single card below 30% to avoid score impact.</li>
                <li>Spread spend across multiple cards when possible.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* COLLAPSIBLE BREAKDOWN */}
        <div className="util-break-head">
          <button
            type="button"
            className={`collapse-toggle ${open ? "open" : ""}`}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="util-breakdown"
          >
            <Chevron className="chev" />
            <span className="label">
              Cards <span className="muted">({sortedCards.length})</span>
            </span>
          </button>

          <div className="util-controls">
            <label className="uc-lab">
              Sort
              <select
                className="aa-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort cards"
              >
                <option value="utilDesc">Utilization: High → Low</option>
                <option value="utilAsc">Utilization: Low → High</option>
                <option value="name">Name A → Z</option>
              </select>
            </label>
          </div>
        </div>

        <div id="util-breakdown" className={`collapse ${open ? "open" : ""}`}>
          {sortedCards.length === 0 ? (
            <div className="tip" style={{ marginTop: 8 }}>
              No credit cards found.
            </div>
          ) : (
            <div className="util-cards">
              {sortedCards.map((c) => {
                const util = utilOf(c);
                const pct = Math.round(util * 100);
                const color =
                  pct < 30
                    ? "#10b981"
                    : pct < 60
                    ? "#84cc16"
                    : pct < 80
                    ? "#f59e0b"
                    : "#ef4444";
                return (
                  <article key={c.accountId ?? c.id ?? c.name} className="util-card">
                    <div className="uc-head">
                      <div className="uc-name" title={c.name || ""}>
                        {c.name || "—"}
                      </div>
                      <div className="uc-pct" style={{ color }}>
                        {pct}%
                      </div>
                    </div>
                    <div className="uc-bar" aria-hidden>
                      <div
                        className="uc-fill"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <div className="uc-row">
                      <span>Balance</span>
                      <span className="uc-v">{currency(Number(c.balCurrent), c.currency)}</span>
                    </div>
                    <div className="uc-row">
                      <span>Limit</span>
                      <span className="uc-v">{currency(Number(c.creditLimit), c.currency)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pieces ---------- */

function Donut({ value = 0, size = 160, good, warn }) {
  const pct = clamp(value, 0, 100);
  const r = (size - 12) / 2;
  const c = Math.PI * 2 * r;
  const dash = (pct / 100) * c;

  const color =
    pct < 30 ? "#10b981" : pct < 60 ? "#84cc16" : pct < 80 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          className="donut-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{
            filter: good
              ? "drop-shadow(0 0 6px rgba(16,185,129,.45))"
              : warn
              ? "drop-shadow(0 0 6px rgba(239,68,68,.45))"
              : "none",
            transition:
              "stroke-dasharray .8s cubic-bezier(.2,.8,.2,1), stroke .25s ease",
          }}
        />
      </g>
    </svg>
  );
}

function Odometer({ value = 0, suffix = "" }) {
  const [v, setV] = useState(0);
  const start = useRef(0);
  const from = useRef(0);

  useEffect(() => {
    let raf;
    start.current = 0;
    from.current = v;
    const target = Number.isFinite(value) ? value : 0;

    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const t = Math.min(1, (ts - start.current) / 800);
      const nv = from.current + (target - from.current) * ease(t);
      setV(nv);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="util-num" aria-live="polite">
      {v.toFixed(1)}
      <span className="util-suffix">{suffix}</span>
    </div>
  );
}

function Tip({ children, ok, danger }) {
  return (
    <div className={`tip ${ok ? "ok" : ""} ${danger ? "danger" : ""}`}>
      <span className="tip-dot">{ok ? "✔" : "•"}</span>
      <span>{children}</span>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="kpi">
      <div className="kpi-k">{label}</div>
      <div className="kpi-v">{value}</div>
    </div>
  );
}

function Bubbles() {
  return (
    <div className="util-bubbles" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{ "--i": i + 1 }} />
      ))}
    </div>
  );
}

function Chevron({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 10l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
