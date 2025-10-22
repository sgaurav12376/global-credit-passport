import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../components/PageHeader"; // ← adjust if needed

/* ------- Config -------- */
const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
const API = `${API_BASE}/api/data/account-mix`;

export default function AccountMix() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const r = await fetch(API, { signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!ac.signal.aborted) setData(j);
      } catch {
        if (!ac.signal.aborted) setErr("Could not load account mix.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const entries = data?.entries || [];
  const maxExp = useMemo(
    () => Math.max(1, ...entries.map((e) => Number(e.exposure) || 0)),
    [entries]
  );

  return (
    <section className="page" aria-labelledby="acct-mix-title">
      <PageHeader
        title="Account Mix"
        subtitle="Distribution of exposure by category."
        kpis={
          !data
            ? []
            : [
                { k: "Total Accounts", v: String(data.totalAccounts ?? "—") },
                {
                  k: "Total Exposure",
                  v:
                    data.totalExposure != null
                      ? `$${Number(data.totalExposure).toLocaleString()}`
                      : "—",
                },
                {
                  k: "Diversity Index",
                  v:
                    data.diversityIndex != null
                      ? Number(data.diversityIndex).toFixed(3)
                      : "—",
                },
              ]
        }
      />

      {loading && <div className="tip" role="status">Loading…</div>}
      {err && !loading && <div className="err" role="alert">⚠️ {err}</div>}

      <div className="mix-list">
        {entries.map((e) => (
          <div className="mix-row" key={e.category}>
            <div className="mix-cat">{labelOf(e.category)}</div>
            <div className="mix-bar" aria-hidden>
              <div
                className="mix-fill"
                style={{ width: `${((Number(e.exposure) || 0) / maxExp) * 100}%` }}
              />
            </div>
            <div className="mix-meta">
              <span>{e.accounts} acct</span>
              <span>${(Number(e.exposure) || 0).toLocaleString()}</span>
              <span>{Math.round(((e.exposureShare || 0) * 100) || 0)}%</span>
            </div>
          </div>
        ))}
        {entries.length === 0 && !loading && !err && (
          <div className="tip" style={{ marginTop: 8 }}>
            No data.
          </div>
        )}
      </div>
    </section>
  );
}

function labelOf(cat = "") {
  return (
    {
      LOAN_STUDENT: "Student Loan",
      LOAN_MORTGAGE: "Mortgage",
      DEPOSIT_SAVINGS: "Savings",
      DEPOSIT_CHECKING: "Checking",
      INVESTMENT: "Investment",
      CREDIT: "Credit",
    }[cat] || cat.replace(/_/g, " ")
  );
}
