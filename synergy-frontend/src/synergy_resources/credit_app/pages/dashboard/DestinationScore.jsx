// src/synergy_resources/credit_app/pages/dashboard/DestinationScore.jsx
import React, { useEffect, useMemo, useState } from "react";

/* =========================================================
   SELF-CONTAINED MOCK API
   apiGet("/api/data/country-scores") returns full list below
========================================================= */
const MOCK_API = {
  "/api/data/country-scores": [
    {
      code:"IN", flag:"🇮🇳", name:"India", localScore:820, normalized:840, reliability:"A",
      consent:{state:"granted", expiresAt:"2026-01-31"}, weight:0.12, freshnessDays:22,
      bureau:{
        provider:"CIBIL", nativeScale:"300–900",
        accounts:[
          { type:"Credit Card", org:"HDFC", limit:200000, utilizationPct:25, status:"Active" },
          { type:"Personal Loan", org:"ICICI", principal:500000, emi:10000, status:"Active" }
        ],
        inquiries6m:2, paymentHistory24m:"On-time", remarks:[]
      },
      openBanking:{ banks:["HDFC","SBI"], incomeMonthly:120000, avgBalance:250000, savingsRatePct:12, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-02-10"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Bureau Credit", weightPct:60, contribution:504, source:"CIBIL" },
        { label:"Open Banking", weightPct:30, contribution:252, source:"HDFC/SBI" },
        { label:"Compliance", weightPct:10, contribution:84, source:"Synergy CCI" }
      ], notes:"Strong repayment and stable income; multi-source coverage boosts reliability to A." },
      provenance:[ {label:"CIBIL Bureau API", ref:"23acff...ae12"}, {label:"RBI AA (Setu)", ref:"aa-87b1...f0"}, {label:"Compliance Core", ref:"cmp-11de...77"} ]
    },
    {
      code:"AE", flag:"🇦🇪", name:"UAE", localScore:780, normalized:810, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-06-15"}, weight:0.10, freshnessDays:10,
      bureau:{ provider:"AECB", nativeScale:"300–900", accounts:[], inquiries6m:1, paymentHistory24m:"On-time", remarks:[] },
      openBanking:{ banks:["Emirates NBD"], incomeMonthly:18000, avgBalance:22000, savingsRatePct:10, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-08-01"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Bureau", weightPct:50, contribution:405, source:"AECB" },
        { label:"Open Banking", weightPct:40, contribution:324, source:"ENBD" },
        { label:"Compliance", weightPct:10, contribution:81, source:"Synergy CCI" }
      ], notes:"OB strength offsets thinner bureau depth; reliability B due to single-bank feed." },
      provenance:[ {label:"AECB API", ref:"aecb-9c1...99"}, {label:"ENBD OB", ref:"ob-enbd-55...aa"} ]
    },
    {
      code:"SG", flag:"🇸🇬", name:"Singapore", localScore:760, normalized:790, reliability:"B",
      consent:{state:"pending", expiresAt:null}, weight:0.07, freshnessDays:45,
      bureau:{ provider:"CRIF", nativeScale:"0–1000", accounts:[], inquiries6m:0, paymentHistory24m:"N/A", remarks:["Consent pending"] },
      openBanking:{ banks:["DBS"], incomeMonthly:6200, avgBalance:9000, savingsRatePct:8, expenseVolatility:"Medium", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-03-22"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:70, contribution:553, source:"DBS" },
        { label:"Compliance", weightPct:30, contribution:237, source:"Synergy CCI" }
      ], notes:"Pending bureau consent reduces confidence; OB drives most of the score." },
      provenance:[ {label:"DBS OB", ref:"dbs-12...aa"} ]
    },
    {
      code:"US", flag:"🇺🇸", name:"USA", localScore:700, normalized:760, reliability:"C",
      consent:{state:"revoked", expiresAt:null}, weight:0.05, freshnessDays:300,
      bureau:{ provider:"Experian", nativeScale:"300–850", accounts:[], inquiries6m:0, paymentHistory24m:"Stale", remarks:["Consent revoked"] },
      openBanking:{ banks:[], incomeMonthly:0, avgBalance:0, savingsRatePct:0, expenseVolatility:"N/A", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2025-12-31"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[ { label:"Bureau (stale)", weightPct:100, contribution:760, source:"Experian" } ],
      notes:"Revoked consent and stale data cap weight and confidence." },
      provenance:[ {label:"Experian API", ref:"exp-77...bb"} ]
    },
    {
      code:"GB", flag:"🇬🇧", name:"United Kingdom", localScore:790, normalized:820, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-04-01"}, weight:0.07, freshnessDays:60,
      bureau:{ provider:"Experian UK", nativeScale:"0–999", accounts:[], inquiries6m:1, paymentHistory24m:"On-time", remarks:[] },
      openBanking:{ banks:["Barclays"], incomeMonthly:3400, avgBalance:5000, savingsRatePct:9, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-04-10"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Bureau", weightPct:55, contribution:451, source:"Experian" },
        { label:"Open Banking", weightPct:35, contribution:287, source:"Barclays" },
        { label:"Compliance", weightPct:10, contribution:82, source:"CCI" }
      ], notes:"Stable file; moderate volume." },
      provenance:[ {label:"Experian UK", ref:"uk-exp-99...aa"} ]
    },
    {
      code:"DE", flag:"🇩🇪", name:"Germany", localScore:0, normalized:780, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-07-15"}, weight:0.04, freshnessDays:200,
      bureau:{ provider:"Schufa", nativeScale:"0–100", accounts:[], inquiries6m:0, paymentHistory24m:"Thin", remarks:[] },
      openBanking:{ banks:["Deutsche Bank"], incomeMonthly:2800, avgBalance:4000, savingsRatePct:7, expenseVolatility:"Medium", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-07-20"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:80, contribution:624, source:"DB" },
        { label:"Compliance", weightPct:20, contribution:156, source:"CCI" }
      ], notes:"OB-driven; bureau thin." },
      provenance:[ {label:"Schufa", ref:"de-schufa-33..."} ]
    },
    {
      code:"FR", flag:"🇫🇷", name:"France", localScore:765, normalized:795, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-02-01"}, weight:0.04, freshnessDays:150,
      bureau:{ provider:"Banque de France", nativeScale:"0–1000", accounts:[], inquiries6m:0, paymentHistory24m:"On-time", remarks:[] },
      openBanking:{ banks:["BNP Paribas"], incomeMonthly:3000, avgBalance:4500, savingsRatePct:8, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-02-15"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Bureau", weightPct:60, contribution:477, source:"BdeF" },
        { label:"Open Banking", weightPct:30, contribution:238, source:"BNP" },
        { label:"Compliance", weightPct:10, contribution:80, source:"CCI" }
      ], notes:"Balanced sources." },
      provenance:[ {label:"BdeF", ref:"fr-bdf-..."} ]
    },
    {
      code:"CA", flag:"🇨🇦", name:"Canada", localScore:0, normalized:760, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-05-05"}, weight:0.03, freshnessDays:300,
      bureau:{ provider:"Equifax CA", nativeScale:"300–900", accounts:[], inquiries6m:0, paymentHistory24m:"Stale", remarks:[] },
      openBanking:{ banks:["RBC"], incomeMonthly:3500, avgBalance:3800, savingsRatePct:6, expenseVolatility:"Medium", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-05-20"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:70, contribution:532, source:"RBC" },
        { label:"Compliance", weightPct:30, contribution:228, source:"CCI" }
      ], notes:"OB-led; bureau stale." },
      provenance:[ {label:"Equifax CA", ref:"ca-eqx-..."} ]
    },
    {
      code:"AU", flag:"🇦🇺", name:"Australia", localScore:0, normalized:748, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-08-30"}, weight:0.03, freshnessDays:400,
      bureau:{ provider:"Equifax AU", nativeScale:"0–1200", accounts:[], inquiries6m:0, paymentHistory24m:"N/A", remarks:[] },
      openBanking:{ banks:["CBA"], incomeMonthly:4200, avgBalance:5000, savingsRatePct:9, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-09-10"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:80, contribution:598, source:"CBA" },
        { label:"Compliance", weightPct:20, contribution:150, source:"CCI" }
      ], notes:"OB-focused." },
      provenance:[ {label:"Equifax AU", ref:"au-eqx-..."} ]
    },
    {
      code:"JP", flag:"🇯🇵", name:"Japan", localScore:0, normalized:780, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-01-15"}, weight:0.03, freshnessDays:220,
      bureau:{ provider:"JICC", nativeScale:"0–1000", accounts:[], inquiries6m:0, paymentHistory24m:"Good", remarks:[] },
      openBanking:{ banks:["Mizuho"], incomeMonthly:450000, avgBalance:700000, savingsRatePct:12, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-01-25"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:70, contribution:546, source:"Mizuho" },
        { label:"Compliance", weightPct:30, contribution:234, source:"CCI" }
      ], notes:"Stable inflows." },
      provenance:[ {label:"JICC", ref:"jp-jicc-..."} ]
    },
    {
      code:"BR", flag:"🇧🇷", name:"Brazil", localScore:0, normalized:740, reliability:"C",
      consent:{state:"pending", expiresAt:null}, weight:0.02, freshnessDays:500,
      bureau:{ provider:"Serasa", nativeScale:"0–1000", accounts:[], inquiries6m:0, paymentHistory24m:"N/A", remarks:["Consent pending"] },
      openBanking:{ banks:["Itaú"], incomeMonthly:6000, avgBalance:8000, savingsRatePct:5, expenseVolatility:"High", overdrafts12m:1 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-06-01"}, pep:false, amlRisk:"Medium" },
      explainability:{ components:[ { label:"Open Banking", weightPct:100, contribution:740, source:"Itaú" } ],
      notes:"Volatility and pending consent lower reliability." },
      provenance:[ {label:"Serasa", ref:"br-ser-..."} ]
    },
    {
      code:"NL", flag:"🇳🇱", name:"Netherlands", localScore:0, normalized:772, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-05-11"}, weight:0.02, freshnessDays:200,
      bureau:{ provider:"BKR", nativeScale:"-", accounts:[], inquiries6m:0, paymentHistory24m:"Good", remarks:[] },
      openBanking:{ banks:["ING"], incomeMonthly:3600, avgBalance:6000, savingsRatePct:11, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-05-20"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:80, contribution:618, source:"ING" },
        { label:"Compliance", weightPct:20, contribution:154, source:"CCI" }
      ], notes:"Healthy balances." },
      provenance:[ {label:"BKR", ref:"nl-bkr-..."} ]
    },
    {
      code:"ES", flag:"🇪🇸", name:"Spain", localScore:0, normalized:765, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-03-03"}, weight:0.02, freshnessDays:260,
      bureau:{ provider:"ASNEF", nativeScale:"-", accounts:[], inquiries6m:0, paymentHistory24m:"Good", remarks:[] },
      openBanking:{ banks:["Santander"], incomeMonthly:2700, avgBalance:3500, savingsRatePct:7, expenseVolatility:"Medium", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-03-20"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:80, contribution:612, source:"Santander" },
        { label:"Compliance", weightPct:20, contribution:153, source:"CCI" }
      ], notes:"OB-led file." },
      provenance:[ {label:"ASNEF", ref:"es-asn-..."} ]
    },
    {
      code:"IT", flag:"🇮🇹", name:"Italy", localScore:0, normalized:758, reliability:"B",
      consent:{state:"pending", expiresAt:null}, weight:0.02, freshnessDays:320,
      bureau:{ provider:"CRIF IT", nativeScale:"-", accounts:[], inquiries6m:0, paymentHistory24m:"N/A", remarks:["Consent pending"] },
      openBanking:{ banks:["Intesa"], incomeMonthly:2800, avgBalance:4200, savingsRatePct:8, expenseVolatility:"Medium", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-04-14"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[ { label:"Open Banking", weightPct:100, contribution:758, source:"Intesa" } ],
      notes:"Waiting for bureau consent." },
      provenance:[ {label:"CRIF IT", ref:"it-crif-..."} ]
    },
    {
      code:"MX", flag:"🇲🇽", name:"Mexico", localScore:0, normalized:735, reliability:"C",
      consent:{state:"granted", expiresAt:"2026-09-19"}, weight:0.02, freshnessDays:450,
      bureau:{ provider:"Buró de Crédito", nativeScale:"-", accounts:[], inquiries6m:0, paymentHistory24m:"Thin", remarks:[] },
      openBanking:{ banks:["BBVA"], incomeMonthly:22000, avgBalance:18000, savingsRatePct:5, expenseVolatility:"High", overdrafts12m:1 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-09-30"}, pep:false, amlRisk:"Medium" },
      explainability:{ components:[ { label:"Open Banking", weightPct:100, contribution:735, source:"BBVA" } ],
      notes:"Higher volatility lowers reliability." },
      provenance:[ {label:"Buro MX", ref:"mx-buro-..."} ]
    },
    {
      code:"ZA", flag:"🇿🇦", name:"South Africa", localScore:0, normalized:742, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-11-11"}, weight:0.02, freshnessDays:180,
      bureau:{ provider:"TransUnion ZA", nativeScale:"0–999", accounts:[], inquiries6m:0, paymentHistory24m:"Good", remarks:[] },
      openBanking:{ banks:["FNB"], incomeMonthly:38000, avgBalance:42000, savingsRatePct:10, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-11-25"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:70, contribution:519, source:"FNB" },
        { label:"Compliance", weightPct:30, contribution:223, source:"CCI" }
      ], notes:"Healthy file." },
      provenance:[ {label:"TU ZA", ref:"za-tu-..."} ]
    },
    {
      code:"SE", flag:"🇸🇪", name:"Sweden", localScore:0, normalized:775, reliability:"A",
      consent:{state:"granted", expiresAt:"2026-12-12"}, weight:0.02, freshnessDays:90,
      bureau:{ provider:"UC AB", nativeScale:"-", accounts:[], inquiries6m:0, paymentHistory24m:"Good", remarks:[] },
      openBanking:{ banks:["Swedbank"], incomeMonthly:35000, avgBalance:60000, savingsRatePct:15, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-12-20"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:70, contribution:542, source:"Swedbank" },
        { label:"Compliance", weightPct:30, contribution:233, source:"CCI" }
      ], notes:"High balances and stability." },
      provenance:[ {label:"UC AB", ref:"se-uc-..."} ]
    },
    {
      code:"CH", flag:"🇨🇭", name:"Switzerland", localScore:0, normalized:790, reliability:"A",
      consent:{state:"granted", expiresAt:"2027-02-14"}, weight:0.02, freshnessDays:60,
      bureau:{ provider:"ZEK", nativeScale:"-", accounts:[], inquiries6m:0, paymentHistory24m:"Good", remarks:[] },
      openBanking:{ banks:["UBS"], incomeMonthly:9000, avgBalance:30000, savingsRatePct:18, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2027-02-28"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Open Banking", weightPct:70, contribution:553, source:"UBS" },
        { label:"Compliance", weightPct:30, contribution:237, source:"CCI" }
      ], notes:"Strong liquidity profile." },
      provenance:[ {label:"ZEK", ref:"ch-zek-..."} ]
    },
    {
      code:"AE2", flag:"🇦🇪", name:"UAE (Alt Account)", localScore:770, normalized:805, reliability:"B",
      consent:{state:"granted", expiresAt:"2026-06-15"}, weight:0.02, freshnessDays:15,
      bureau:{ provider:"AECB", nativeScale:"300–900", accounts:[], inquiries6m:1, paymentHistory24m:"On-time", remarks:[] },
      openBanking:{ banks:["Mashreq"], incomeMonthly:9000, avgBalance:14000, savingsRatePct:9, expenseVolatility:"Low", overdrafts12m:0 },
      compliance:{ kyc:{status:"Verified", validUntil:"2026-08-01"}, pep:false, amlRisk:"Low" },
      explainability:{ components:[
        { label:"Bureau", weightPct:50, contribution:402, source:"AECB" },
        { label:"Open Banking", weightPct:40, contribution:322, source:"Mashreq" },
        { label:"Compliance", weightPct:10, contribution:81, source:"CCI" }
      ], notes:"Secondary UAE profile." },
      provenance:[ {label:"AECB", ref:"aecb-2-..."} ]
    }
  ],
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function apiGet(path) {
  await delay(120);
  if (!(path in MOCK_API)) throw new Error(`Not mocked: ${path}`);
  return JSON.parse(JSON.stringify(MOCK_API[path]));
}

