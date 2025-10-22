// src/synergy_resources/credit_app/components/Topbar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  // countries (persist + broadcast)
  const [origin, setOrigin] = useState(localStorage.getItem("originCode") || "IN");
  const [dest, setDest]     = useState(localStorage.getItem("destCode")   || "US");
  const broadcast = () => window.dispatchEvent(new Event("countryRouteChanged"));
  const updateOrigin = (code) => { setOrigin(code); localStorage.setItem("originCode", code); broadcast(); };
  const updateDest   = (code) => { setDest(code);   localStorage.setItem("destCode", code);   broadcast(); };

  // utilization (auto-refresh)
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

  // score pill
  const lastScore = Number(localStorage.getItem("lastGlobalScore"));
  const scoreHistory = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("scoreHistory") || "[]"); }
    catch { return []; }
  }, []);
  const band = Number.isFinite(lastScore) ? bandName(lastScore) : null;
  const bandClass =
    !Number.isFinite(lastScore) ? "" :
    lastScore >= 800 ? "good" :
    lastScore >= 670 ? "ok"   : "bad";

  // notifications + menu
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

  // live user + settings
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "Demo Boss");
  const initials = (userName.split(" ").map(p => p[0]).join("").slice(0,2) || "DB").toUpperCase();
  useEffect(() => {
    let cancel = false;
    const loadMe = async () => {
      try {
        const r = await fetch(API_ME);
        if (!r.ok) return;
        const j = await r.json();
        const name = j?.name || j?.user?.name || j?.fullName || j?.username;
        if (!cancel && name) { localStorage.setItem("userName", name); setUserName(name); }
      } catch {}
    };
    loadMe();
    const id = setInterval(loadMe, 45000);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  const [notifs, setNotifs] = useState([
    { id: 1, title: "Score updated", time: "Just now", unread: true },
    { id: 2, title: "New account linked", time: "1h", unread: true },
    { id: 3, title: "Payment posted", time: "Yesterday", unread: false },
  ]);
  const unreadCount = notifs.filter(n => n.unread).length;
  const markAllRead = () => setNotifs((n) => n.map(x => ({ ...x, unread: false })));

  // inline panels: profile & settings
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // profile form state
  const [pName, setPName]      = useState(userName);
  const [pEmail, setPEmail]    = useState("");
  const [pPhone, setPPhone]    = useState("");
  const [pCountry, setPCountry]= useState(origin);
  useEffect(() => { setPName(userName); }, [userName]);

  useEffect(() => {
    if (!profileOpen) return;
    (async () => {
      try {
        const r = await fetch(API_ME);
        if (!r.ok) return;
        const j = await r.json();
        setPName(j?.name || j?.fullName || "");
        setPEmail(j?.email || "");
        setPPhone(j?.phoneNumber || j?.phone || "");
        setPCountry(j?.country || origin);
      } catch {}
    })();
  }, [profileOpen, origin]);

  const saveProfile = async () => {
    try {
      const r = await fetch(API_ME, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pName, email: pEmail, phoneNumber: pPhone, country: pCountry
        }),
      });
      if (r.ok) {
        setUserName(pName);
        localStorage.setItem("userName", pName);
        setProfileOpen(false);
      }
    } catch {}
  };

  // settings form state
  const [sTheme, setSTheme]           = useState(localStorage.getItem("theme") || "system");
  const [sEmailNotif, setSEmailNotif] = useState(true);
  const [sPushNotif, setSPushNotif]   = useState(true);

  useEffect(() => {
    if (!settingsOpen) return;
    (async () => {
      try {
        const r = await fetch(API_SETTINGS);
        if (!r.ok) return;
        const j = await r.json();
        if (j?.theme) setSTheme(j.theme);
        if (typeof j?.emailNotifications === "boolean") setSEmailNotif(j.emailNotifications);
        if (typeof j?.pushNotifications  === "boolean") setSPushNotif(j.pushNotifications);
      } catch {}
    })();
  }, [settingsOpen]);

  const saveSettings = async () => {
    try {
      localStorage.setItem("theme", sTheme);
      await fetch(API_SETTINGS, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: sTheme,
          emailNotifications: sEmailNotif,
          pushNotifications: sPushNotif,
        }),
      });
      setSettingsOpen(false);
    } catch {}
  };

  const handleLogout = async () => {
    try { await fetch(API_LOGOUT, { method: "POST" }); } catch {}
    signout?.();
    nav("/login");
  };

  return (
    <header className="topbar">
      <div className="tb-left tb-inline tb-stretch">
        {/* Countries with animated credit route (no swap) */}
        <div className="country-group" title="Normalization route">
          <CountrySelect value={origin} onChange={updateOrigin} />
          <div className="route-anim" aria-hidden>
            <span className="dot" />
            <svg className="plane score-ic" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M4 14a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="14" r="1.8" fill="currentColor"/>
              <path d="M12 14l4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="dot" />
          </div>
          <CountrySelect value={dest} onChange={updateDest} />
        </div>

        <span className="tb-sep-v" />

        {/* Score pill with green blinking dot */}
        {Number.isFinite(lastScore) && (
          <span className={`score-pill ${bandClass}`} title={`Global score ${lastScore} (${band})`}>
            <span className="pulse-dot" aria-hidden />
            <span className="score-num">{lastScore}</span>
            <span className="score-band">({band})</span>
          </span>
        )}

        <span className="tb-sep-v" />

        {/* Utilization */}
        <button
          className={`util-pill ${utilClass}`}
          onClick={() => nav("/utilization")}
          title={utilPct == null ? "Utilization —" : `Utilization ${utilPct}%`}
        >
          <svg className="donut" width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r={donutR} fill="none" stroke="#e5e7eb" strokeWidth="3.2" />
            <circle
              cx="12" cy="12" r={donutR} fill="none"
              stroke={utilColor} strokeWidth="3.2" strokeLinecap="round"
              strokeDasharray={`${donutDash} ${donutC - donutDash}`}
              transform="rotate(-90 12 12)"
              className="donut-arc"
            />
          </svg>
          <span className="util-text">{utilPct == null ? "Util —" : `Util ${utilPct}%`}</span>
        </button>

        {/* spacer pushes notifications + avatar to the right */}
        <div className="tb-spacer" />

        {/* Notifications */}
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

        {/* Avatar + menu (Edit profile, Settings, Logout) */}
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
              <button className="tb-item" onClick={() => { setProfileOpen(true); setMenuOpen(false); }}>Edit profile</button>
              <button className="tb-item" onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}>Settings</button>
              <div className="tb-sep" />
              <button className="tb-item danger" onClick={handleLogout}>Log out</button>
            </div>
          )}
        </div>
      </div>

      {/* Inline drawers */}
      {profileOpen && (
        <div className="tb-form-panel">
          <div className="tb-form-head">
            <strong>Edit profile</strong>
            <button className="tb-link" onClick={() => setProfileOpen(false)}>Close</button>
          </div>
          <div className="tb-form-body">
            <label className="tb-field">Full name<input className="tb-input" value={pName} onChange={e=>setPName(e.target.value)} /></label>
            <label className="tb-field">Email<input className="tb-input" type="email" value={pEmail} onChange={e=>setPEmail(e.target.value)} /></label>
            <label className="tb-field">Phone<input className="tb-input" value={pPhone} onChange={e=>setPPhone(e.target.value)} /></label>
            <label className="tb-field">Country<CountrySelect value={pCountry} onChange={setPCountry} /></label>
          </div>
          <div className="tb-form-foot">
            <button className="tb-btn" onClick={()=>setProfileOpen(false)}>Cancel</button>
            <button className="tb-btn primary" onClick={saveProfile}>Save</button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="tb-form-panel">
          <div className="tb-form-head">
            <strong>Settings</strong>
            <button className="tb-link" onClick={() => setSettingsOpen(false)}>Close</button>
          </div>
          <div className="tb-form-body">
            <label className="tb-field">Theme
              <select className="tb-input" value={sTheme} onChange={e=>setSTheme(e.target.value)}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="tb-switch">
              <input type="checkbox" checked={sEmailNotif} onChange={e=>setSEmailNotif(e.target.checked)} />
              <span>Email notifications</span>
            </label>
            <label className="tb-switch">
              <input type="checkbox" checked={sPushNotif} onChange={e=>setSPushNotif(e.target.checked)} />
              <span>Push notifications</span>
            </label>
          </div>
          <div className="tb-form-foot">
            <button className="tb-btn" onClick={()=>setSettingsOpen(false)}>Cancel</button>
            <button className="tb-btn primary" onClick={saveSettings}>Save</button>
          </div>
        </div>
      )}

      {/* Scoped CSS just for the Topbar */}
      <style>{`
        .topbar{display:flex;align-items:center;justify-content:flex-start;gap:10px;padding:10px 16px;background:rgba(255,255,255,.85);border-bottom:1px solid #e5e7eb;backdrop-filter:blur(8px);position:sticky;top:0;z-index:20}
        .tb-inline{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .tb-left.tb-stretch{flex:1;min-width:0}
        .tb-spacer{flex:1 1 auto}
        .tb-sep-v{width:1px;height:28px;background:#e5e7eb;margin:0 2px}
        @media(max-width:980px){.tb-sep-v{display:none}}

        /* countries + animated credit route */
        .country-group{display:inline-flex;align-items:center;gap:6px}
        .route-anim{position:relative;display:inline-flex;align-items:center;gap:6px;padding:0 4px}
        .route-anim .dot{width:4px;height:4px;border-radius:999px;background:#9ca3af}
        .route-anim::before{content:"";position:absolute;left:6px;right:6px;top:50%;border-top:1px dashed #cbd5e1;transform:translateY(-50%)}
        .route-anim .plane{position:relative;animation:fly 2.4s ease-in-out infinite}
        @keyframes fly{0%{transform:translateX(-10px)}50%{transform:translateX(10px)}100%{transform:translateX(-10px)}}

        /* score pill */
        .score-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:6px 12px;font-weight:800}
        .score-pill.good{color:#10b981;border-color:#a7f3d0}
        .score-pill.ok{color:#84cc16;border-color:#d9f99d}
        .score-pill.bad{color:#ef4444;border-color:#fecaca}
        .score-num{font-size:16px}
        .score-band{font-size:13px;opacity:.9}
        .pulse-dot{width:8px;height:8px;border-radius:999px;background:#10b981;position:relative}
        .pulse-dot::after{content:"";position:absolute;inset:-4px;border-radius:999px;border:2px solid currentColor;opacity:.4;animation:tpulse 1.6s ease-out infinite}
        @keyframes tpulse{0%{transform:scale(.6);opacity:.6}100%{transform:scale(1.4);opacity:0}}

        /* utilization pill */
        .util-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid #d1d5db;background:#fff;border-radius:12px;padding:6px 12px;font-weight:800;cursor:pointer}
        .util-pill.good{color:#10b981;border-color:#a7f3d0}
        .util-pill.ok{color:#84cc16;border-color:#d9f99d}
        .util-pill.warn{color:#f59e0b;border-color:#fde68a}
        .util-pill.bad{color:#ef4444;border-color:#fecaca}
        .donut-arc{transition:stroke-dasharray .8s cubic-bezier(.2,.8,.2,1),stroke .25s ease}

        /* icon buttons + avatar */
        .tb-btn{border:1px solid #d1d5db;background:#fff;padding:6px 10px;border-radius:8px;cursor:pointer;transition:transform .12s,box-shadow .12s,opacity .12s}
        .tb-btn:hover{transform:translateY(-1px);box-shadow:0 4px 10px rgba(0,0,0,.08)}
        .tb-icon-wrap,.tb-avatar-wrap{position:relative}
        .tb-icon{position:relative;font-size:16px}
        .tb-badge{position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border-radius:999px;font-size:10px;min-width:16px;height:16px;display:grid;place-items:center;padding:0 4px}
        .avatar,.tb-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#6366f1;color:#fff;font-weight:800}

        /* panels (menu/notifications) */
        .tb-panel{position:absolute;right:0;top:calc(100% + 8px);background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 28px rgba(0,0,0,.12);min-width:240px;max-width:min(360px,92vw);z-index:30;overflow:hidden;animation:tb-pop .12s ease}
        @keyframes tb-pop{from{transform:translateY(-4px);opacity:0}to{transform:translateY(0);opacity:1}}
        .tb-menu .tb-user{display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #e5e7eb}
        .tb-user-initials{width:32px;height:32px;background:#6366f1;color:#fff;border-radius:999px;display:grid;place-items:center;font-weight:800}
        .tb-user-name{font-weight:700}
        .tb-item{width:100%;text-align:left;background:transparent;border:none;padding:10px 12px;cursor:pointer;font-size:14px}
        .tb-item:hover{background:#f8fafc}
        .tb-item.danger{color:#ef4444}
        .tb-sep{height:1px;background:#e5e7eb;margin:6px 0}
        .tb-notifs{width:280px}
        .tb-panel-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e5e7eb}
        .tb-link{border:none;background:transparent;color:#2563eb;cursor:pointer}
        .tb-panel-body{max-height:280px;overflow:auto}
        .tb-empty{padding:12px;color:#6b7280;text-align:center}
        .tb-notif{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #f3f4f6}
        .tb-notif:last-child{border-bottom:none}
        .tb-notif.unread{background:#f9fafb}
        .tb-notif-dot{width:8px;height:8px;background:#22c55e;border-radius:999px}
        .tb-notif-main{flex:1;min-width:0}
        .tb-notif-title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tb-notif-time{color:#6b7280;font-size:12px}

        /* inline drawers */
        .tb-form-panel{position:absolute;right:16px;top:56px;z-index:35;width:min(420px,92vw);background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.12);overflow:hidden;animation:tb-pop .14s ease}
        .tb-form-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e5e7eb}
        .tb-form-body{display:grid;gap:10px;padding:10px 12px}
        .tb-field{display:grid;gap:6px;font-size:14px}
        .tb-input{padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff}
        .tb-switch{display:flex;align-items:center;gap:8px;padding:8px 0}
        .tb-form-foot{display:flex;justify-content:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #e5e7eb}
        .tb-btn.primary{background:#2563eb;color:#fff}
      `}</style>
    </header>
  );
}
