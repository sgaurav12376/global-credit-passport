export default function PageHeader({
  title,
  subtitle,
  // variants you can mix by rendering multiple PageHeader rows
  kpis,            // [{k:"Current", v:"45%"}]
  donut,           // {value:45, label:"Utilization"}
  context,         // {origin:"IN", dest:"US", range:"Last 30 days"}
  actions = [],    // [{label:"Pay Now", onClick, kind:"primary"|"ghost"}]
}) {
  return (
    <div className="page-header" style={{ display: "grid", gap: 8, marginBottom: 8 }}>
      {/* Title row (always shown) */}
      {(title || subtitle) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            {title && <h1 style={{ margin: "10px 0 4px" }}>{title}</h1>}
            {subtitle && <p className="page-sub" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          {actions?.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {actions.map((a, i) => (
                <button key={i} className={`aa-btn ${a.kind === "primary" ? "primary" : ""}`} onClick={a.onClick}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* D) Country Context */}
      {context && (
        <div style={{ color: "#374151" }}>
          Normalized from <strong>{context.origin}</strong> → <strong>{context.dest}</strong>
          {context.range ? <> • {context.range}</> : null}
        </div>
      )}

      {/* C) Donut micro-viz */}
      {donut && (
        <div className="donut-wrap">
          <MiniDonut value={donut.value} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {Math.round(donut.value)}%
              <span style={{ color: "#6b7280", fontWeight: 600, marginLeft: 6 }}>{donut.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* B) KPI pills */}
      {Array.isArray(kpis) && kpis.length > 0 && (
        <div className="mix-header">
          {kpis.map((it, i) => (
            <div key={i} className="mix-stat">
              <div className="k">{it.k}</div>
              <div className="v">{it.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniDonut({ value = 0, size = 40, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const filled = (pct / 100) * C;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#6366f1"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${C - filled}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
