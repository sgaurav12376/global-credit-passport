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
  residenceCountry: string;
  fullName?: string;
  dob?: string; // YYYY-MM-DD
  supersedesPassportId?: string;
};

export type PassportDraftUpdate = {
  purpose: string;
  originCountry: string;
  destCountry: string;
  residenceCountry: string;
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
  residenceCountry: string;
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

export type PassportOutput = {
  outputId: string;
  passportId: string;
  schemaVersion: string;
  createdAt: string;
  document: {
    status: string;
    identityVerification: {
      provider: string;
      status: string;
      sandboxSimulation: boolean;
      approvalRequiredForPilot: boolean;
    };
    verifiedSources: {
      openBanking: null | { provider: string; summary: Record<string, unknown> };
      creditBureau: null | {
        provider: string;
        bureau: string;
        normalizedReport: Record<string, unknown>;
      };
    };
    coverage: {
      sourceCount: number;
      openBankingAvailable: boolean;
      creditBureauAvailable: boolean;
    };
    evidenceCoverage?: {
      schemaVersion: string;
      coveragePercent: number;
      evidenceCount: number;
      providerCount: number;
      domains: Record<string, {
        available: boolean;
        evidenceCount: number;
        bestCompletenessPercent: number;
        weightedContribution: number;
      }>;
      missingDomains: string[];
      sufficientForRiskAssessment: boolean;
    };
    normalizedEvidence?: Array<{
      evidenceId?: string;
      domain: string;
      countryCode: string;
      provider: string;
      sourceSystem: string;
      schemaVersion: string;
      completenessPercent: number;
      dataset: Record<string, unknown>;
    }>;
    creditReconciliation?: {
      schemaVersion: string;
      bureauCount: number;
      nativeScores: Array<{
        countryCode: string;
        provider: string;
        bureau: string;
        value: number | null;
        minimum: number | null;
        maximum: number | null;
        model: string | null;
        completenessPercent: number;
      }>;
      warnings: string[];
    };
    riskAssessment?: {
      schemaVersion: string;
      modelType: string;
      modelVersion: string;
      status: "CALCULATED" | "INSUFFICIENT_EVIDENCE";
      riskIndex: number | null;
      riskBand: string;
      confidence: {
        score: number;
        band: "HIGH" | "MEDIUM" | "LOW";
        coverageComponent: number;
        completenessComponent: number;
        freshnessComponent: number;
        consistencyComponent: number;
        identityAssuranceComponent: number;
        analyticalAvailabilityComponent: number;
      };
      dimensions: Array<{
        key: string;
        label: string;
        available: boolean;
        score: number | null;
        configuredWeight: number;
        band: string;
        reasonCodes: string[];
      }>;
      missingDimensions: string[];
      calculationTrace?: {
        aggregationMethod: "WEIGHTED_MEAN_OF_AVAILABLE_DIMENSIONS";
        availableConfiguredWeight: number;
        totalConfiguredWeight: number;
        inputFingerprintSha256: string;
        evidence: Array<{
          evidenceId: string | null;
          domain: string;
          countryCode: string;
          provider: string;
          sourceSystem: string;
          schemaVersion: string;
          adapterId: string;
          adapterVersion: string;
          completenessPercent: number;
          retrievedAt: string;
        }>;
      };
      disclosures: string[];
      calculatedAt: string;
    };
  };
};

export type PassportShareSummary = {
  shareId: string;
  recipientName: string;
  purpose: string;
  scope: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  consentedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
};

export type SharedPassport = {
  recipientName: string;
  purpose: string;
  scope: string;
  consentedAt: string;
  expiresAt: string;
  publishedAt: string;
  report: {
    schemaVersion: string;
    passportId: string;
    subject: { fullName: string; dateOfBirth: string };
    corridor: { purpose: string; originCountry: string; destinationCountry: string };
    identityVerification: {
      provider: string;
      status: string;
      sandboxSimulation: boolean;
      approvalRequiredForPilot: boolean;
    };
    evidenceCoverage: NonNullable<PassportOutput["document"]["evidenceCoverage"]>;
    creditReconciliation: NonNullable<PassportOutput["document"]["creditReconciliation"]>;
    riskAssessment: NonNullable<PassportOutput["document"]["riskAssessment"]>;
  };
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
  return (await res.json()) as PassportOutput;
}

export async function getPassportOutput(passportId: string) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/output`);
  if (res.status === 404) return null;
  await ensureOk(res, "getPassportOutput");
  return (await res.json()) as PassportOutput;
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

export async function createPassportShare(passportId: string, payload: {
  recipientName: string;
  purpose: string;
  expiresInDays: number;
  consentConfirmed: boolean;
}) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/shares`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await ensureOk(res, "Create passport share");
  return (await res.json()) as {
    shareId: string;
    token: string;
    recipientName: string;
    purpose: string;
    expiresAt: string;
  };
}

export async function getPassportShares(passportId: string) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/shares`);
  await ensureOk(res, "Load passport shares");
  return (await res.json()) as PassportShareSummary[];
}

export async function revokePassportShare(passportId: string, shareId: string) {
  const res = await fetch(`${API_BASE}/v1/passports/${passportId}/shares/${shareId}`, {
    method: "DELETE",
  });
  await ensureOk(res, "Revoke passport share");
  return (await res.json()) as PassportShareSummary;
}

export async function getSharedPassport(token: string) {
  const res = await window.fetch(`${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}`);
  await ensureOk(res, "Open shared passport");
  return (await res.json()) as SharedPassport;
}
