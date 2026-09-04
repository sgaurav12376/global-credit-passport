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

export type PassportInitRequest = {
  purpose: string;        // e.g. "LOAN"
  originCountry: string;  // e.g. "IN"
  destCountry: string;    // e.g. "US"
  fullName?: string;
  dob?: string; // YYYY-MM-DD
  supersedesPassportId?: string;
};

export type PassportDraftUpdate = {
  purpose: string;
  originCountry: string;
  destCountry: string;
  fullName: string;
  dob: string;
  currentSection?: string;
};

export type PassportView = {
  passportId: string;
  status: string;
  purpose: string;
  originCountry: string;
  destCountry: string;
  fullName?: string | null;
  dob?: string | null;
  supersedesPassportId?: string | null;
  identityStatus?: string | null;
  identityCompletedAt?: string | null;
  currentSection?: string | null;
  plaidConnected: boolean;
  creditReportConnected: boolean;
  createdAt: string;
  updatedAt: string;
};

async function ensureOk(res: Response, label: string) {
  if (res.ok) return;
  const txt = await res.text().catch(() => "");
  throw new Error(`${label} failed (${res.status}): ${txt || res.statusText}`);
}

export async function initPassport(payload: PassportInitRequest) {
  const res = await fetch(`${API_BASE}/v1/passports/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await ensureOk(res, "initPassport");
  return (await res.json()) as { passportId: string; status?: string };
}

export async function getOrCreatePassportUpdateDraft(passportId: string) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/update-draft`, {
    method: "POST",
  });
  await ensureOk(res, "getOrCreatePassportUpdateDraft");
  return (await res.json()) as { passportId: string; status?: string };
}

export async function updatePassportDraft(passportId: string, payload: PassportDraftUpdate) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await ensureOk(res, "Save passport changes");
  return (await res.json()) as PassportView;
}

export async function recordEntrustSubmission(passportId: string) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/identity-submission`, {
    method: "POST",
  });
  await ensureOk(res, "Save identity verification");
  return (await res.json()) as { identityStatus: string; completedAt: string };
}

export async function cancelPassportUpdate(passportId: string) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/cancel-update`, {
    method: "POST",
  });
  await ensureOk(res, "Discard passport changes");
}

export async function connectSources(passportId: string, sources: string[]) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sources }),
  });
  await ensureOk(res, "connectSources");
}

export async function generatePassport(passportId: string) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/generate`, {
    method: "POST",
  });
  await ensureOk(res, "generatePassport");
}

export async function getLatestPassport() {
  const res = await fetch(`${API_BASE}/v1/passports/latest`);
  if (res.status === 404) return null;
  await ensureOk(res, "getLatestPassport");
  return (await res.json()) as PassportView;
}

export async function getPassportHistory() {
  const res = await fetch(`${API_BASE}/v1/passports`);
  await ensureOk(res, "getPassportHistory");
  return (await res.json()) as PassportView[];
}
