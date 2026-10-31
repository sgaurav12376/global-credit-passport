import { useEffect, useMemo, useState } from "react";
import { getPlaidConnections, getPlaidFinancialSummary } from "../api/plaid";
import type { PlaidConnectionResult, PlaidFinancialSummary } from "../api/plaid";

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function shortDate(value?: string | null) {
  if (!value) return "Unavailable";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function institutionName(connection: PlaidConnectionResult) {
  return connection.identityAndAccounts?.item?.institution_name || "Financial institution";
}

function accountName(name?: string) {
  return name || "Financial account";
}

function accountType(type?: string, subtype?: string) {
  const labels: Record<string, string> = {
    depository: "Deposit account",
    credit: "Credit account",
    loan: "Loan account",
    investment: "Investment account",
  };
  return [labels[type || ""] || "Financial account", subtype?.replaceAll("_", " ")]
    .filter(Boolean).join(" · ");
}

export default function OpenBankingEvidence({ passportId, defaultOpen = false }: { passportId: string; defaultOpen?: boolean }) {
  const [connections, setConnections] = useState<PlaidConnectionResult[]>([]);
  const [summary, setSummary] = useState<PlaidFinancialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accounts = useMemo(() => connections.flatMap((connection) =>
    (connection.identityAndAccounts?.accounts || []).map((account) => ({
      ...account,
      institution: institutionName(connection),
      connectedAt: connection.createdAt,
    }))
  ), [connections]);
  const institutions = useMemo(() => connections.map((connection) => ({
    name: institutionName(connection),
    accounts: (connection.identityAndAccounts?.accounts || []).map((account) => ({
      ...account,
      connectedAt: connection.createdAt,
    })),
  })), [connections]);

  async function load() {
    if (loaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      const [connectionResults, financialSummary] = await Promise.all([
        getPlaidConnections(passportId),
        getPlaidFinancialSummary(passportId),
      ]);
      setConnections(connectionResults);
      setSummary(financialSummary);
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load open-banking details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setLoaded(false); setConnections([]); setSummary(null); }, [passportId]);
  useEffect(() => { if (defaultOpen) void load(); }, [defaultOpen, passportId]);

  return <details className="open-banking-evidence" open={defaultOpen || undefined} onToggle={(event) => {
    if ((event.currentTarget as HTMLDetailsElement).open) void load();
  }}>
    <summary>{defaultOpen ? "Cash flow and connected accounts" : "View financial-account summary"}</summary>
    <div className="open-banking-content">
      {loading && <p className="audit-muted">Loading financial-account evidence…</p>}
      {error && <div className="alert-error">{error}</div>}
      {summary && <>
        <div className="bank-metric-grid">
          <div><span>Complete months analyzed</span><b>{summary.completeMonthsAnalyzed}</b></div>
          <div><span>Average identified income</span><b>{money(summary.averageMonthlyDetectedIncome)}/month</b></div>
          <div><span>Average monthly outflows</span><b>{money(summary.averageMonthlyOutflows)}/month</b></div>
          <div><span>Average debt payments</span><b>{money(summary.averageMonthlyDebtPayments)}/month</b></div>
          <div><span>Sustainable net cash flow</span><b>{money(summary.averageMonthlySustainableNetCashflow)}/month</b></div>
          <div><span>Income stability</span><b>{summary.incomeStabilityPercent == null ? "Unavailable" : `${summary.incomeStabilityPercent}%`}</b></div>
        </div>
      </>}
      {loaded && summary && <details className="account-analysis-details"><summary>View account coverage and connected institutions</summary><div>
        <div className="bank-evidence-overview">
          <div><b>{summary.institutionConnections}</b><span>Institutions</span></div>
          <div><b>{accounts.length}</b><span>Connected accounts</span></div>
          <div><b>{summary.analyzedTransactions}</b><span>Transactions analyzed</span></div>
          <div><b>{summary.partialMonthsExcluded}</b><span>Partial months excluded</span></div>
        </div>
        <p className="evidence-period">Analysis period: {shortDate(summary.coverageStart)} – {shortDate(summary.coverageEnd)}</p>
        <p className="analysis-scope-note"><b>{summary.depositoryAccounts} deposit accounts</b> contained eligible transaction history for the cash-flow analysis. Other connected credit, loan and investment accounts are listed for context but are not treated as cash-flow accounts.</p>
        <section><h4>Connected financial institutions</h4>
        <div className="institution-list">{institutions.map((institution) => <details key={institution.name}>
          <summary><span><b>{institution.name}</b><small>{institution.accounts.length} connected accounts</small></span><em>View accounts</em></summary>
          <div className="connected-account-list">{institution.accounts.map((account) => {
            const currency = account.balances?.iso_currency_code || "USD";
            const liability = account.type === "loan" || account.type === "credit";
            return <article key={`${institution.name}-${account.account_id}`}>
              <div><b>{accountName(account.name)}</b><small>{accountType(account.type, account.subtype)}</small></div>
              <div><span>{account.mask ? `Account ending ${account.mask}` : "Masked account"}</span></div>
              <div><span>{liability ? "Reported amount owed" : "Reported balance"}</span><b>{money(account.balances?.current || 0, currency)}</b></div>
            </article>;
          })}</div>
        </details>)}</div></section>
      </div></details>}
      {summary && <p className="borrower-audit-note">Sandbox institutions and accounts contain sample data. Amounts are analyzed within the account currency. Raw transactions and full account numbers are not included in the shared lender report.</p>}
    </div>
  </details>;
}
