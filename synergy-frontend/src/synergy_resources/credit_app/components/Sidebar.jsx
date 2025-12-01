// src/synergy_resources/credit_app/components/Sidebar.jsx
import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  BarChart3,
  Clock4,
  SearchCheck,
  FileWarning,
  Landmark,
  Globe2,
  Layers3,
  ChevronDown,
} from "lucide-react";

const MAIN = [
  { to: "/score", label: "Home", icon: Home, desc: "Your global score" },
  { to: "/accounts-overview", label: "Accounts & Utilization", icon: BarChart3, desc: "Accounts, mix & usage" },
  { to: "/credit-history", label: "Credit History", icon: Clock4, desc: "Payments & age timeline" },
  { to: "/behavior-trends", label: "Behavior & Inquiries", icon: SearchCheck, desc: "Recent activity & pulls" },
  { to: "/risk-profile", label: "Adverse & Risk", icon: FileWarning, desc: "Collections + alt-data" },
  { to: "/banking-insights", label: "Banking Insights", icon: Landmark, desc: "Cash-flow & signals" },
];

const MORE = [
  { to: "/global-comparison", label: "Global Comparison", icon: Globe2 },
  // legacy quick links (optional)
  { to: "/accounts-overview", label: "Account Mix / Active / Util", icon: Layers3 },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => new Set(MORE.map((l) => l.to)).has(pathname));
  const isActive = (to) => pathname === to;
  const groupActive = useMemo(() => new Set(MORE.map((l) => l.to)).has(pathname), [pathname]);

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Layers3 size={18} /> Synergy
      </div>

      <nav aria-label="Main">
        {MAIN.map(({ to, label, icon: Icon, desc }) => (
          <NavLink
            key={to}
            to={to}
            className="navlink"
            title={desc}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: isActive(to) ? 800 : 600,
              background: isActive(to) ? "#374151" : undefined,
              color: "#d1d5db",
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="group" style={{ marginTop: 10 }}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%", border: "none", background: "transparent", color: "rgb(55 65 81)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            cursor: "pointer", padding: "8px 6px", borderRadius: 6, fontWeight: 800,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Layers3 size={16} /> More
          </span>
          <ChevronDown
            size={14}
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s", opacity: groupActive ? 1 : 0.8 }}
          />
        </button>

        <div style={{ display: open ? "flex" : "none", flexDirection: "column" }}>
          {MORE.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="dropitem"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                fontWeight: isActive(to) ? 800 : 600,
                background: isActive(to) ? "#1f2937" : "transparent",
              }}
            >
              <Icon size={16} />
              <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)", color: "#9ca3af", fontSize: 13, lineHeight: 1.35 }}>
        <div style={{ fontWeight: 800, color: "#e5e7eb" }}>Welcome 👋</div>
        Explore the 6 main sections above; deeper options live under <strong>More</strong>.
      </div>
    </aside>
  );
}
