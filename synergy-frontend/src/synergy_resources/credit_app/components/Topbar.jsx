// src/synergy_resources/credit_app/components/Topbar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, LogOut, User2, TrendingUp } from "lucide-react";
import CountrySelect from "./CountrySelect";
import { useAuth } from "../context/AuthContext.jsx";

const API_UTIL     = "/api/data/utilization";
const API_ME       = "/api/me";
const API_SETTINGS = "/api/settings";
const API_LOGOUT   = "/api/logout";

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

export default function Topbar() {
  const nav = useNavigate();
  const { signout } = useAuth();

  const [origin, setOrigin] = useState(localStorage.getItem("originCode") || "IN");
  const [dest,   setDest]   = useState(localStorage.getItem("destCode")   || "US");
  const broadcast = () => window.dispatchEvent(new Event("countryRouteChanged"));
  const updateOrigin = (code) => { setOrigin(code); localStorage.setItem("originCode", code); broadcast(); };
  const updateDest   = (code) => { setDest(code);   localStorage.setItem("destCode", code);   broadcast(); };

  const [util, setUtil] = useState(null);
  useEffect(() => {
    let cancel = false;
    const load = async () => {
      try {
        const r = await fetch(API_UTIL);
        if (!r.ok) throw new Error();
        const j = await r.json();
        const p = Number(j?.utilizationPercent);
        if (!cancel && Number.isFinite(p)) setUtil(Math.max(0, Math.min(100, p)));
      } catch {}
    };
    load();
    const id = setInterval(load, 45000);
    return () => { cancel = true; clearInterval(id); };
  }, []);
  const utilPct = util == null ? null : Math.round(util);
  const donutR = 9, donutC = 2 * Math.PI * donutR;
  const donutDash = utilPct == null ? 0 : (utilPct / 100) * donutC;
  const utilColor =
    utilPct == null ? "#9ca3af" :
    utilPct < 30 ? "#10b981" :
    utilPct < 60 ? "#84cc16" :
    utilPct < 80 ? "#f59e0b" : "#ef4444";
  const utilClass =
    utilPct == null ? "" :
    utilPct < 30 ? "good" :
    utilPct < 60 ? "ok"   :
    utilPct < 80 ? "warn" : "bad";

  const lastScore = Number(localStorage.getItem("lastGlobalScore"));
  const band = Number.isFinite(lastScore) ? bandName(lastScore) : null;
  const bandClass =
    !Number.isFinite(lastScore) ? "" :
    lastScore >= 800 ? "good" :
    lastScore >= 670 ? "ok"   : "bad";

  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const notifRef = useRef(null), menuRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const [userName, setUserName] = useState(localStorage.getItem("userName") || "Guest");
  const initials = (userName.split(" ").map(p => p[0]).join("").slice(0,2) || "GU").toUpperCase();

  const handleLogout = async () => {
    try { await fetch(API_LOGOUT, { method: "POST" }); } catch {}
    signout?.();
    nav("/login");
  };

  return (
    <header className="topbar">
      <div className="tb-left">
        <div className="brand"><TrendingUp size={18} /> <span>Synergy Credit</span></div>
        <div className="welcome">Welcome back, <strong>{userName.split(" ")[0]}</strong> 👋</div>
      </div>

      <div className="tb-center">
        <div className="country-group">
          <CountrySelect value={origin} onChange={updateOrigin} />
          <div className="route-anim"><span className="dot" /><span className="dash" /><span className="dot" /></div>
          <CountrySelect value={dest} onChange={updateDest} />
        </div>

        {Number.isFinite(lastScore) && (
          <span className={`score-pill ${bandClass}`} title={`Score ${lastScore} (${band})`}>
            <span className="pulse-dot" />
            <span className="score-num">{lastScore}</span>
            <span className="score-band">({band})</span>
          </span>
        )}

        <button
          className={`util-pill ${utilClass}`}
          onClick={() => nav("/utilization")}
          title={utilPct == null ? "Utilization —" : `Utilization ${utilPct}%`}
        >
          <svg className="donut" width="22" height="22" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r={donutR} fill="none" stroke="#e5e7eb" strokeWidth="3.2" />
            <circle
              cx="12" cy="12" r={donutR} fill="none"
              stroke={utilColor} strokeWidth="3.2" strokeLinecap="round"
              strokeDasharray={`${donutDash} ${donutC - donutDash}`}
              transform="rotate(-90 12 12)"
            />
          </svg>
          <span className="util-text">{utilPct == null ? "Util —" : `Util ${utilPct}%`}</span>
        </button>
      </div>

      <div className="tb-right">
        <div className="tb-icon-wrap" ref={notifRef}>
          <button className="tb-icon" onClick={() => setNotifOpen((o) => !o)}>
            <Bell size={18} />
            <span className="tb-badge">2</span>
          </button>
          {notifOpen && (
            <div className="tb-panel">
              <div className="tb-panel-head"><strong>Notifications</strong></div>
              <div className="tb-panel-body">
                <div className="tb-item">Score updated</div>
                <div className="tb-item">New account linked</div>
              </div>
            </div>
          )}
        </div>

        <div className="tb-avatar-wrap" ref={menuRef}>
          <button className="avatar" onClick={() => setMenuOpen((o) => !o)}>
            {initials}
          </button>
          {menuOpen && (
            <div className="tb-panel tb-menu">
              <button className="tb-item"><User2 size={14} /> Profile</button>
              <button className="tb-item"><Settings size={14} /> Settings</button>
              <div className="tb-sep" />
              <button className="tb-item danger" onClick={handleLogout}><LogOut size={14} /> Log out</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .topbar {
          position: sticky; top: 0; z-index: 40;
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; padding: 12px 16px;
          background: rgba(255,255,255,.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #d1d5db;
        }
        .tb-left, .tb-center, .tb-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .brand { display: flex; align-items: center; gap: 6px; font-weight: 800; color: #6366f1; font-size: 15px; }
        .welcome { font-size: 13px; color: #4b5563; }
        .country-group { display: flex; align-items: center; gap: 6px; }
        .route-anim { display: flex; align-items: center; gap: 6px; position: relative; }
        .dot { width: 4px; height: 4px; border-radius: 50%; background: #6b7280; }
        .dash { width: 40px; height: 1px; background: repeating-linear-gradient(90deg,#6b7280 0 6px,transparent 6px 10px); }
        .score-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px; border-radius: 999px; font-weight: 800;
          background: linear-gradient(145deg,#f9fafb,#f3f4f6);
          color: #374151; border: 1px solid #d1d5db;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        .score-pill.good { color: #15803d; border-color: #bbf7d0; background: #dcfce7; }
        .score-pill.ok { color: #4d7c0f; border-color: #bef264; background: #ecfccb; }
        .score-pill.bad { color: #b91c1c; border-color: #fecaca; background: #fee2e2; }
        .score-num { font-size: 15px; }
        .score-band { font-size: 13px; opacity: .9; }
        .pulse-dot { width: 8px; height: 8px; border-radius: 999px; background: currentColor; }

        .util-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px; border-radius: 12px; font-weight: 700;
          background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
          cursor: pointer; transition: transform .12s ease, box-shadow .12s ease;
        }
        .util-pill:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,.08); }
        .tb-icon { position: relative; border: 1px solid #d1d5db; background: #f3f4f6; padding: 6px 10px; border-radius: 10px; color: #374151; cursor: pointer; }
        .tb-badge { position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border-radius: 999px; font-size: 10px; width: 16px; height: 16px; display: grid; place-items: center; }

        .avatar { width: 34px; height: 34px; border-radius: 50%; background: #6366f1; color: white; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 1px solid #4f46e5; }

        .tb-panel {
          position: absolute; right: 0; top: calc(100% + 8px);
          background: white; color: #374151;
          border: 1px solid #e5e7eb; border-radius: 10px;
          box-shadow: 0 10px 20px rgba(0,0,0,.1);
          min-width: 200px; overflow: hidden;
          animation: fadeIn .15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .tb-item { padding: 10px 12px; border: none; background: transparent; width: 100%; text-align: left; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; }
        .tb-item:hover { background: #f3f4f6; }
        .tb-item.danger { color: #b91c1c; }
        .tb-sep { height: 1px; background: #e5e7eb; margin: 4px 0; }
      `}</style>
    </header>
  );
}