/* =========================
   Helpers + small components
========================= */
const pct = (n, d = 0) => `${(Number(n) * 100).toFixed(d)}%`;
const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));
const badgeTone = (state) =>
  state === "granted"
    ? { bg: "#ecfdf5", fg: "#065f46", br: "#a7f3d0" }
    : state === "pending"
    ? { bg: "#fffbeb", fg: "#7a5b00", br: "#fde68a" }
    : { bg: "#fef2f2", fg: "#7f1d1d", br: "#fecaca" };

function Pill({ children, tone }) {
  const style = tone
    ? { background: tone.bg, color: tone.fg, borderColor: tone.br }
    : { background: "#eef2f7", color: "#374151", borderColor: "#e5e7eb" };
  return (
    <span
      style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2px 8px",
        fontSize: 12,
        borderRadius: 999,
        border: "1px solid",
        fontWeight: 700,
        minWidth: 32,
      }}
    >
      {children}
    </span>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        padding: 4,
        background: "#f9fafb",
        display: "inline-flex",
        gap: 4,
        marginTop: 8,
        marginBottom: 6,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid",
            borderColor: active === t ? "#c7d2fe" : "transparent",
            background: active === t ? "#eef2ff" : "transparent",
            color: active === t ? "#4338ca" : "#374151",
            fontWeight: active === t ? 800 : 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all .18s ease",
            boxShadow:
              active === t ? "0 2px 8px rgba(79,70,229,.22)" : "none",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function DetailCard({ title, subtitle, children, style }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        boxShadow: "0 12px 30px rgba(15,23,42,.08)",
        padding: 16,
        animation: "fadeUp .22s ease",
        ...style,
      }}
    >
      {(title || subtitle) && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>{subtitle}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/* ============ Inline expandable details row ============ */
function CountryInlineDetails({ c }) {
  const [tab, setTab] = useState("Score & Utilization");
  const tabs = [
    "Score & Utilization",
    "Overview",
    "Credit Bureau",
    "Open Banking",
    "Compliance",
    "Explainability",
    "Provenance",
  ];

  const utilFraction = clamp01((c.normalized || 0) / 1000);
  const utilAngle = utilFraction * 360;
  const normalizedContribution = (c.normalized || 0) * (c.weight || 0);

  return (
    <div
      style={{
        background: "#f3f4ff",
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        padding: 14,
      }}
    >
      {/* Header summary for the expanded country */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          <span style={{ fontSize: 20 }}>{c.flag || "🧭"}</span>
          {c.name}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Weight {pct(c.weight || 0)} • Reliability {c.reliability || "—"} •
          Freshness {c.freshnessDays ?? "—"}d
        </div>
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      <div style={{ marginTop: 8 }}>
        {/* SCORE & UTILIZATION */}
        {tab === "Score & Utilization" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,2fr) minmax(0,1.5fr)",
              gap: 14,
            }}
          >
            {/* Left: donut + explanation */}
            <DetailCard
              title="Score Utilization & Impact"
              subtitle="How this country profile converts raw signals into a 1000-point score in the Global Credit Passport"
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                {/* Donut */}
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: `conic-gradient(#4f46e5 0deg, #4f46e5 ${utilAngle}deg, #e5e7eb ${utilAngle}deg 360deg)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    boxShadow: "0 8px 20px rgba(79,70,229,.35)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      width: 78,
                      height: 78,
                      borderRadius: "50%",
                      background: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: "#111827",
                        lineHeight: 1.1,
                      }}
                    >
                      {c.normalized ?? "—"}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: 0.06,
                        color: "#6b7280",
                      }}
                    >
                      out of 1000
                    </div>
                  </div>
                </div>

                {/* Text & key figures */}
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "#4b5563",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Score utilization</strong> shows what fraction of
                    the max 1000 score this country profile achieves based on
                    all available data sources. Higher values indicate deeper,
                    fresher multi-source coverage and stronger repayment /
                    liquidity patterns for this Global Credit Passport entry.
                  </p>

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 4,
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>
                        Local score (native)
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        {c.localScore ?? "—"}{" "}
                        <span style={{ color: "#9ca3af", fontSize: 11 }}>
                          ({c?.bureau?.nativeScale || "—"})
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>
                        Normalized score
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        {c.normalized ?? "—"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>
                        Contribution to global score
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        {Math.round(normalizedContribution) || "—"}{" "}
                        <span style={{ color: "#9ca3af", fontSize: 11 }}>
                          (normalized × weight)
                        </span>
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>
                        Reliability grade
                      </span>
                      <span style={{ fontWeight: 800 }}>{c.reliability}</span>
                    </div>
                  </div>
                </div>
              </div>
            </DetailCard>

            {/* Right: Data Source Utilization */}
            <DetailCard
              title="Data Source Utilization"
              subtitle="How each signal family drives this country’s score"
            >
              <div style={{ display: "grid", gap: 8 }}>
                {(c?.explainability?.components || []).map((comp, i) => {
                  const frac = clamp01((comp.contribution || 0) / 1000);
                  return (
                    <div key={i}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 2,
                        }}
                      >
                        <span>
                          <strong>{comp.label}</strong>{" "}
                          <span style={{ color: "#6b7280" }}>
                            · {comp.source}
                          </span>
                        </span>
                        <span style={{ color: "#6b7280" }}>
                          {comp.weightPct}% weight · {comp.contribution}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 999,
                          background: "#e5e7eb",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${frac * 100}%`,
                            height: "100%",
                            background:
                              "linear-gradient(90deg,#4f46e5,#7c3aed)",
                            transition: "width .25s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: "#6b7280",
                  lineHeight: 1.4,
                }}
              >
                This view shows how much each signal family (bureau, open
                banking, compliance, etc.) actually drives the score for this
                country profile inside the Global Credit Passport.
              </p>
            </DetailCard>
          </div>
        )}

        {/* OVERVIEW */}
        {tab === "Overview" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,minmax(0,1fr))",
              gap: 12,
            }}
          >
            <DetailCard title="Local Score (native)">
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {c.localScore ?? "—"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Scale: {c?.bureau?.nativeScale || "—"}
              </div>
            </DetailCard>

            <DetailCard title="Normalized (0–1000)">
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {c.normalized ?? "—"}
              </div>
              <div
                style={{
                  height: 8,
                  background: "#e5e7eb",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    height: 8,
                    width: `${clamp01((c.normalized || 0) / 1000) * 100}%`,
                    background: "linear-gradient(90deg,#4f46e5,#6366f1)",
                  }}
                />
              </div>
            </DetailCard>

            <DetailCard title="Consent & Freshness">
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Consent</span>
                  <Pill tone={badgeTone(c?.consent?.state || "pending")}>
                    {c?.consent?.state || "—"}
                  </Pill>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Consent expiry</span>
                  <span style={{ fontWeight: 700 }}>
                    {c?.consent?.expiresAt || "—"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Last updated</span>
                  <span style={{ fontWeight: 700 }}>
                    {c?.freshnessDays ?? "—"} days ago
                  </span>
                </div>
              </div>
            </DetailCard>

            <DetailCard title="Global Impact">
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Weight in global</span>
                  <span style={{ fontWeight: 700 }}>
                    {pct(c.weight || 0)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Contribution</span>
                  <span style={{ fontWeight: 700 }}>
                    {Math.round(normalizedContribution) || "—"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Reliability</span>
                  <span style={{ fontWeight: 800 }}>{c.reliability}</span>
                </div>
              </div>
            </DetailCard>
          </div>
        )}

        {/* CREDIT BUREAU */}
        {tab === "Credit Bureau" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1.2fr",
              gap: 14,
            }}
          >
            <DetailCard
              title={`${c?.bureau?.provider || "—"} Bureau`}
              subtitle={`Scale ${c?.bureau?.nativeScale || "—"}`}
            >
              <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>Inquiries (6m)</span>
                  <span style={{ fontWeight: 700 }}>
                    {c?.bureau?.inquiries6m ?? "—"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>
                    Payment history (24m)
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {c?.bureau?.paymentHistory24m ?? "—"}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 2,
                    }}
                  >
                    Remarks
                  </span>
                  <span style={{ fontSize: 13 }}>
                    {c?.bureau?.remarks?.length
                      ? c.bureau.remarks.join(", ")
                      : "None"}
                  </span>
                </div>
              </div>
            </DetailCard>

            <DetailCard title="Accounts footprint">
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 16,
                  display: "grid",
                  gap: 6,
                  maxHeight: 190,
                  overflow: "auto",
                  fontSize: 13,
                }}
              >
                {(c?.bureau?.accounts || []).map((a, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {a.type} · {a.org}
                    </span>
                    <span style={{ color: "#6b7280" }}>{a.status}</span>
                  </li>
                ))}
                {!(c?.bureau?.accounts || []).length && (
                  <li style={{ color: "#6b7280" }}>
                    No bureau accounts listed
                  </li>
                )}
              </ul>
            </DetailCard>
          </div>
        )}

        {/* OPEN BANKING */}
        {tab === "Open Banking" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1.1fr",
              gap: 14,
            }}
          >
            <DetailCard title="Bank coverage">
              <div className="kv">
                <div className="k">Linked banks</div>
                <div className="v">
                  {(c?.openBanking?.banks || []).join(", ") || "—"}
                </div>
              </div>
              <div className="kv">
                <div className="k">Median monthly income</div>
                <div className="v">
                  {c?.openBanking?.incomeMonthly
                    ? c.openBanking.incomeMonthly.toLocaleString()
                    : "—"}
                </div>
              </div>
              <div className="kv">
                <div className="k">Average balance</div>
                <div className="v">
                  {c?.openBanking?.avgBalance
                    ? c.openBanking.avgBalance.toLocaleString()
                    : "—"}
                </div>
              </div>
            </DetailCard>

            <DetailCard title="Liquidity & behaviour">
              <div className="kv">
                <div className="k">Savings rate</div>
                <div className="v">
                  {c?.openBanking
                    ? `${c.openBanking.savingsRatePct}%`
                    : "—"}
                </div>
              </div>
              <div className="kv">
                <div className="k">Expense volatility</div>
                <div className="v">
                  {c?.openBanking?.expenseVolatility || "—"}
                </div>
              </div>
              <div className="kv">
                <div className="k">Overdrafts (12m)</div>
                <div className="v">
                  {c?.openBanking?.overdrafts12m ?? "—"}
                </div>
              </div>
            </DetailCard>
          </div>
        )}

        {/* COMPLIANCE */}
        {tab === "Compliance" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1.1fr",
              gap: 14,
            }}
          >
            <DetailCard title="KYC posture">
              <div className="kv">
                <div className="k">KYC status</div>
                <div className="v">
                  {c?.compliance?.kyc?.status || "—"}
                </div>
              </div>
              <div className="kv">
                <div className="k">KYC valid until</div>
                <div className="v">
                  {c?.compliance?.kyc?.validUntil || "—"}
                </div>
              </div>
              <div className="kv">
                <div className="k">PEP / Sanctions</div>
                <div className="v">
                  {c?.compliance?.pep ? "Hit" : "Clear"}
                </div>
              </div>
            </DetailCard>

            <DetailCard title="AML profile">
              <div className="kv">
                <div className="k">AML risk</div>
                <div className="v">
                  {c?.compliance?.amlRisk || "—"}
                </div>
              </div>
              <div className="kv">
                <div className="k">Evidence pack</div>
                <div className="v">
                  <a
                    href="#"
                    style={{
                      color: "#4f46e5",
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    Download
                  </a>
                </div>
              </div>
            </DetailCard>
          </div>
        )}

        {/* EXPLAINABILITY */}
        {tab === "Explainability" && (
          <DetailCard title="Why this score for this country?">
            <div style={{ display: "grid", gap: 10 }}>
              {(c?.explainability?.components || []).map((x, i) => {
                const frac = clamp01((x.contribution || 0) / 1000);
                return (
                  <div key={i}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 2,
                      }}
                    >
                      <span>
                        <strong>{x.label}</strong>{" "}
                        <span style={{ color: "#6b7280" }}>
                          ({x.source})
                        </span>
                      </span>
                      <span style={{ color: "#6b7280" }}>
                        {x.weightPct}% · {x.contribution}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "#e5e7eb",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${frac * 100}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg,#4f46e5,#7c3aed)",
                          transition: "width .25s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 10,
                lineHeight: 1.4,
              }}
            >
              {c?.explainability?.notes || ""}
            </div>
          </DetailCard>
        )}

        {/* PROVENANCE */}
        {tab === "Provenance" && (
          <DetailCard title="Data & Consent Trail">
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "grid",
                gap: 6,
                fontSize: 13,
              }}
            >
              {(c?.provenance || []).map((p, i) => (
                <li key={i}>
                  {p.label}{" "}
                  <span style={{ color: "#6b7280" }}>({p.ref})</span>
                </li>
              ))}
              {!(c?.provenance || []).length && (
                <li style={{ color: "#6b7280" }}>No provenance entries</li>
              )}
            </ul>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 10,
              }}
            >
              Consent: {c?.consent?.state || "—"}
              {c?.consent?.expiresAt
                ? ` • Expires ${c.consent.expiresAt}`
                : ""}
            </div>
          </DetailCard>
        )}
      </div>
    </div>
  );
}

