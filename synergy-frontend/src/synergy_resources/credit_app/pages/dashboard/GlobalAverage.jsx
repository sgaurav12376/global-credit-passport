// src/synergy_resources/credit_app/pages/dashboard/GlobalAverage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* ===== Gauge (same visual design; hard-coded x for the "0" label like others) ===== */
function CreditGauge({ score = 700, width = 320, duration = 700, zeroAt = "left", size = "md" }) {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const target = clamp(score, 0, 1000);
  const [anim, setAnim] = useState(target);
  const rafRef = useRef(null), startRef = useRef(0), fromRef = useRef(target);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = 0; fromRef.current = anim;
    const ease = (t)=> (t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2);
    const step = (ts)=>{ if(!startRef.current) startRef.current = ts;
      const t = Math.min(1,(ts-startRef.current)/duration);
      const v = fromRef.current + (target-fromRef.current)*ease(t);
      setAnim(v); if(t<1) rafRef.current = requestAnimationFrame(step); };
    rafRef.current = requestAnimationFrame(step);
    return ()=> cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  const W=width,H=Math.round(W*0.6),cx=W/2,cy=H*0.98,r=Math.min(W,H)*0.74;
  const arcPath=`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`;
  const tickAngle=(v)=> (zeroAt === "left" ? Math.PI*(1 - v/1000) : Math.PI*(v/1000));
  const ticks=Array.from({length:11},(_,i)=>i*100);
  const isSm=size==="sm", LABEL_OFFSET=isSm?1.06:1.09, EDGE_EXTRA=0.05, EDGE_NUDGE=0.02;
  const labelAt=[0,250,500,750,1000], labelFont=isSm?10:12;

  const s=Math.max(0,Math.min(1000,Math.round(anim)));
  const band = s>=800?{label:"Excellent",color:"#3B82F6"}:s>=740?{label:"Very Good",color:"#10B981"}:s>=670?{label:"Good",color:"#84CC16"}:s>=580?{label:"Fair",color:"#F59E0B"}:{label:"Poor",color:"#EF4444"};
  const angle = (zeroAt === "left" ? -90 + (anim/1000)*180 : 90 - (anim/1000)*180);
  const needleLen=r*0.84;
  const safeAnim=anim>=1000?999.5:anim, dash=`${safeAnim} ${1000-safeAnim}`;
  const dashOffset = (zeroAt === "left" ? 0 : 1000 - safeAnim);

  return (
    <div className={`gauge ${isSm?"sm":""}`} style={{ width: W }}>
      <svg viewBox={`0 0 ${420} ${220}`} width={420} height={220} aria-label={`Score ${s} of 1000`}>
        <path d={arcPath} fill="none" stroke="#E5E7EB" strokeWidth={isSm?10:12}/>
        <path d={arcPath} fill="none" stroke="#CBD5E1" strokeWidth={isSm?2.5:3}/>
        <path d={arcPath} fill="none" stroke={band.color} strokeWidth={isSm?8.5:10} strokeLinecap="butt" pathLength="1000" strokeDasharray={dash} strokeDashoffset={dashOffset}/>
        {ticks.map((v)=>{
          const a=tickAngle(v), inner=r*0.885, outer=r*0.985;
          const x1=cx+inner*Math.cos(a), y1=cy-inner*Math.sin(a);
          const x2=cx+outer*Math.cos(a), y2=cy-outer*Math.sin(a);
          return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9CA3AF"/>;
        })}
        {labelAt.map((v)=>{
          let a=tickAngle(v); const isEdge=v===0||v===1000; if(isEdge) a += v===0?EDGE_NUDGE:-EDGE_NUDGE;
          const rr=r*(LABEL_OFFSET+(isEdge?EDGE_EXTRA:0));
          let x=cx+rr*Math.cos(a), y=cy-rr*Math.sin(a);
          if(v===0) x = 4.9388068397936138; // match Origin/Destination tweak
          return <text key={v} x={x} y={y} fontSize={labelFont} textAnchor="middle">{v}</text>;
        })}
        <g style={{ transform:`rotate(${angle}deg)`, transformOrigin:`${cx}px ${cy}px` }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy-needleLen} stroke={band.color} strokeWidth={isSm?2.5:3}/>
          <circle cx={cx} cy={cy} r={isSm?6.5:8} fill="#111827" stroke="#fff" strokeWidth="2"/>
        </g>
      </svg>
      <div className="gauge-footer">
        <div className="gauge-band" style={{ color: band.color }}>{band.label}</div>
        <div className="gauge-score">{s} <span>/ 1000</span></div>
      </div>
    </div>
  );
}

