import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";

/* ------- Config -------- */
const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
const API = `${API_BASE}/api/data/accounts`;

export default function ActiveAccountDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const side = params.get("side"); // origin | dest | null

  const [row, setRow] = useState(null);
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
        const data = await r.json();
        if (ac.signal.aborted) return;

        const found =
          (Array.isArray(data) ? data : []).find(
            (a) => String(a.accountId) === String(id)
          ) || null;

        setRow(found);
      } catch {
        if (!ac.signal.aborted) setErr("Could not load account.");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [id]);

  if (loading) return <section className="page"><p>Loading…</p></section>;
  if (err) return <section className="page"><p>⚠️ {err}</p></section>;
  if (!row) return <section className="page"><p>Not found.</p></section>;

  return (
    <section className="page">
      <h1>Account Detail</h1>
      <p>
        <Link to={side ? `/active-accounts?side=${side}` : "/active-accounts"}>
          ← Back to Active Accounts
        </Link>
      </p>
      <pre
        style={{
          background: "#fff",
          padding: 12,
          borderRadius: 8,
          overflow: "auto",
          border: "1px solid #e5e7eb",
        }}
      >
        {JSON.stringify(row, null, 2)}
      </pre>
    </section>
  );
}
