import { NavLink } from "react-router-dom";

const categories = [
  { to: "/score-scale", label: "Score Scale" },
  { to: "/payment-history", label: "Payment History" },
  { to: "/utilization", label: "Utilization" },
  { to: "/credit-length", label: "Credit Length" },
  { to: "/account-mix", label: "Account Mix" },
  { to: "/active-accounts", label: "Active Accounts" },
  { to: "/inquiries", label: "Inquiries" },
  { to: "/adverse-records", label: "Adverse Records" },
  { to: "/recent-behavior", label: "Recent Behavior" },
  { to: "/alt-data", label: "Alt-Data" },
  { to: "/banking", label: "Banking" },
  { to: "/country-normalization", label: "Country Normalization" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">Dashboard</div>
      <div className="group">
        <NavLink to="/score" className="navlink global">
          Global Score <span className="caret">▼</span>
        </NavLink>
        <div className="dropdown">
          {categories.map((i) => (
            <NavLink key={i.to} to={i.to} className="dropitem">
              {i.label}
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}