/* ===== helpers & constants ===== */
const API_SCORES = "/api/data/scores";
const API_EVENTS = "/api/data/events"; // global events (optional)

/* fallback weights if backend doesn’t provide them */
const DEFAULT_WEIGHTS = { payment: 40, utilization: 35, age: 15, inquiries: 10, mix: 0 };

/* sample fallback so UI always works */
const SAMPLE = {
  origin: 680,
  destination: 720,
  events: [
    { ts: "2025-10-06", text: "Synced origin & destination updates" },
    { ts: "2025-09-28", text: "Normalization factors refreshed" },
    { ts: "2025-09-12", text: "Data quality checks passed (weekly)" },
  ],
  weightsGlobal: DEFAULT_WEIGHTS,
};

function toneFor(score){
  if(score>=800)return{color:"#059669",bg:"#ecfdf5",border:"#a7f3d0",shadow:"rgba(16,185,129,.18)"}; 
  if(score>=670)return{color:"#16a34a",bg:"#f0fdf4",border:"#bbf7d0",shadow:"rgba(34,197,94,.16)"}; 
  if(score>=580)return{color:"#d97706",bg:"#fffbeb",border:"#fde68a",shadow:"rgba(245,158,11,.16)"}; 
  return{color:"#dc2626",bg:"#fef2f2",border:"#fecaca",shadow:"rgba(239,68,68,.16)"};
}
const pct = (score)=> Math.max(0, Math.min(100, Math.round((Number(score)||0)/10)));

