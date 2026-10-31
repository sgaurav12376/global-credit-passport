import { getAccessToken } from "../auth/auth";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8087";

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
        simulated?: boolean;
        normalizedReport: Record<string, unknown>;
      };
    };
    coverage: {
      sourceCount: number;
      openBankingAvailable: boolean;
      openBankingSandbox?: boolean;
      creditBureauAvailable: boolean;
      creditBureauSimulated?: boolean;
    };
    evidenceEnvironment?: {
      creditSimulated: boolean;
      creditProviderTest?: boolean;
      openBankingSandbox: boolean;
      identitySandbox: boolean;
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
      summaryRanges?: Record<string, {
        minimum: number;
        maximum: number;
        reportingBureaus: number;
        disagreement: boolean;
      }>;
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
      dimensionExplanations?: Array<{
        dimensionKey: string;
        standardizedMetric: string;
        observedValue: string | null;
        unit: string;
        sourceDomain: string | null;
        sourceProvider: string | null;
        sourceSystem: string | null;
        sourceCountry: string | null;
        evidenceId: string | null;
        evidenceStatus: "SYNTHETIC" | "NORMALIZED_PROVIDER_EVIDENCE" | "MISSING";
        scoringRule: string;
        score: number | null;
        configuredWeight: number;
        weightedContribution: number | null;
      }>;
      assessmentEvidence?: {
        provider: string;
        sourceSystem: string;
        countryCode: string;
        completenessPercent: number;
        retrievedAt: string | null;
        selectionMethod: string;
        explanation: string;
      } | null;
      crossBorderContext?: {
        evidenceCountries: string[];
        nativeScoreScalesPreserved: boolean;
        currencyTreatment: string;
        destinationPolicyTreatment: string;
        comparabilityNotes: string[];
      };
      nativeScoreReferences?: Array<{
        countryCode: string;
        provider: string;
        bureau: string;
        nativeValue: number | null;
        nativeMinimum: number | null;
        nativeMaximum: number | null;
        rangePositionPercent: number | null;
        referenceBand: string;
        model: string | null;
      }>;
      keyDrivers?: Array<{
        dimensionKey: string;
        label: string;
        category: "STRENGTH" | "WATCH" | "NEUTRAL";
        score: number | null;
        reasonCodes: string[];
      }>;
      reviewGuidance?: {
        reviewPriority: "STANDARD_REVIEW" | "ENHANCED_REVIEW" | "DATA_REQUIRED";
        assessmentBasis: "CREDIT_AND_CASHFLOW" | "CREDIT_ONLY" | "CASHFLOW_ONLY" | "LIMITED_EVIDENCE";
        dataGaps: string[];
        recommendedActions: string[];
        lenderDecisionRequired: boolean;
      };
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
  review: BorrowerReview;
  reviewHistory: Array<{
    eventType: string;
    fromStatus: ReviewStatus;
    toStatus: ReviewStatus;
    borrowerMessage: string | null;
    borrowerResponse: string | null;
    createdAt: string;
  }>;
};

export type ReviewStatus =
  | "NOT_OPENED"
  | "VIEWED"
  | "UNDER_REVIEW"
  | "INFORMATION_REQUESTED"
  | "COMPLETED";

export type ReviewOutcome = "PROCEED" | "FURTHER_REVIEW" | "DECLINE";

export type BorrowerReview = {
  status: ReviewStatus;
  outcome: ReviewOutcome | null;
  borrowerMessage: string | null;
  borrowerResponse: string | null;
  borrowerRespondedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
};

export type LenderReview = BorrowerReview & {
  internalNote: string | null;
};

export type ReviewDocumentRequest = {
  requestId: string;
  documentType: string;
  description: string | null;
  required: boolean;
  dueDate: string | null;
  status: "REQUESTED" | "UPLOADED" | "ACCEPTED" | "REPLACEMENT_REQUESTED";
  createdAt: string;
  updatedAt: string;
  filename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
};

