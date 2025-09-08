import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CreditGauge from "../../components/CreditGauge";
import PageHeader from "../../components/PageHeader";
import ConfettiBurst from "../../components/ConfettiBurst";
import { toast } from "../../components/Toaster";

/* ------- Config -------- */
const API_BASE = import.meta?.env?.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
const API_SCORES = `${API_BASE}/api/data/scores`; // server can read ?origin=XX&dest=YY

/* flags + names */
const flagEmoji = (cc) => {
  if (!cc || cc.length < 2) return "🌍";
  const a = cc[0].toUpperCase().charCodeAt(0) - 65 + 0x1f1e6;
  const b = cc[1].toUpperCase().charCodeAt(0) - 65 + 0x1f1e6;
  return String.fromCodePoint(a, b);
};
const COUNTRY_NAMES = {
  IN: "India", US: "United States", GB: "United Kingdom", CA: "Canada",
  AU: "Australia", DE: "Germany", FR: "France", SG: "Singapore",
};
const nameOf = (cc) => COUNTRY_NAMES[cc?.toUpperCase()] || (cc || "").toUpperCase();

/* tiny sparkline */
function Sparkline({ data = [] }) {
  const w = 64, h = 18, pad = 1;
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const span = Math.max(1, max - min);
  const step = (w - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mini-spark" aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.6" points={pts} />
    </svg>
  );
}

/* bands */
const BANDS = [
  { name: "Poor", min: 0 },
  { name: "Fair", min: 580 },
  { name: "Good", min: 670 },
  { name: "Very Good", min: 740 },
  { name: "Excellent", min: 800 },
];
const bandIndex = (score) => { let i=0; for (let k=0;k<BANDS.length;k++) if (score>=BANDS[k].min) i=k; return i; };
const bandName  = (score) => BANDS[bandIndex(score)].name;

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      const t0 = now + i * 0.08;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.2, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      o.start(t0); o.stop(t0 + 0.4);
    });
  } catch {}
}

