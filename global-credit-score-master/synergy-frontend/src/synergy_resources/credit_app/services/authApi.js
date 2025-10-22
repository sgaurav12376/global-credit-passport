// services/authApi.js
const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  (import.meta?.env?.VITE_API_BASE ?? "");

const url = (p) => `${API_BASE}${p}`;

async function parse(res) {
  const raw = await res.text();
  let data = null;

  // If the server sent HTML (common when hitting Amplify instead of API),
  // treat this as "backend not reachable / wrong URL".
  const looksLikeHTML = raw && /^\s*<!doctype html/i.test(raw);

  try {
    data = looksLikeHTML ? null : (raw ? JSON.parse(raw) : null);
  } catch {
    // ignore JSON parse error; will be handled below
  }

  return { ok: res.ok, status: res.status, data, raw, looksLikeHTML };
}

export async function login({ email, password }) {
  const { ok, data, raw, status, looksLikeHTML } = await fetch(url("/api/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(parse);

  if (looksLikeHTML) {
    throw Object.assign(new Error("Backend not reachable. Check VITE_API_BASE or server."), { status });
  }
  if (!ok) {
    throw Object.assign(new Error(data?.message || raw || "Login failed"), { status, data });
  }
  return data ?? {};
}

export async function signup({
  firstName, lastName, email, passportNumber,
  phoneNumber, password, confirmPassword
}) {
  const { ok, data, raw, status, looksLikeHTML } = await fetch(url("/api/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName, lastName, email, passportNumber,
      phoneNumber, password, confirmPassword
    }),
  }).then(parse);

  if (looksLikeHTML) {
    throw Object.assign(new Error("Backend not reachable. Check VITE_API_BASE or server."), { status });
  }
  if (!ok) {
    throw Object.assign(new Error(data?.message || raw || "Signup failed"), { status, data });
  }
  return data ?? {};
}
