import { getAccessToken } from "../auth/auth";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8087";

async function fetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  if ((import.meta.env.VITE_AUTH_MODE || "cognito") === "local") {
    return window.fetch(input, init);
  }
  const token = await getAccessToken();
  if (!token) throw new Error("Your session has expired. Please sign in again.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return window.fetch(input, { ...init, headers });
}

async function responseJson<T>(response: Response, label: string): Promise<T> {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body?.message || body?.error_message || response.statusText || "Unknown error";
    throw new Error(`${label} failed (${response.status}): ${message}`);
  }

  return body as T;
}

export type PlaidLinkTokenResponse = {
  linkToken: string;
  expiration: string;
};

export type PlaidConnectionResult = {
  borrowerId: string;
  passportId?: string | null;
  itemId: string;
  identityAndAccounts: {
    accounts?: Array<{
      account_id?: string;
      name?: string;
      mask?: string;
      type?: string;
      subtype?: string;
      balances?: {
        current?: number | null;
        available?: number | null;
        iso_currency_code?: string | null;
      };
    }>;
    item?: {
      institution_name?: string;
    };
  };
  addedTransactions?: unknown[];
  modifiedTransactions?: unknown[];
  removedTransactions?: unknown[];
  nextCursor?: string;
  transactionPages: number;
  status: string;
  createdAt: string;
};

export type PlaidMonthlyCashflow = {
  month: string;
  completeMonth: boolean;
  transactionCount: number;
  detectedIncome: number;
  interestIncome: number;
  refundsOtherCredits: number;
  totalOutflows: number;
  debtPayments: number;
  sustainableNetCashflow: number;
  observedNetCashflow: number;
};

export type PlaidFinancialSummary = {
  borrowerId: string;
  institutionConnections: number;
  depositoryAccounts: number;
  analyzedTransactions: number;
  coverageStart?: string | null;
  coverageEnd?: string | null;
  calendarMonthsObserved: number;
  completeMonthsAnalyzed: number;
  partialMonthsExcluded: number;
  averageMonthlyDetectedIncome: number;
  averageMonthlyInterestIncome: number;
  averageMonthlyRefundsOtherCredits: number;
  averageMonthlyOutflows: number;
  averageMonthlyDebtPayments: number;
  averageMonthlySustainableNetCashflow: number;
  averageMonthlyObservedNetCashflow: number;
  incomeStabilityPercent?: number | null;
  monthlyCashflow: PlaidMonthlyCashflow[];
};

export async function createPlaidLinkToken() {
  const response = await fetch(`${API_BASE}/v1/plaid/link-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  return responseJson<PlaidLinkTokenResponse>(response, "Create Plaid Link token");
}

export async function connectPlaidItem(
  publicToken: string,
  passportId?: string
) {
  const response = await fetch(`${API_BASE}/v1/plaid/connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passportId: passportId || null, publicToken }),
  });

  return responseJson<PlaidConnectionResult>(response, "Connect Plaid account");
}

export async function getLatestPlaidConnection() {
  const response = await fetch(`${API_BASE}/v1/plaid/connections/latest`);
  return responseJson<PlaidConnectionResult>(response, "Load Plaid connection");
}

export async function getPlaidConnections() {
  const response = await fetch(`${API_BASE}/v1/plaid/connections`);
  return responseJson<PlaidConnectionResult[]>(response, "Load Plaid connections");
}

export async function refreshPlaidTransactions(itemId: string) {
  const response = await fetch(
    `${API_BASE}/v1/plaid/connections/${encodeURIComponent(itemId)}/refresh`,
    { method: "POST" }
  );
  return responseJson<PlaidConnectionResult>(response, "Refresh Plaid transactions");
}

export async function removePlaidConnection(itemId: string) {
  const response = await fetch(
    `${API_BASE}/v1/plaid/connections/${encodeURIComponent(itemId)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      `Remove Plaid connection failed (${response.status}): ${body?.message || response.statusText}`
    );
  }
}

export async function getPlaidFinancialSummary() {
  const response = await fetch(`${API_BASE}/v1/plaid/financial-summary`);
  return responseJson<PlaidFinancialSummary>(response, "Load Plaid financial summary");
}