export default function GlobalScore() {
  /* route (origin/dest) — live from Topbar + persisted */
  const [route, setRoute] = useState(() => ({
    origin: (localStorage.getItem("originCountry") || "IN").toUpperCase(),
    dest:   (localStorage.getItem("destCountry")   || "US").toUpperCase(),
  }));
  useEffect(() => {
    const onRoute = (e) => {
      const o = e.detail?.origin?.toUpperCase?.() || route.origin;
      const d = e.detail?.dest?.toUpperCase?.()   || route.dest;
      setRoute({ origin: o, dest: d });
    };
    window.addEventListener("country-change", onRoute);
    return () => window.removeEventListener("country-change", onRoute);
  }, [route.origin, route.dest]);

  /* scores */
  const [origin, setOrigin] = useState(680);
  const [dest, setDest] = useState(720);
  const [loading, setLoading] = useState(false);

  // fetch when route changes (with AbortController)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_SCORES}?origin=${route.origin}&dest=${route.dest}`, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (ac.signal.aborted) return;
        if (typeof json?.origin === "number") setOrigin(json.origin);
        if (typeof json?.destination === "number") setDest(json.destination);
      } catch {
        // silent fallback to demo values
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [route.origin, route.dest]);

  const combined = useMemo(() => Math.round((origin + dest) / 2), [origin, dest]);

  /* hub pages */
  const PAGES = useMemo(
    () =>
      [
        { to: "/account-mix", label: "Account Mix", desc: "Composition across credit, loans & deposits", icon: () => <span>🧩</span> },
        { to: "/active-accounts", label: "Active Accounts", desc: "All linked accounts and balances", icon: () => <span>🏦</span> },
        { to: "/adverse-records", label: "Adverse Records", desc: "Collections, write-offs, bankruptcies", icon: () => <span>⚠️</span> },
        { to: "/alt-data", label: "Alt-Data", desc: "Phone, utilities & other alternative data", icon: () => <span>🧪</span> },
        { to: "/banking", label: "Banking", desc: "Cash flow signals from bank activity", icon: () => <span>🏛️</span> },
        { to: "/credit-length", label: "Credit Length", desc: "Average and oldest account age", icon: () => <span>⏳</span> },
        { to: "/inquiries", label: "Inquiries", desc: "Hard pulls in recent months", icon: () => <span>🔎</span> },
        { to: "/payment-history", label: "Payment History", desc: "On-time rate & delinquencies", icon: () => <span>💳</span> },
        { to: "/recent-behavior", label: "Recent Behavior", desc: "New accounts, spend spikes, risk", icon: () => <span>📈</span> },
        { to: "/score-scale", label: "Score Scale", desc: "What 0–1000 means by band", icon: () => <span>📏</span> },
        { to: "/utilization", label: "Utilization", desc: "Credit used vs. available limit", icon: () => <span>📊</span> },
        { to: "/country-normalization", label: "Country Normalization", desc: "Cross-country score alignment", icon: () => <span>🌍</span> },
      ].sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  /* celebrate & history */
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const prev = Number(localStorage.getItem("lastGlobalScore"));
    const prevIdx = Number.isFinite(prev) ? bandIndex(prev) : null;
    const nowIdx  = bandIndex(combined);
    if (prevIdx == null ? nowIdx >= bandIndex(670) : nowIdx > prevIdx) {
      setCelebrate(true);
      toast(`🎉 Congrats! Your band improved to ${bandName(combined)}.`, { variant: "success", ttl: 4200 });
      playChime();
      setTimeout(() => setCelebrate(false), 3600);
    }
    localStorage.setItem("lastGlobalScore", String(combined));
    const hist = JSON.parse(localStorage.getItem("scoreHistory") || "[]");
    hist.push(combined);
    localStorage.setItem("scoreHistory", JSON.stringify(hist.slice(-40)));
    localStorage.setItem("lastOriginScore", String(origin));
    localStorage.setItem("lastDestScore",   String(dest));
  }, [combined, origin, dest]);

  // deltas for KPI pills
  const originDelta = origin - Number(localStorage.getItem("lastOriginScore") || origin);
  const destDelta   = dest   - Number(localStorage.getItem("lastDestScore")   || dest);

  // global sparkline (only when useful)
  const scoreHistory = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("scoreHistory") || "[]"); }
    catch { return []; }
  }, []);
  const showSpark = useMemo(() => {
    if (scoreHistory.length < 3) return false;
    const min = Math.min(...scoreHistory), max = Math.max(...scoreHistory);
    return max - min > 2; // render only if variation > 2 pts
  }, [scoreHistory]);

  return (
    <section className="page">
      <ConfettiBurst fire={celebrate || combined >= 670} />

      <PageHeader
        title="Global Score"
        subtitle={
          <>
            Cross-country normalized credit summary.
            {loading && <span style={{ marginLeft: 8, color: "#6b7280" }}>Loading…</span>}
          </>
        }
        context={{ origin: nameOf(route.origin), dest: nameOf(route.dest), range: "Last 30 days" }}
      />

      {/* KPI pills */}
      <div className="hub-grid compact" role="list" style={{ marginTop: 8 }}>
        <Link to="/active-accounts?side=origin" className="hub-card slim" role="listitem" title="See accounts in origin country">
          <div className="hub-icon small">{flagEmoji(route.origin)}</div>
          <div className="hub-main">
            <div className="hub-title">Origin</div>
            <div className="hub-desc">
              <strong>{origin}</strong>{" "}
              {originDelta === 0 ? "· 0" : originDelta > 0 ? `· ▲${originDelta}` : `· ▼${Math.abs(originDelta)}`}
            </div>
          </div>
          <div className="hub-arrow" aria-hidden>→</div>
        </Link>

        <Link to="/active-accounts?side=dest" className="hub-card slim" role="listitem" title="See accounts in destination country">
          <div className="hub-icon small">{flagEmoji(route.dest)}</div>
          <div className="hub-main">
            <div className="hub-title">Destination</div>
            <div className="hub-desc">
              <strong>{dest}</strong>{" "}
              {destDelta === 0 ? "· 0" : destDelta > 0 ? `· ▲${destDelta}` : `· ▼${Math.abs(destDelta)}`}
            </div>
          </div>
          <div className="hub-arrow" aria-hidden>→</div>
        </Link>

        <Link to="/score-scale" className="hub-card slim" role="listitem" title="See band scale">
          <div className="hub-icon small">🌍</div>
          <div className="hub-main">
            <div className="hub-title">Global</div>
            <div className="hub-desc">
              <strong>{combined}</strong> ({bandName(combined)})
            </div>
          </div>
          {showSpark ? <Sparkline data={scoreHistory.slice(-20)} /> : <div className="hub-arrow" aria-hidden>→</div>}
        </Link>
      </div>

      {/* Hub menu */}
      <div className="hub-grid compact" role="list" style={{ marginTop: 8 }}>
        {PAGES.map(({ to, label, icon: Icon, desc }) => (
          <Link key={to} to={to} className="hub-card slim" role="listitem" title={desc}>
            <div className="hub-icon small"><Icon /></div>
            <div className="hub-main">
              <div className="hub-title">{label}</div>
              <div className="hub-desc">{desc}</div>
            </div>
            <div className="hub-arrow" aria-hidden>→</div>
          </Link>
        ))}
      </div>

      {/* Dials (hide band text for global) */}
      <div className="score-grid compact small">
        <div className="score-tile sm">
          <h3>Origin Score</h3>
          <CreditGauge score={origin} width={220} size="sm" />
        </div>
        <div className="score-tile sm">
          <h3>Destination Score</h3>
          <CreditGauge score={dest} width={220} size="sm" />
        </div>
        <div className="score-tile sm hide-band">
          <h3>Global Score</h3>
          <CreditGauge score={combined} width={220} size="sm" />
        </div>
      </div>
    </section>
  );
}
