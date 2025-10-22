import React, { useEffect, useRef, useState } from "react";

export default function CreditGauge({
  score = 680,
  width = 260,
  duration = 700,
  zeroAt = "left",
  size = "md",            // NEW: "sm" | "md"
}) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const target = clamp(score, 0, 1000);

  // animation driver
  const [anim, setAnim] = useState(target);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const fromRef = useRef(target);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = 0;
    fromRef.current = anim;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const v = fromRef.current + (target - fromRef.current) * ease(t);
      setAnim(v);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  // geometry
  const W = width;
  const H = Math.round(W * 0.6);
  const cx = W / 2;
  const cy = H * 0.98;
  const r  = Math.min(W, H) * 0.74;

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // angles
  const tickAngle = (v) => (zeroAt === "left" ? Math.PI * (1 - v / 1000) : Math.PI * (v / 1000));
  const ticks = Array.from({ length: 11 }, (_, i) => i * 100);

  // label sizes (SM vs MD)
  const isSm = size === "sm";
  const LABEL_OFFSET = isSm ? 1.06 : 1.09;
  const EDGE_EXTRA   = 0.05;
  const EDGE_NUDGE   = 0.02;
  const labelAt = [0, 250, 500, 750, 1000];
  const labelFont = isSm ? 10 : 12;

  // band color
  const s = clamp(Math.round(anim), 0, 1000);
  const band = s >= 800 ? { label: "Excellent", color: "#3B82F6" }
            : s >= 740 ? { label: "Very Good",  color: "#10B981" }
            : s >= 670 ? { label: "Good",       color: "#84CC16" }
            : s >= 580 ? { label: "Fair",       color: "#F59E0B" }
            :            { label: "Poor",       color: "#EF4444" };

  // needle
  const angle = zeroAt === "left" ? -90 + (anim / 1000) * 180 : 90 - (anim / 1000) * 180;
  const needleLen = r * 0.84;

  // band progress dash
  const safeAnim = anim >= 1000 ? 999.5 : anim;
  const dash = `${safeAnim} ${1000 - safeAnim}`;
  const dashOffset = zeroAt === "left" ? 0 : 1000 - safeAnim;

  return (
    <div className={`gauge ${isSm ? "sm" : ""}`} style={{ width: W }}>
      <svg viewBox={`0 0 ${280} ${143}`} width={280} height={143}>
        <path d={arcPath} fill="none" stroke="#E5E7EB" strokeWidth={isSm ? 10 : 12} />
        <path d={arcPath} fill="none" stroke="#CBD5E1" strokeWidth={isSm ? 2.5 : 3} />
        <path
          d={arcPath}
          fill="none"
          stroke={band.color}
          strokeWidth={isSm ? 8.5 : 10}
          strokeLinecap="butt"
          pathLength="1000"
          strokeDasharray={dash}
          strokeDashoffset={dashOffset}
        />

        {ticks.map((v) => {
          const a = tickAngle(v);
          const inner = r * 0.885, outer = r * 0.985;
          const x1 = cx + inner * Math.cos(a), y1 = cy - inner * Math.sin(a);
          const x2 = cx + outer * Math.cos(a), y2 = cy - outer * Math.sin(a);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9CA3AF" />;
        })}

        {labelAt.map((v) => {
          let a = tickAngle(v);
          const isEdge = v === 0 || v === 1000;
          if (isEdge) a += v === 0 ? EDGE_NUDGE : -EDGE_NUDGE;
          const rr = r * (LABEL_OFFSET + (isEdge ? EDGE_EXTRA : 0));
          const x = cx + rr * Math.cos(a);
          const y = cy - rr * Math.sin(a);
          return <text key={v} x={x} y={y} fontSize={labelFont} textAnchor="middle">{v}</text>;
        })}

        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - needleLen} stroke={band.color} strokeWidth={isSm ? 2.5 : 3} />
          <circle cx={cx} cy={cy} r={isSm ? 6.5 : 8} fill="#111827" stroke="#fff" strokeWidth="2" />
        </g>
      </svg>

      <div className="gauge-footer">
        <div className="gauge-band" style={{ color: band.color }}>{band.label}</div>
        <div className="gauge-score">{s} <span>/ 1000</span></div>
      </div>
    </div>
  );
}
