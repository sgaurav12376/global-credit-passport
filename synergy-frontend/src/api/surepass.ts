import { getAccessToken } from "../auth/auth";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8087";

async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
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
    throw new Error(`${label} failed (${response.status}): ${
      body?.message || response.statusText || "Unknown error"
    }`);
  }
  return body as T;
}

export type NormalizedCreditReport = {
  bureau: string;
  providerReference: string;
  creditScore?: number | null;
  scoreMinimum?: number | null;
  scoreMaximum?: number | null;
  scoreFactors?: string[];
  summary?: {
    totalAccounts?: number | null;
    activeAccounts?: number | null;
    closedAccounts?: number | null;
    overdueOrDefaultAccounts?: number | null;
    currentBalance?: number | null;
    recentEnquiries?: number | null;
    maximumDaysPastDue?: number | null;
  } | null;
  tradelines?: unknown[];
  dataQualityWarnings?: string[];
};

export type StoredCreditReport = {
  reportId: string;
  passportId: string;
  bureau: string;
  normalizedReport: NormalizedCreditReport;
  documentAvailable: boolean;
  documentSizeBytes?: number | null;
  inheritedFromReportId?: string | null;
  consentedAt: string;
  createdAt: string;
};

export type SurepassCreditRequest = {
  passportId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  pan: string;
  gender: "male" | "female" | "transgender";
  consent: boolean;
};

export async function fetchSurepassCreditReport(
  bureau: "cibil" | "cibil-pdf" | "crif" | "experian",
  payload: SurepassCreditRequest
) {
  const response = await authenticatedFetch(
    `${API_BASE}/v1/surepass/credit-reports/${bureau}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return responseJson<StoredCreditReport>(response, `Fetch ${bureau.toUpperCase()} report`);
}

export async function downloadSurepassCreditReport(reportId: string) {
  const response = await authenticatedFetch(
    `${API_BASE}/v1/surepass/credit-reports/${encodeURIComponent(reportId)}/document`
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(`Download CIBIL report failed (${response.status}): ${
      body?.message || response.statusText || "Unknown error"
    }`);
  }
  return response.blob();
}

export async function getLatestSurepassCreditReport(passportId: string) {
  const response = await authenticatedFetch(
    `${API_BASE}/v1/surepass/credit-reports/latest?passportId=${encodeURIComponent(passportId)}`
  );
  if (response.status === 404) return null;
  return responseJson<StoredCreditReport>(response, "Load credit report");
}

export async function getSurepassCreditReportHistory(passportId: string) {
  const response = await authenticatedFetch(
    `${API_BASE}/v1/surepass/credit-reports?passportId=${encodeURIComponent(passportId)}`
  );
  return responseJson<StoredCreditReport[]>(response, "Load credit report history");
}
