const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:8087";

export type PassportInitRequest = {
  purpose: string;        // e.g. "LOAN"
  originCountry: string;  // e.g. "IN"
  destCountry: string;    // e.g. "US"
  fullName?: string;
  dob?: string; // YYYY-MM-DD
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
