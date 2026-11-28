import type { ReactNode } from "react";
import { countryCode, countryRecords } from "../lib/countryRecords";
import type { CountryCreditRecord } from "../lib/countryRecords";
import CountryCreditScores from "./CountryCreditScores";
import type { FinancialEvidenceSummary } from "../api/passport";
import "./CrossBorderFinancialProfile.css";
const countryName = (code: string) => { try { return new Intl.DisplayNames(["en"], {type:"region"}).of(code) || code; } catch { return code; } };
const valid = (v?: number) => typeof v === "number" && Number.isFinite(v);
function money(v: number | undefined, currency: string | null) {
  if (!valid(v) || !currency) return "—";
  try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(v!); } catch { return "—"; }
}
const percent = (v?: number) => valid(v) ? `${v!.toLocaleString("en", { maximumFractionDigits: 1 })}%` : "—";
const environments = { SANDBOX: "Sandbox · test only", SYNTHETIC: "Synthetic · test only", PRODUCTION: "Production source · pilot", UNKNOWN: "Environment unconfirmed" };
export default function CrossBorderFinancialProfile({ evidence, origin, destination, credit = [], details, additionalCountries = [] }: { evidence?: FinancialEvidenceSummary[]; origin: string; destination: string; credit?: CountryCreditRecord[]; details?: (country: string) => ReactNode; additionalCountries?: string[] }) {
  const rows = Array.isArray(evidence) ? evidence : [];
  const countries = countryRecords(origin, destination, credit, rows, additionalCountries);
  return <section className="gcp-financial-profile" aria-label="Cross-border financial profile">
    <header><h3>Country records</h3><p>Published credit and banking evidence · {countries.length} {countries.length === 1 ? "country" : "countries"}</p></header>
    <div className="gcp-financial-profile-grid">{countries.map(({code, role, credit: records}) => <article key={code} className="gcp-financial-country">
      <h4>{countryName(code)} <small>{role}</small></h4>
      <CountryCreditScores records={records}/>
      <small className="gcp-bank-heading">Banking and cash flow</small>
      {!rows.some(r => countryCode(r.countryCode) === code) && <p className="gcp-empty">No published financial evidence.</p>}
      {rows.filter(r => countryCode(r.countryCode) === code).map((r,i) => <div className="gcp-financial-source" key={`${r.provider}-${r.sourceSystem}-${i}`}>
        <p className="gcp-source-label">{r.provider} · {environments[r.evidenceEnvironment] || environments.UNKNOWN}</p>
        {!r.currencyCode ? <p className="gcp-financial-caution">Published currency unconfirmed. Metrics withheld.</p> : <>
          <div className="gcp-income"><small>Identified monthly income</small><strong>{money(r.metrics.averageMonthlyIncome,r.currencyCode)}</strong></div>
          <dl><div><dt>Observed debt repayments</dt><dd>{money(r.metrics.averageMonthlyDebtPayments,r.currencyCode)}</dd></div><div><dt>Observed net cash flow</dt><dd>{money(r.metrics.averageMonthlyNetCashflow,r.currencyCode)}</dd></div><div><dt>Income stability</dt><dd>{percent(r.metrics.incomeStabilityPercent)}</dd></div></dl>
        </>}
        <details className="gcp-financial-details"><summary>Evidence details</summary><p>{r.metrics.coverageStart || "Unknown"} – {r.metrics.coverageEnd || "Unknown"} · {r.metrics.completeMonthsAnalyzed ?? "Unknown"} complete months</p>{r.currencyCode && <dl><div><dt>Monthly outflows</dt><dd>{money(r.metrics.averageMonthlyOutflows,r.currencyCode)}</dd></div><div><dt>Observed debt / income</dt><dd>{percent(r.metrics.debtToIncomePercent)}</dd></div><div><dt>Net cash flow / income</dt><dd>{percent(r.metrics.netCashflowToIncomePercent)}</dd></div></dl>}</details>
      </div>)}
      {details?.(code)}
    </article>)}</div>
    <p className="gcp-financial-footnote">Currencies are kept separate. Missing evidence is not scored as zero.</p>
  </section>;
}
