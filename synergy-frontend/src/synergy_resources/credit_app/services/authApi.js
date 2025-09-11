// services/authApi.js
const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  (import.meta?.env?.VITE_API_BASE ?? ""); // e.g. http://localhost:8080

const url = (p) => `${API_BASE}${p}`;

async function parse(res) {
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  return { ok: res.ok, status: res.status, data, raw };
}

// ✅ Backend login expects ONLY: { email, password }
export async function login({ email, password }) {
  const { ok, data, raw, status } = await fetch(url("/api/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then(parse);

  if (!ok) {
    throw Object.assign(new Error(data?.message || raw || "Login failed"), { status, data });
  }
  return data ?? {};
}

// ✅ Backend register expects:
// { firstName, lastName, email, passportNumber, phoneNumber, password, confirmPassword }
export async function signup(payload) {
  const {
    firstName, lastName, email, passportNumber,
    phoneNumber, password, confirmPassword
  } = payload;

  const { ok, data, raw, status } = await fetch(url("/api/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName, lastName, email, passportNumber,
      phoneNumber, password, confirmPassword
    }),
  }).then(parse);

  if (!ok) {
    throw Object.assign(new Error(data?.message || raw || "Signup failed"), { status, data });
  }
  return data ?? {};
}
