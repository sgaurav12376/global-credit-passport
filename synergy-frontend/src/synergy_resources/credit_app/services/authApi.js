async function safeJson(res) { try { return await res.json(); } catch { return {}; } }
async function safeText(res) { try { return await res.text(); } catch { return ""; } }

/** Matches colleague: POST /login { username, password } where username = email OR phone */
export async function loginRequest({ email, phone, password }) {
  const username = email || phone;
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await safeText(res)) || "Login failed");
  return safeJson(res); // may be {} if backend returns no body
}

/** Signup to DB; adjust fields if your backend expects more */
export async function signupRequest({ email, phone, password }) {
  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, phone, password }),
  });
  if (!res.ok) throw new Error((await safeText(res)) || "Signup failed");
  return safeJson(res);
}
