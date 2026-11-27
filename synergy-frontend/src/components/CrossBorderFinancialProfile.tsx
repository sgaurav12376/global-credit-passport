import type { ReactNode } from "react";
import type { FinancialEvidenceSummary } from "../api/passport";
import "./CrossBorderFinancialProfile.css";
const countryName = (code: string) => code === "IN" ? "India" : code === "US" ? "United States" : code;
const valid = (v?: number) => typeof v === "number" && Number.isFinite(v);
function money(v: number | undefined, currency: string | null) {
  if (!valid(v) || !currency) return "—";
  try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(v!); } catch { return "—"; }
}
const percent = (v?: number) => valid(v) ? `${v!.toLocaleString("en", { maximumFractionDigits: 1 })}%` : "—";
const environments = { SANDBOX: "Sandbox · test only", SYNTHETIC: "Synthetic · test only", PRODUCTION: "Production source · pilot", UNKNOWN: "Environment unconfirmed" };
export default function CrossBorderFinancialProfile({ evidence, origin, destination, credit }: { evidence?: FinancialEvidenceSummary[]; origin: string; destination: string; credit?: Record<string, ReactNode> }) {
  const countries = Array.from(new Set([origin, destination].filter(Boolean)));
  const rows = Array.isArray(evidence) ? evidence : [];
  return <section className="gcp-financial-profile" aria-label="Cross-border financial profile">
    <header><h3>{credit ? "Country records" : "Financial profile"}</h3><p>{credit ? "Credit history and monthly cash flow" : "Published monthly cash flow"}</p></header>
    <div className="gcp-financial-profile-grid">{countries.map(country => <article key={country} className="gcp-financial-country">
      <h4>{countryName(country)} <small>{country === origin ? "Source" : "Destination"}</small></h4>
      {credit?.[country] && <div className="gcp-country-credit">{credit[country]}</div>}
      {!rows.some(r => r.countryCode === country) && <p className="gcp-empty">Banking: no published financial evidence.</p>}
      {rows.filter(r => r.countryCode === country).map((r,i) => <div className="gcp-financial-source" key={`${r.provider}-${r.sourceSystem}-${i}`}>
        <p className="gcp-source-label">{r.provider} · {environments[r.evidenceEnvironment] || environments.UNKNOWN}</p>
        {!r.currencyCode ? <p className="gcp-financial-caution">Published currency unconfirmed. Metrics withheld.</p> : <>
          <div className="gcp-income"><small>Monthly income</small><strong>{money(r.metrics.averageMonthlyIncome,r.currencyCode)}</strong></div>
          <dl><div><dt>Debt payments</dt><dd>{money(r.metrics.averageMonthlyDebtPayments,r.currencyCode)}</dd></div><div><dt>Net cash flow</dt><dd>{money(r.metrics.averageMonthlyNetCashflow,r.currencyCode)}</dd></div><div><dt>Income stability</dt><dd>{percent(r.metrics.incomeStabilityPercent)}</dd></div></dl>
        </>}
        <details className="gcp-financial-details"><summary>Evidence details</summary><p>{r.metrics.coverageStart || "Unknown"} – {r.metrics.coverageEnd || "Unknown"} · {r.metrics.completeMonthsAnalyzed ?? "Unknown"} complete months</p>{r.currencyCode && <dl><div><dt>Monthly outflows</dt><dd>{money(r.metrics.averageMonthlyOutflows,r.currencyCode)}</dd></div><div><dt>Observed debt / income</dt><dd>{percent(r.metrics.debtToIncomePercent)}</dd></div><div><dt>Net cash flow / income</dt><dd>{percent(r.metrics.netCashflowToIncomePercent)}</dd></div></dl>}</details>
      </div>)}
    </article>)}</div>
    <p className="gcp-financial-footnote">Currencies are kept separate. Missing evidence is not scored as zero.</p>
  </section>;
}
