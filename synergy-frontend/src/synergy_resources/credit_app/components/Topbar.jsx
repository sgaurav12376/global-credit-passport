// src/components/Topbar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CountrySelect from "./CountrySelect";

const API_UTIL = "api/data/utilization";

// bands
const BANDS = [
  { name: "Poor", min: 0 },
  { name: "Fair", min: 580 },
  { name: "Good", min: 670 },
  { name: "Very Good", min: 740 },
  { name: "Excellent", min: 800 },
];
const bandName = (score) => {
  let idx = 0;
  for (let i = 0; i < BANDS.length; i++) if (score >= BANDS[i].min) idx = i;
  return BANDS[idx].name;
};

// tiny sparkline for score history
function Sparkline({ data = [] }) {
  const w = 60, h = 18, pad = 1;
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
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mini-spark">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.6" points={pts} />
    </svg>
  );
}

export default function Topbar() {
  const nav = useNavigate();

  // routes + search
  const [routes, setRoutes] = useState([
    { to: "/score", label: "Global Score", keywords: "summary overview combined aggregate" },
    { to: "/active-accounts", label: "Active Accounts", keywords: "accounts balances credit loan deposit" },
    { to: "/utilization", label: "Utilization", keywords: "credit usage ratio percent" },
    { to: "/account-mix", label: "Account Mix", keywords: "mix diversity exposure categories" },
  ]);
  const [q, setQ] = useState("");
  const [openSearch, setOpenSearch] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/routes.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => Array.isArray(j) && j.length ? setRoutes(j) : setError(""))
      .catch(() => setError(""));
  }, []);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return routes
      .filter(r => (r.label + " " + (r.keywords || "")).toLowerCase().includes(s))
      .slice(0, 8);
  }, [q, routes]);
  const inputRef = useRef(null);
  const go = (to) => { nav(to); setQ(""); setOpenSearch(false); inputRef.current?.blur(); };

  // keyboard: "/" focuses search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault(); inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // countries (persist + broadcast)
  const [origin, setOrigin] = useState(localStorage.getItem("originCode") || "IN");
  const [dest, setDest] = useState(localStorage.getItem("destCode") || "US");
  const broadcast = () => window.dispatchEvent(new Event("countryRouteChanged"));

  const updateOrigin = (code) => { setOrigin(code); localStorage.setItem("originCode", code); broadcast(); };
  const updateDest   = (code) => { setDest(code);   localStorage.setItem("destCode", code);   broadcast(); };
  const swapCountries = () => {
    const o = dest, d = origin;
    setOrigin(o); setDest(d);
    localStorage.setItem("originCode", o);
    localStorage.setItem("destCode", d);
    broadcast();
  };

  // utilization fetch (for status mini-donut + Util chip)
  const [util, setUtil] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API_UTIL);
        if (!r.ok) throw new Error();
        const j = await r.json();
        const p = Number(j?.utilizationPercent);
        if (Number.isFinite(p)) setUtil(Math.max(0, Math.min(100, p)));
      } catch { /* silent */ }
    })();
  }, []);
  const utilPct = util == null ? null : Math.round(util);
  const donutR = 8, donutC = 2 * Math.PI * donutR;
  const donutDash = utilPct == null ? 0 : (utilPct / 100) * donutC;
  const utilColor =
    utilPct == null ? "#9ca3af" :
    utilPct < 30 ? "#10b981" :
    utilPct < 60 ? "#84cc16" :
    utilPct < 80 ? "#f59e0b" : "#ef4444";

  // Utilization Chip (slightly bigger donut)
  const bigR = 9, bigC = 2 * Math.PI * bigR;
  const bigDash = utilPct == null ? 0 : (utilPct / 100) * bigC;
  const utilClass =
    utilPct == null ? "" :
    utilPct < 30 ? "good" :
    utilPct < 60 ? "ok"   :
    utilPct < 80 ? "warn" : "bad";

  // global score pill info
  const lastScore = Number(localStorage.getItem("lastGlobalScore"));
  const scoreHistory = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("scoreHistory") || "[]"); }
    catch { return []; }
  }, []);
  const prevScore = scoreHistory.length > 1 ? Number(scoreHistory[scoreHistory.length - 2]) : NaN;
  const delta = Number.isFinite(lastScore) && Number.isFinite(prevScore) ? lastScore - prevScore : null;
  const band = Number.isFinite(lastScore) ? bandName(lastScore) : null;
  const bandClass =
    !Number.isFinite(lastScore) ? "" :
    lastScore >= 800 ? "good" :
    lastScore >= 670 ? "ok"   : "bad";

  // user / menus
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const notifRef = useRef(null), menuRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const [notifs, setNotifs] = useState([
    { id: 1, title: "Score updated", time: "Just now", unread: true },
    { id: 2, title: "New account linked", time: "1h", unread: true },
    { id: 3, title: "Payment posted", time: "Yesterday", unread: false },
  ]);
  const unreadCount = notifs.filter(n => n.unread).length;
  const markAllRead = () => setNotifs((n) => n.map(x => ({ ...x, unread: false })));
  const userName = localStorage.getItem("userName") || "Demo Boss";
  const initials = (userName.split(" ").map(p => p[0]).join("").slice(0,2) || "DB").toUpperCase();
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;

  return (
    <header className="topbar">
      <div className="tb-left tb-inline">
        {/* 1) Search */}
        <div className="searchwrap">
          <input
            ref={inputRef}
            className="search"
            placeholder="Search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpenSearch(true); }}
          />
          {openSearch && results.length > 0 && (
            <div className="search-results">
              {results.map((r) => (
                <button key={r.to} className="search-item" onMouseDown={() => go(r.to)}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
          {error && <div className="note">{error}</div>}
        </div>

        {/* 2) Countries + dotted route + swap */}
        <div className="country-group" title="Normalization route">
          <CountrySelect value={origin} onChange={updateOrigin} />
          <div className="route-anim" aria-hidden>
            <span className="dot" />
            {/* CHANGED: credit-score gauge icon (replaces plane) */}
            <svg
              className="plane score-ic"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-label="Credit score normalization"
            >
              <path d="M4 14a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="14" r="1.8" fill="currentColor"/>
              <path d="M12 14l4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="dot" />
          </div>
          <CountrySelect value={dest} onChange={updateDest} />
          <button className="swap-btn" onClick={swapCountries} title="Swap countries">⇄</button>
        </div>

        {/* 3) Status pill (Global + mini util + sparkline + delta) */}
        {Number.isFinite(lastScore) && (
          <span className={`ctx-chip ${bandClass}`} title="Global status">
            <span className="pulse-dot" aria-hidden />
            {utilPct != null && (
              <svg className="util-mini" width="18" height="18" viewBox="0 0 20 20" aria-label={utilPct == null ? "Utilization —" : `Utilization ${utilPct}%`}>
                <circle cx="10" cy="10" r={donutR} fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="10" cy="10" r={donutR} fill="none"
                  stroke={utilColor} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${donutDash} ${donutC - donutDash}`}
                  transform="rotate(-90 10 10)"
                />
              </svg>
            )}
            <Sparkline data={scoreHistory.slice(-20)} />
            <span className="ctx-chip-text">
              {lastScore} ({band})
              {delta == null ? "" : delta === 0 ? " · 0" : delta > 0 ? ` · ▲${delta}` : ` · ▼${Math.abs(delta)}`}
            </span>
          </span>
        )}

        {/* 4) Utilization chip */}
        <button className={`util-chip ${utilClass}`} onClick={() => nav("/utilization")} title="Go to Utilization">
          <svg className="donut" width="22" height="22" viewBox="0 0 22 22" aria-label={utilPct == null ? "Utilization —" : `Utilization ${utilPct}%`}>
            <circle cx="11" cy="11" r={bigR} fill="none" stroke="#e5e7eb" strokeWidth="3.2" />
            <circle
              cx="11" cy="11" r={bigR} fill="none"
              stroke={utilColor} strokeWidth="3.2" strokeLinecap="round"
              strokeDasharray={`${bigDash} ${bigC - bigDash}`}
              transform="rotate(-90 11 11)"
            />
          </svg>
          <span>{utilPct == null ? "Util —" : `Util ${utilPct}%`}</span>
        </button>

        {/* 5) Back */}
        {canGoBack && (
          <button className="tb-btn tb-back" onClick={() => nav(-1)} title="Back">
            ←
          </button>
        )}

        {/* 6) Notifications */}
        <div className="tb-icon-wrap" ref={notifRef}>
          <button className="tb-btn tb-icon" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications">
            🔔{unreadCount > 0 && <span className="tb-badge">{unreadCount}</span>}
          </button>
          {notifOpen && (
            <div className="tb-panel tb-notifs">
              <div className="tb-panel-head">
                <strong>Notifications</strong>
                <button className="tb-link" onClick={markAllRead}>Mark all read</button>
              </div>
              <div className="tb-panel-body">
                {notifs.length === 0 ? <div className="tb-empty">No notifications</div> : notifs.map((n) => (
                  <div key={n.id} className={"tb-notif" + (n.unread ? " unread" : "")}>
                    <div className="tb-notif-dot" />
                    <div className="tb-notif-main">
                      <div className="tb-notif-title">{n.title}</div>
                      <div className="tb-notif-time">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 7) Profile */}
        <div className="tb-avatar-wrap" ref={menuRef}>
          <button className="avatar tb-avatar" onClick={() => setMenuOpen((o) => !o)} title={userName}>
            {initials}
          </button>
          {menuOpen && (
            <div className="tb-panel tb-menu">
              <div className="tb-user">
                <div className="tb-user-initials">{initials}</div>
                <div className="tb-user-name">{userName}</div>
              </div>
              <button className="tb-item" onClick={() => alert("Edit profile")}>Edit profile</button>
              <button className="tb-item" onClick={() => alert("Settings")}>Settings</button>
              <button className="tb-item" onClick={() => alert("Keyboard shortcuts")}>Keyboard shortcuts</button>
              <div className="tb-sep" />
              <button className="tb-item danger" onClick={() => alert("Log out")}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
