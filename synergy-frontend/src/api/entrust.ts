import { getAccessToken } from "../auth/auth";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8087";

export type EntrustVerification = {
  verificationId: string;
  workflowRunId: string;
  status: "AWAITING_INPUT" | "PROCESSING" | "APPROVED" | "DECLINED" | "ERROR" | "ABANDONED";
  captureUrl?: string | null;
  providerError?: string | null;
  startedAt: string;
  completedAt?: string | null;
};

async function request(path: string, method = "GET") {
  const headers = new Headers();
  if ((import.meta.env.VITE_AUTH_MODE || "cognito") !== "local") {
    const token = await getAccessToken();
    if (!token) throw new Error("Your session has expired. Please sign in again.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await window.fetch(`${API_BASE}${path}`, { method, headers });
  if (response.status === 204) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Entrust verification failed (${response.status}): ${body || response.statusText}`);
  }
  return (await response.json()) as EntrustVerification;
}

export function startEntrustVerification(passportId: string) {
  return request(`/v1/entrust/passports/${passportId}/verification`, "POST");
}

export function getEntrustVerification(passportId: string) {
  return request(`/v1/entrust/passports/${passportId}/verification`);
}

export function refreshEntrustVerification(passportId: string) {
  return request(`/v1/entrust/passports/${passportId}/verification/refresh`, "POST");
}
