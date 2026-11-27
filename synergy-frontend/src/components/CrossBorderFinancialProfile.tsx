import type { FinancialEvidenceSummary } from "../api/passport";
import "./CrossBorderFinancialProfile.css";

const countryName = (code: string) => code === "IN" ? "India" : code === "US" ? "United States" : code;
const number = (value?: number) => typeof value === "number" && Number.isFinite(value) ? value : null;
function money(value: number | undefined, currency: string | null) {
  const amount = number(value);
  if (amount === null || !currency) return "Unavailable";
  try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return "Unavailable"; }
}
function percent(value?: number) {
  const amount = number(value);
  return amount === null ? "Unavailable" : `${amount.toLocaleString("en", { maximumFractionDigits: 2 })}%`;
}
const environments = { SANDBOX: "Provider sandbox · not for lending", SYNTHETIC: "Synthetic · not for lending", PRODUCTION: "Provider production · pilot assessment", UNKNOWN: "Environment not confirmed" };

export default function CrossBorderFinancialProfile({ evidence, origin, destination }: {
  evidence?: FinancialEvidenceSummary[];
  origin: string;
  destination: string;
}) {
  const countries = Array.from(new Set([origin, destination].filter(Boolean)));
  const rows = Array.isArray(evidence) ? evidence : [];
  return <section className="gcp-financial-profile" aria-label="Cross-border financial profile">
    <header><span className="eyebrow">COUNTRY-AWARE CASH FLOW</span><h3>Cross-border financial profile</h3><p>Published financial evidence by country. Amounts are not combined across currencies.</p></header>
    <div className="gcp-financial-profile-grid">
      {countries.map(country => <article key={country} className="gcp-financial-country">
        <h4>{countryName(country)} <small>{country === origin ? "Source country" : "Destination country"}</small></h4>
        {rows.filter(row => row.countryCode === country).length === 0 && <p>No eligible published financial summary for this country. This is not a negative risk factor.</p>}
        {rows.filter(row => row.countryCode === country).map((row, index) => <div className="gcp-financial-source" key={`${row.provider}-${row.sourceSystem}-${index}`}>
          <b>{row.provider}</b><p>{environments[row.evidenceEnvironment] || environments.UNKNOWN}</p>
          <p>{row.metrics.coverageStart || "Unknown start"} – {row.metrics.coverageEnd || "Unknown end"} · {row.metrics.completeMonthsAnalyzed ?? "Unknown"} complete months</p>
          {!row.currencyCode && <p className="gcp-financial-caution">Currency not confirmed. Monetary amounts and ratios are withheld in this summary.</p>}
          <dl>
            <div><dt>Monthly identified income</dt><dd>{money(row.metrics.averageMonthlyIncome, row.currencyCode)}</dd></div>
            <div><dt>Monthly outflows</dt><dd>{money(row.metrics.averageMonthlyOutflows, row.currencyCode)}</dd></div>
            <div><dt>Monthly debt payments</dt><dd>{money(row.metrics.averageMonthlyDebtPayments, row.currencyCode)}</dd></div>
            <div><dt>Sustainable net cash flow</dt><dd>{money(row.metrics.averageMonthlyNetCashflow, row.currencyCode)}</dd></div>
            <div><dt>Observed debt-to-income</dt><dd>{percent(row.metrics.debtToIncomePercent)}</dd></div>
            <div><dt>Net cash flow / income</dt><dd>{percent(row.metrics.netCashflowToIncomePercent)}</dd></div>
            <div><dt>Income stability</dt><dd>{percent(row.metrics.incomeStabilityPercent)}</dd></div>
          </dl>
        </div>)}
      </article>)}
    </div>
    <p className="gcp-financial-footnote">These are observed financial indicators, not a lending decision. Continuing source-country obligations must be assessed separately. Historical reports may not contain the normalized summary.</p>
  </section>;
}