/* =========================
   MAIN PAGE COMPONENT
========================= */
export default function DestinationScore() {
  const CSS = `
  .wrap{max-width:1100px;margin:0 auto;padding:0 10px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 6px 14px rgba(0,0,0,.06)}
  .head{display:flex;align-items:center;justify-content:space-between;padding:12px}
  .hstats{text-align:right}.big{font-size:36px;font-weight:900;color:#4f46e5}.sub{font-size:12px;color:#6b7280}
  .controls{display:flex;gap:10px;flex-wrap:wrap}
  .inp{border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:8px 10px}
  .inp:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 1px #6366f1}
  .tbl{width:100%;border-collapse:collapse}
  .tbl th,.tbl td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top;font-size:13px}
  .tbl th{font-size:12px;color:#6b7280;font-weight:600}
  .row{cursor:pointer;transition:background .15s ease}
  .row:hover{background:#f9fafb}
  .bar{height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden}
  .bar>span{display:block;height:100%;background:#6366f1}
  .kv{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:4px 0}
  .kv .k{font-size:12px;color:#6b7280}.kv .v{font-size:13px;font-weight:700}
  @keyframes fadeUp{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
  `;

  const [countries, setCountries] = useState([]);
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [expandedCode, setExpandedCode] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiGet("/api/data/country-scores");
        if (alive) setCountries(data);
      } catch (e) {
        console.warn(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        (c.code || "").toLowerCase() === t
    );
  }, [q, countries]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const globalScore = useMemo(() => {
    const sum = countries.reduce(
      (s, c) =>
        s + Number(c.normalized || 0) * Number(c.weight || 0),
      0
    );
    return Math.round(sum || 0);
  }, [countries]);

  return (
    <section className="page">
      <style>{CSS}</style>
      <div className="wrap">
        {/* Header */}
        <div className="card head">
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              Global Credit Passport
            </div>
            <div className="sub">
              Multi-country financial identity overview
            </div>
          </div>
          <div className="hstats">
            <div className="big">{globalScore}</div>
            <div className="sub">
              Global Score /1000 • Confidence 91%
            </div>
          </div>
        </div>

        {/* Controls */}
        <div
          className="card"
          style={{ marginTop: 10, padding: 12 }}
        >
          <div className="controls">
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="sub">Search country</div>
              <input
                className="inp"
                style={{ width: "100%", marginTop: 6 }}
                placeholder="e.g., India, UAE, Singapore"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <div className="sub">Rows</div>
              <select
                className="inp"
                style={{ width: 120, marginTop: 6 }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 15, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className="card"
          style={{ marginTop: 10, padding: 12 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              Per-Country Scores
            </div>
            <div className="sub">
              Click a row to expand details
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr style={{ color: "#374151" }}>
                  <th>Country</th>
                  <th>Local</th>
                  <th>Normalized</th>
                  <th>Weight</th>
                  <th>Reliability</th>
                  <th>Consent</th>
                  <th>Freshness</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((c, i) => {
                  const tone = badgeTone(
                    c?.consent?.state || "pending"
                  );
                  const isOpen = expandedCode === c.code;
                  return (
                    <React.Fragment key={c.code || i}>
                      <tr
                        className="row"
                        onClick={() =>
                          setExpandedCode(
                            isOpen ? null : c.code
                          )
                        }
                        style={{
                          background: isOpen
                            ? "#eef2ff"
                            : undefined,
                        }}
                      >
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span style={{ fontSize: 18 }}>
                              {c.flag || "🧭"}
                            </span>
                            <span
                              style={{ fontWeight: 700 }}
                            >
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td>{c.localScore ?? "—"}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 50,
                                textAlign: "right",
                                fontWeight: 800,
                              }}
                            >
                              {c.normalized ?? "—"}
                            </div>
                            <div
                              className="bar"
                              style={{ width: 140 }}
                            >
                              <span
                                style={{
                                  width: `${
                                    clamp01(
                                      (c.normalized || 0) /
                                        1000
                                    ) * 100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>{pct(c.weight || 0)}</td>
                        <td>
                          <Pill>
                            {c.reliability || "—"}
                          </Pill>
                        </td>
                        <td>
                          <Pill tone={tone}>
                            {c?.consent?.state || "—"}
                          </Pill>
                        </td>
                        <td>
                          {(c.freshnessDays ?? "—") +
                            (c.freshnessDays != null
                              ? "d"
                              : "")}
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              paddingTop: 12,
                              paddingBottom: 16,
                            }}
                          >
                            <CountryInlineDetails c={c} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {!pageData.length && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: 24,
                        color: "#6b7280",
                      }}
                    >
                      No countries match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
            }}
          >
            <div className="sub">
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                className="inp"
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                disabled={page === 1}
              >
                Prev
              </button>
              <div>
                Page {page} / {totalPages}
              </div>
              <button
                className="inp"
                onClick={() =>
                  setPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
