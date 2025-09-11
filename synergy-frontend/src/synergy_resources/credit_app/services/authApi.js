// src/synergy_resources/credit_app/services/authApi.js
const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  (import.meta?.env?.VITE_API_BASE ?? ""); // "" → uses your Vite proxy

const url = (p) => `${API_BASE}${p}`;

async function parse(res) {
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  return { ok: res.ok, status: res.status, data, raw };
}

export async function login({ email, phoneNumber, password }) {
  const { ok, data, raw, status } = await fetch(url("/api/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // credentials: "include", // uncomment if your API uses cookies
    body: JSON.stringify({ email, phoneNumber, password }),
  }).then(parse);

  if (!ok) {
    throw Object.assign(new Error(data?.message || raw || "Login failed"), { status, data });
  }
  return data ?? {};
}

export async function signup({ email, phoneNumber, password }) {
  const { ok, data, raw, status } = await fetch(url("/api/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // credentials: "include",
    body: JSON.stringify({ email, phoneNumber, password }),
  }).then(parse);

  if (!ok) {
    throw Object.assign(new Error(data?.message || raw || "Signup failed"), { status, data });
  }
  return data ?? {};
}