export type SharedPassport = {
  recipientName: string;
  purpose: string;
  scope: string;
  consentedAt: string;
  expiresAt: string;
  publishedAt: string;
  review: LenderReview;
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
    evidenceEnvironment?: {
      creditSimulated: boolean;
      creditProviderTest?: boolean;
      openBankingSandbox: boolean;
      identitySandbox: boolean;
    };
    evidenceCoverage: NonNullable<PassportOutput["document"]["evidenceCoverage"]>;
    creditReconciliation: NonNullable<PassportOutput["document"]["creditReconciliation"]>;
    riskAssessment: NonNullable<PassportOutput["document"]["riskAssessment"]>;
  };
};

export type LenderInvitation = {
  invitationId: string;
  lenderName: string;
  borrowerName: string;
  purpose: string;
  status: "PENDING" | "AUTHORIZED" | "REVOKED" | "EXPIRED" | "UNAVAILABLE";
  expiresAt: string;
  authorizedAt: string | null;
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

export async function replacePassportShareLink(
  passportId: string, shareId: string, expiresInDays: number
) {
  const res = await fetch(
    `${API_BASE}/v1/passports/${passportId}/shares/${shareId}/replace-link`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresInDays }),
    }
  );
  await ensureOk(res, "Replace lender access link");
  return (await res.json()) as {
    shareId: string;
    token: string;
    recipientName: string;
    purpose: string;
    expiresAt: string;
  };
}

export async function respondToPassportShare(
  passportId: string, shareId: string, response: string
) {
  const res = await fetch(
    `${API_BASE}/v1/passports/${passportId}/shares/${shareId}/response`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    }
  );
  await ensureOk(res, "Send response to lender");
  return (await res.json()) as BorrowerReview;
}

export async function getSharedPassport(token: string) {
  const res = await window.fetch(`${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}`);
  if (res.status === 410) {
    throw new Error("Access has expired or was revoked by the borrower.");
  }
  if (res.status === 404) {
    throw new Error("This secure link is invalid or no longer exists.");
  }
  if (!res.ok) {
    throw new Error("This shared passport is temporarily unavailable.");
  }
  return (await res.json()) as SharedPassport;
}

export async function getSharedPassportReview(token: string) {
  const res = await window.fetch(
    `${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}/review`
  );
  await ensureOk(res, "Load lender review");
  return (await res.json()) as LenderReview;
}