/* ===== Page ===== */
export default function GlobalAverage(){
  const CSS = `
    .wrap{max-width:1100px;margin:0 auto;padding:0 10px}
    .hero{border:1px solid #e5e7eb;border-radius:16px;background:#fff;padding:12px;box-shadow:0 4px 10px rgba(0,0,0,.06)}
    .row2{display:grid;grid-template-columns:360px 1fr;gap:12px}
    @media(max-width:980px){.row2{grid-template-columns:1fr}}
    .panel{border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:12px}
    .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:6px 9px;font-weight:800}
    .kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    @media(max-width:980px){.kpis{grid-template-columns:repeat(2,1fr)}}
    .kpi{border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;padding:10px}
    .kpi .v{font-weight:900;font-size:18px}
    .kpi .l{font-size:12px;color:#6b7280}
    .tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}
    @media(max-width:980px){.tiles{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:560px){.tiles{grid-template-columns:1fr}}
    .tile{display:flex;align-items:center;gap:10px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;padding:12px;text-decoration:none;color:#111827;box-shadow:0 6px 14px rgba(0,0,0,.06)}
    .tile .ico{width:30px;height:30px;border-radius:10px;background:#eef2f7;border:1px solid #e5e7eb;display:grid;place-items:center;font-size:16px;flex:0 0 auto}
    .tile .title{font-weight:800}
    .tile .desc{font-size:12px;color:#374151}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}
    @media(max-width:980px){.grid2{grid-template-columns:1fr}}
    .fit{display:grid;gap:8px}
    .badge{display:inline-flex;align-items:center;gap:6px;border:1px solid #d1d5db;background:#f0fdf4;color:#065f46;border-radius:999px;padding:6px 10px;font-weight:800}
    .badgelite{display:inline-flex;align-items:center;gap:6px;border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:4px 8px;font-size:12px}
    .barwrap{display:grid;gap:8px}
    .bar{height:12px;border-radius:999px;background:#eef2f7;border:1px solid #e5e7eb;overflow:hidden}
    .bar>span{display:block;height:100%}
    .good{background:#dcfce7}
    .warn{background:#fef9c3}
    .bad{background:#fee2e2}
    .positives{display:flex;flex-wrap:wrap;gap:8px}
    .positive{display:inline-flex;align-items:center;gap:8px;border:1px solid #bbf7d0;background:#ecfdf5;border-radius:999px;padding:8px 10px;color:#065f46;font-weight:800}
    .events{display:grid;gap:8px}
    .event{display:flex;align-items:center;justify-content:space-between;border:1px solid #e5e7eb;border-radius:10px;background:#fff;padding:8px 10px}
    .muted{color:#6b7280;font-size:12px}
  `;

  // raw inputs
  const [origin, setOrigin] = useState(SAMPLE.origin);
  const [dest, setDest] = useState(SAMPLE.destination);

  // global semantics
  const [weights, setWeights] = useState(SAMPLE.weightsGlobal);
  const [events, setEvents] = useState(SAMPLE.events);

  useEffect(()=>{ (async ()=>{
    try{
      const r = await fetch(API_SCORES); if(!r.ok) throw 0;
      const j = await r.json();
      if(typeof j?.origin === "number") setOrigin(j.origin);
      if(typeof j?.destination === "number") setDest(j.destination);

      // if backend provides origin/dest weights, blend them; else use j.weightsGlobal or default
      const wa = j?.weights || DEFAULT_WEIGHTS;
      const wb = j?.destWeights || wa;
      const blended = {
        payment: Math.round(((Number(wa.payment)||0) + (Number(wb.payment)||0))/2),
        utilization: Math.round(((Number(wa.utilization)||0) + (Number(wb.utilization)||0))/2),
        age: Math.round(((Number(wa.age)||0) + (Number(wb.age)||0))/2),
        inquiries: Math.round(((Number(wa.inquiries)||0) + (Number(wb.inquiries)||0))/2),
        mix: Math.round(((Number(wa.mix)||0) + (Number(wb.mix)||0))/2),
      };
      setWeights(j?.weightsGlobal || blended);
    }catch{}
  })(); },[]);

  // optional global events
  useEffect(()=>{ (async ()=>{
    try{
      const r = await fetch(API_EVENTS); if(!r.ok) throw 0;
      const j = await r.json();
      if(Array.isArray(j) && j.length) setEvents(j.slice(0,5));
    }catch{}
  })(); },[]);

  // derived
  const combined = useMemo(()=> Math.round((origin + dest)/2), [origin, dest]);
  const gap = Math.abs(origin - dest);
  const tone = toneFor(combined);
  const weightTotal = Math.max(1, Object.values(weights).reduce((a,b)=>a + (Number(b)||0), 0));

  const positives = useMemo(()=>{
    const list = [];
    if (combined >= 700) list.push(`Strong global posture (${combined})`);
    if (gap <= 40) list.push(`Low origin↔destination gap (${gap})`);
    if (origin >= 670) list.push(`Solid origin (${origin})`);
    if (dest >= 670) list.push(`Solid destination (${dest})`);
    if (!list.length) list.push("Balanced profile—steady improvements across both regions");
    return list.slice(0,5);
  }, [combined, gap, origin, dest]);

  const lenderCriteria = [
    { label: "Global ≥ 680", pass: combined >= 680 },
    { label: "Gap ≤ 50 pts", pass: gap <= 50 },
    { label: "Both ≥ 640", pass: origin >= 640 && dest >= 640 },
    { label: "Percent ≥ 65%", pass: pct(combined) >= 65 },
  ];
  const passCount = lenderCriteria.filter(c=>c.pass).length;
  const fit =
    passCount === 4 ? { tag: "✅ Pre-qualified", tone: "good" } :
    passCount === 3 ? { tag: "⚠️ Borderline", tone: "warn" } :
                      { tag: "❌ Unlikely", tone: "bad" };

  const summary = [
    { k: "Global score", v: `${combined} / 1000` },
    { k: "Percent of max", v: `${pct(combined)}%` },
    { k: "Inputs", v: `Origin ${origin} · Destination ${dest}` },
    { k: "Gap", v: `${gap} pts` },
  ];

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="wrap">

        {/* Hero with dial + snapshot */}
        <div className="hero" style={{ borderColor:tone.border, background:tone.bg }}>
          <h1 style={{ margin: 0 }}>Global (avg)</h1>
          <div className="chips">
            <span className="chip">Global <strong>{combined}</strong></span>
            <span className="chip">Origin <strong>{origin}</strong></span>
            <span className="chip">Destination <strong>{dest}</strong></span>
            <span className="chip">Gap <strong>{gap} pts</strong></span>
          </div>

          <div className="row2" style={{marginTop:10}}>
            {/* LEFT: Dial */}
            <div className="panel" style={{borderColor:"#e5e7eb"}}>
              <CreditGauge score={combined} width={320}/>
            </div>

            {/* RIGHT: Snapshot (no sparkline per your preference) */}
            <div className="panel" style={{borderColor:"#e5e7eb", background:"#f8fffb"}}>
              <div style={{fontWeight:900, marginBottom:8}}>Global Snapshot</div>
              <div className="kpis">
                <div className="kpi"><div className="v">{combined}</div><div className="l">Global score</div></div>
                <div className="kpi"><div className="v">{pct(combined)}%</div><div className="l">Percent of max</div></div>
                <div className="kpi"><div className="v">{origin}</div><div className="l">Origin</div></div>
                <div className="kpi"><div className="v">{dest}</div><div className="l">Destination</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Positives */}
        <div className="panel" style={{marginTop:12}}>
          <div style={{fontWeight:900, marginBottom:8}}>What’s strong globally</div>
          <div className="positives">
            {positives.map((p,i)=> <span className="positive" key={i}>✅ {p}</span>)}
          </div>
        </div>

        {/* Lender fit + Weight bars (global weights) */}
        <div className="grid2">
          <div className="panel fit">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:900}}>Lender Fit (global)</div>
              <span className={`badge ${fit.tone}`}>{fit.tag}</span>
            </div>
            <div style={{display:"grid",gap:6}}>
              {lenderCriteria.map((c,i)=>(
                <div key={i} className="badgelite" style={{borderColor:c.pass?"#a7f3d0":"#fecaca", background:c.pass?"#ecfdf5":"#fef2f2", color:c.pass?"#065f46":"#7f1d1d"}}>
                  {c.pass ? "✔" : "•"} {c.label}
                </div>
              ))}
            </div>
            <div className="muted">Global view balances both regions; individual lenders may weigh one region more.</div>
          </div>

          <div className="panel">
            <div style={{fontWeight:900, marginBottom:6}}>What moves the global score</div>
            <div className="barwrap">
              {[
                {k:"Payment history", key:"payment", color:"#86efac"},
                {k:"Utilization", key:"utilization", color:"#93c5fd"},
                {k:"Credit age", key:"age", color:"#fbcfe8"},
                {k:"Inquiries", key:"inquiries", color:"#fde68a"},
                {k:"Account mix", key:"mix", color:"#ddd6fe"},
              ].map(({k,key,color})=>{
                const w = Math.round(((Number(weights[key])||0)/weightTotal)*100);
                return (
                  <div key={key}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                      <strong>{k}</strong><span className="muted">{w}%</span>
                    </div>
                    <div className="bar"><span style={{ width:`${w}%`, background:color }}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="panel">
          <div style={{fontWeight:900, marginBottom:6}}>Recent global events</div>
          <div className="events">
            {(events && events.length ? events : SAMPLE.events).map((e, i)=>(
              <div className="event" key={i}>
                <div>{e.text}</div>
                <div className="muted">{e.ts}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tiles */}
        <div className="tiles">
          <Link to="/accounts-overview" className="tile">
            <div className="ico">📊</div>
            <div>
              <div className="title">Accounts & Utilization</div>
              <div className="desc">Usage %, balances, limits</div>
            </div>
          </Link>
          <Link to="/credit-history" className="tile">
            <div className="ico">💳</div>
            <div>
              <div className="title">Credit History</div>
              <div className="desc">On-time rate & age</div>
            </div>
          </Link>
          <Link to="/behavior-trends" className="tile">
            <div className="ico">🔎</div>
            <div>
              <div className="title">Behavior & Inquiries</div>
              <div className="desc">Hard pulls & activity</div>
            </div>
          </Link>
          <Link to="/risk-profile" className="tile">
            <div className="ico">⚠️</div>
            <div>
              <div className="title">Risk Profile</div>
              <div className="desc">Adverse marks & flags</div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
