import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type {
  PlaidLinkError,
  PlaidLinkOnExitMetadata,
  PlaidLinkOnSuccessMetadata,
} from "react-plaid-link";
import {
  attachPlaidConnection,
  connectPlaidItem,
  createPlaidLinkToken,
  getPlaidConnections,
  getPlaidFinancialSummary,
  detachPlaidConnection,
  refreshPlaidTransactions,
} from "../api/plaid";
import type { PlaidConnectionResult, PlaidFinancialSummary } from "../api/plaid";

type PlaidConnectProps = {
  readOnly?: boolean;
  connected: boolean;
  passportId?: string;
  ensurePassportId?: () => Promise<string>;
  onConnected: () => void;
  onAllRemoved?: () => void;
};

const compactButtonStyle = {
  width: "auto",
  padding: "6px 9px",
  margin: 0,
  fontSize: 12,
};

function institutionName(connection: PlaidConnectionResult) {
  return connection.identityAndAccounts?.item?.institution_name || "Plaid institution";
}

function signature(connection: PlaidConnectionResult) {
  const masks = (connection.identityAndAccounts?.accounts || [])
    .map((account) => account.mask || "")
    .sort()
    .join(",");
  return `${institutionName(connection)}|${masks}`;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function date(value?: string | null) {
  if (!value) return "Not available";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export default function PlaidConnect({
  readOnly = false,
  connected,
  passportId,
  ensurePassportId,
  onConnected,
  onAllRemoved,
}: PlaidConnectProps) {
  const [connections, setConnections] = useState<PlaidConnectionResult[]>([]);
  const [availableConnections, setAvailableConnections] = useState<PlaidConnectionResult[]>([]);
  const [summary, setSummary] = useState<PlaidFinancialSummary | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [launchWhenReady, setLaunchWhenReady] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPlaid, setOpeningPlaid] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshedBanks, setRefreshedBanks] = useState<Record<string, string>>({});

  const totalAccounts = connections.reduce(
    (total, item) => total + (item.identityAndAccounts?.accounts?.length || 0),
    0
  );
  const totalTransactions = connections.reduce(
    (total, item) => total + (item.addedTransactions?.length || 0),
    0
  );

  const duplicateSignatures = useMemo(() => {
    const counts = new Map<string, number>();
    connections.forEach((item) => counts.set(signature(item), (counts.get(signature(item)) || 0) + 1));
    return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
  }, [connections]);

  const loadConnections = useCallback(async (resolvedPassportId = passportId) => {
    setLoading(true);
    try {
      const [results, passportConnections] = await Promise.all([
        getPlaidConnections(),
        resolvedPassportId ? getPlaidConnections(resolvedPassportId) : Promise.resolve([]),
      ]);
      const attachedIds = new Set(passportConnections.map((item) => item.itemId));
      setConnections(passportConnections);
      setAvailableConnections(results.filter((item) => !attachedIds.has(item.itemId)));
      if (passportConnections.length > 0 && !connected) onConnected();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load Plaid connections.");
    } finally {
      setLoading(false);
    }
  }, [connected, onConnected, passportId]);

  useEffect(() => {
    void loadConnections(passportId);
    // Reload when a new passport version receives its passport ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passportId]);

  const onSuccess = useCallback(
    async (publicToken: string | null, _metadata: PlaidLinkOnSuccessMetadata) => {
      setOpeningPlaid(false);
      setMessage("Saving the new bank connection...");
      try {
        if (!publicToken) throw new Error("Plaid did not return a public token.");
        const resolvedPassportId = passportId || await ensurePassportId?.();
        const result = await connectPlaidItem(publicToken, resolvedPassportId);
        onConnected();
        await loadConnections(resolvedPassportId);
        setSummary(null);
        setMessage(
          result.connectionOutcome === "ALREADY_ATTACHED"
            ? `${institutionName(result)} is already connected to this passport.`
            : result.connectionOutcome === "EXISTING_CONNECTION_ATTACHED"
              ? `Existing ${institutionName(result)} connection added to this passport.`
              : `${institutionName(result)} connected successfully.`
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to retrieve Plaid data.");
      }
    },
    [ensurePassportId, loadConnections, onConnected, passportId]
  );

  const onExit = useCallback(
    (error: PlaidLinkError | null, _metadata: PlaidLinkOnExitMetadata) => {
      setLaunchWhenReady(false);
      setOpeningPlaid(false);
      setMessage(
        error
          ? error.display_message || error.error_message || "Plaid Link closed with an error."
          : "Bank connection was cancelled."
      );
    },
    []
  );

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess, onExit });

  useEffect(() => {
    if (launchWhenReady && ready && linkToken) {
      setLaunchWhenReady(false);
      open();
    }
  }, [launchWhenReady, linkToken, open, ready]);

  async function startPlaid() {
    setOpeningPlaid(true);
    setMessage("Preparing secure bank connection...");
    try {
      const result = await createPlaidLinkToken();
      setLinkToken(result.linkToken);
      setLaunchWhenReady(true);
    } catch (error) {
      setOpeningPlaid(false);
      setMessage(error instanceof Error ? error.message : "Unable to start Plaid Link.");
    }
  }

  async function refreshConnection(connection: PlaidConnectionResult) {
    setBusyItemId(connection.itemId);
    try {
      const result = await refreshPlaidTransactions(connection.itemId);
      setConnections((current) => current.map((item) => item.itemId === result.itemId ? result : item));
      setSummary(null);
      setRefreshedBanks((current) => ({
        ...current,
        [connection.itemId]: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      }));
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to refresh transactions.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function useExistingConnection(connection: PlaidConnectionResult) {
    setBusyItemId(connection.itemId);
    setMessage(`Attaching ${institutionName(connection)}...`);
    try {
      const resolvedPassportId = passportId || await ensurePassportId?.();
      if (!resolvedPassportId) throw new Error("A passport is required before selecting a bank.");
      const result = await attachPlaidConnection(connection.itemId, resolvedPassportId);
      await loadConnections(resolvedPassportId);
      setSummary(null);
      onConnected();
      setMessage(
        result.connectionOutcome === "ALREADY_ATTACHED"
          ? `${institutionName(connection)} is already connected to this passport.`
          : `${institutionName(connection)} added to this passport.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to use this bank.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function toggleInsights() {
    const next = !showInsights;
    setShowInsights(next);
    if (!next || summary) return;
    try {
      setSummary(await getPlaidFinancialSummary(passportId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load cash-flow insights.");
    }
  }

  async function removeConnection(connection: PlaidConnectionResult) {
    if (!passportId) return;
    if (!window.confirm(`Stop using ${institutionName(connection)} for this passport?`)) return;
    setBusyItemId(connection.itemId);
    try {
      await detachPlaidConnection(connection.itemId, passportId);
      const remaining = connections.filter((item) => item.itemId !== connection.itemId);
      setConnections(remaining);
      setSummary(null);
      if (remaining.length === 0) onAllRemoved?.();
      setAvailableConnections((current) => [connection, ...current]);
      setMessage(`${institutionName(connection)} was removed from this passport.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove bank connection.");
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <div className={"tile " + (connections.length ? "selected" : "")} style={{ cursor: "default" }}>
      <div className="icon">🏦</div>
      <div style={{ fontWeight: 700 }}>Bank / Open Banking</div>

      {loading ? (
        <div className="hint" style={{ marginTop: 8 }}>Loading connections...</div>
      ) : connections.length ? (
        <>
          <div style={{ color: "#18794e", fontSize: 13, marginTop: 7 }}>
            ✓ {connections.length} bank connection{connections.length === 1 ? "" : "s"}
          </div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            <b>{totalAccounts}</b> accounts · <b>{totalTransactions}</b> transactions
          </div>

          {showManage && <div style={{ maxHeight: 150, overflowY: "auto", display: "grid", gap: 6, marginTop: 9 }}>
            {connections.map((connection) => {
              const accountCount = connection.identityAndAccounts?.accounts?.length || 0;
              const transactionCount = connection.addedTransactions?.length || 0;
              const busy = busyItemId === connection.itemId;
              return (
                <div key={connection.itemId} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8, textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {institutionName(connection)}
                      </div>
                      <div className="hint" style={{ textAlign: "left", fontSize: 11 }}>
                        {accountCount} accounts · {transactionCount || "Pending"} transactions
                      </div>
                      {refreshedBanks[connection.itemId] && <div style={{ color: "#18794e", fontSize: 11 }}>
                        ✓ Refreshed at {refreshedBanks[connection.itemId]}
                      </div>}
                    </div>
                    {!readOnly && <button className="btn" type="button" style={compactButtonStyle} disabled={busy} onClick={() => refreshConnection(connection)}>
                      {busy ? "..." : "Refresh"}
                    </button>}
                  </div>
                </div>
              );
            })}
          </div>}

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 7, marginTop: 9 }}>
            <button className="btn" type="button" style={compactButtonStyle} onClick={toggleInsights}>
              {showInsights ? "Hide insights" : "Cash-flow insights"}
            </button>
            {!readOnly && <button className="btn" type="button" style={compactButtonStyle} onClick={() => setShowManage(!showManage)}>
              {showManage ? "Hide banks" : "View banks"}
            </button>}
          </div>

          {showInsights && summary && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 9, marginTop: 9, textAlign: "left", fontSize: 12 }}>
              <div style={{ fontWeight: 700 }}>Cash-flow preview</div>
              <div style={{ marginTop: 5 }}>Coverage: {date(summary.coverageStart)} – {date(summary.coverageEnd)}</div>
              <div>Complete months: {summary.completeMonthsAnalyzed}</div>
              <div>Detected income: <b>{money(summary.averageMonthlyDetectedIncome)}/mo</b></div>
              <div>Interest income: {money(summary.averageMonthlyInterestIncome)}/mo</div>
              <div>Outflows: {money(summary.averageMonthlyOutflows)}/mo</div>
              <div>Debt payments: {money(summary.averageMonthlyDebtPayments)}/mo</div>
              <div>Refunds/other credits: {money(summary.averageMonthlyRefundsOtherCredits)}/mo</div>
              <div style={{ color: summary.averageMonthlySustainableNetCashflow >= 0 ? "#18794e" : "#b00020", fontWeight: 700, marginTop: 4 }}>
                Sustainable net: {money(summary.averageMonthlySustainableNetCashflow)}/mo
              </div>
              <div className="hint" style={{ textAlign: "left", fontSize: 11, marginTop: 5 }}>
                Refunds are excluded from sustainable cash flow. Pilot indicator—not a credit decision.
              </div>
            </div>
          )}

          {showManage && !readOnly && (
            <div style={{ display: "grid", gap: 6, marginTop: 9 }}>
              {connections.map((connection) => {
                const masks = (connection.identityAndAccounts?.accounts || [])
                  .map((account) => account.mask && `••••${account.mask}`)
                  .filter(Boolean)
                  .slice(0, 4)
                  .join(", ");
                return (
                  <div key={connection.itemId} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8, textAlign: "left", fontSize: 11 }}>
                    <b>{institutionName(connection)}</b>
                    <div>{masks || "Account masks unavailable"}</div>
                    <div>Connected {new Date(connection.createdAt).toLocaleString()}</div>
                    {duplicateSignatures.has(signature(connection)) && <div style={{ color: "#8a5a00" }}>Possible duplicate connection</div>}
                    <button className="btn" type="button" style={{ ...compactButtonStyle, marginTop: 5 }} disabled={busyItemId === connection.itemId} onClick={() => removeConnection(connection)}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="hint" style={{ marginTop: 8 }}>
          No bank is selected for this passport version.
        </div>
      )}

      {!readOnly && availableConnections.length > 0 && (
        <div style={{ marginTop: 10, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 12 }}>Existing bank connections</div>
          <div style={{ maxHeight: 125, overflowY: "auto", display: "grid", gap: 6, marginTop: 6 }}>
            {availableConnections.map((connection) => (
              <div key={connection.itemId} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 7 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{institutionName(connection)}</div>
                <button
                  className="btn"
                  type="button"
                  style={{ ...compactButtonStyle, marginTop: 5 }}
                  disabled={busyItemId === connection.itemId}
                  onClick={() => useExistingConnection(connection)}
                >
                  {busyItemId === connection.itemId ? "Attaching..." : "Use for this passport"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!readOnly && <button className="btn" type="button" onClick={startPlaid} disabled={openingPlaid || !!busyItemId} style={{ marginTop: 10 }}>
        {openingPlaid ? "Opening Plaid..." : "Connect another bank"}
      </button>}
      {message && <div style={{ fontSize: 11, marginTop: 7 }}>{message}</div>}
    </div>
  );
}