async function consumeReviewEvents(response: Response, onUpdate: (eventType?: string) => void) {
  if (response.status === 404 || response.status === 410) {
    throw new TerminalReviewStreamError();
  }
  if (!response.ok || !response.body) throw new Error("Unable to connect to review updates.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true }).replaceAll("\r\n", "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const lines = block.split("\n");
      if (lines.some((line) => line === "event:REVIEW_UPDATED")) {
        const data = lines
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        let eventType: string | undefined;
        if (data) {
          try {
            const event = JSON.parse(data) as { eventType?: string };
            eventType = event.eventType;
          } catch {
            // Treat malformed event data as a generic update and refresh safely.
          }
        }
        onUpdate(eventType);
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}

class TerminalReviewStreamError extends Error {}

async function maintainReviewStream(
  connect: () => Promise<Response>, controller: AbortController,
  onUpdate: (eventType?: string) => void
) {
  while (!controller.signal.aborted) {
    try {
      await consumeReviewEvents(await connect(), onUpdate);
    } catch (caught) {
      if (controller.signal.aborted || (caught instanceof DOMException && caught.name === "AbortError")) return;
      if (caught instanceof TerminalReviewStreamError) return;
    }
    if (!controller.signal.aborted) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
  }
}

export function subscribeBorrowerReviewEvents(
  passportId: string, onUpdate: (eventType?: string) => void
) {
  const controller = new AbortController();
  void maintainReviewStream(
    () => fetch(`${API_BASE}/v1/passports/${passportId}/shares/events`, {
      headers: { Accept: "text/event-stream" },
      signal: controller.signal,
    }),
    controller,
    onUpdate
  );
  return () => controller.abort();
}

export function subscribeLenderReviewEvents(
  token: string, onUpdate: (eventType?: string) => void
) {
  const controller = new AbortController();
  void maintainReviewStream(
    () => window.fetch(
      `${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}/events`,
      { headers: { Accept: "text/event-stream" }, signal: controller.signal }
    ),
    controller,
    onUpdate
  );
  return () => controller.abort();
}

export async function getBorrowerDocumentRequests(passportId: string, shareId: string) {
  const res = await fetch(
    `${API_BASE}/v1/passports/${passportId}/shares/${shareId}/document-requests`
  );
  await ensureOk(res, "Load document requests");
  return (await res.json()) as ReviewDocumentRequest[];
}

export async function uploadBorrowerReviewDocument(
  passportId: string, shareId: string, requestId: string, file: File
) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(
    `${API_BASE}/v1/passports/${passportId}/shares/${shareId}/document-requests/${requestId}/upload`,
    { method: "POST", body }
  );
  await ensureOk(res, "Upload requested document");
  return (await res.json()) as ReviewDocumentRequest;
}

export async function getLenderDocumentRequests(token: string) {
  const res = await window.fetch(
    `${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}/document-requests`
  );
  await ensureOk(res, "Load requested documents");
  return (await res.json()) as ReviewDocumentRequest[];
}

export async function createLenderDocumentRequest(token: string, payload: {
  documentType: string;
  description?: string | null;
  required: boolean;
  dueDate?: string | null;
}) {
  const res = await window.fetch(
    `${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}/document-requests`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  );
  await ensureOk(res, "Create document request");
  return (await res.json()) as ReviewDocumentRequest;
}

export async function updateLenderDocumentStatus(
  token: string, requestId: string, status: "ACCEPTED" | "REPLACEMENT_REQUESTED"
) {
  const res = await window.fetch(
    `${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}/document-requests/${requestId}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }
  );
  await ensureOk(res, "Update document status");
  return (await res.json()) as ReviewDocumentRequest;
}

export function lenderDocumentDownloadUrl(token: string, requestId: string) {
  return `${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}/document-requests/${requestId}/download`;
}

export async function updateSharedPassportReview(token: string, payload: {
  status: Exclude<ReviewStatus, "NOT_OPENED" | "VIEWED">;
  outcome?: ReviewOutcome | null;
  borrowerMessage?: string | null;
  internalNote?: string | null;
}) {
  const res = await window.fetch(
    `${API_BASE}/v1/shared-passports/${encodeURIComponent(token)}/review`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  await ensureOk(res, "Update lender review");
  return (await res.json()) as LenderReview;
}

export async function createLenderInvitation(payload: {
  lenderName: string;
  borrowerName: string;
  purpose: string;
  expiresInDays: number;
}) {
  const res = await window.fetch(`${API_BASE}/v1/lender-invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Unable to create the lender request.");
  return (await res.json()) as {
    invitationId: string;
    token: string;
    lenderName: string;
    borrowerName: string;
    purpose: string;
    expiresAt: string;
  };
}

export async function getLenderInvitation(token: string) {
  const res = await window.fetch(
    `${API_BASE}/v1/lender-invitations/${encodeURIComponent(token)}`
  );
  if (res.status === 404) throw new Error("This lender invitation is invalid.");
  if (!res.ok) throw new Error("This lender invitation is unavailable.");
  return (await res.json()) as LenderInvitation;
}

export async function authorizeLenderInvitation(
  token: string,
  payload: { passportId: string; consentConfirmed: boolean }
) {
  const res = await fetch(
    `${API_BASE}/v1/lender-invitations/${encodeURIComponent(token)}/authorize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  await ensureOk(res, "Authorize lender request");
  return (await res.json()) as {
    invitationId: string;
    shareId: string;
    expiresAt: string;
    status: "AUTHORIZED";
  };
}
