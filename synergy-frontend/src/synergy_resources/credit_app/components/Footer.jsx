// src/synergy_resources/credit_app/components/Footer.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

// Use your backend URL from .env (Vite) → VITE_NEWSLETTER_URL
// Fallback keeps working if your backend mounted it at this path.
const ENDPOINT =
  import.meta?.env?.VITE_NEWSLETTER_URL || "/api/newsletter/subscribe";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ok | err
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function onSubmit(e) {
    e.preventDefault();
    if (!isValid || status === "loading") return;

    setStatus("loading");
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "web" }),
        credentials: "include",
      });

      let ok = r.ok;
      try {
        const j = await r.clone().json();
        ok = ok && (j?.ok || j?.success || j?.status === "ok" || j === true);
      } catch {/* non-JSON fine */}

      if (!ok) throw new Error("subscribe failed");
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("err");
    }
  }

  return (
    <footer className="footer">
      <div className="footer-inner">
        {/* Left: copyright + links */}
        <div className="footer-left">
          <p>© {new Date().getFullYear()} Global Credit App</p>
          <nav className="footer-links">
            <Link to="/legal/terms">Terms</Link>
            <Link to="/legal/privacy">Privacy</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>

        {/* Center: newsletter */}
        <div className="footer-news">
          <form onSubmit={onSubmit} noValidate>
            <input
              type="email"
              placeholder="Subscribe newsletter…"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
              aria-invalid={email ? String(!isValid) : "false"}
              aria-describedby="nl-msg"
              required
            />
            <button
              type="submit"
              aria-label="Subscribe"
              disabled={!isValid || status === "loading"}
              title={isValid ? "Subscribe" : "Enter a valid email"}
            >
              {status === "loading" ? "…" : "→"}
            </button>
          </form>
          <div id="nl-msg" className={`nl-msg ${status}`} aria-live="polite">
            {status === "ok" && "Thanks! Check your inbox."}
            {status === "err" && "Could not subscribe. Try again."}
          </div>
        </div>

        {/* Right: socials */}
        <div className="footer-socials">
          <a href="#" aria-label="LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.1c.5-1 1.7-2.2 3.6-2.2 3.9 0 4.6 2.6 4.6 6V24h-4v-8.2c0-2 0-4.5-2.7-4.5-2.7 0-3.1 2.1-3.1 4.3V24h-4V8z"/>
            </svg>
          </a>
          <a href="#" aria-label="Twitter">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 4.6c-.9.4-1.9.6-2.9.8 1-0.6 1.8-1.6 2.2-2.7-.9.6-2 .9-3.1 1.2C19.3 2.7 18 2 16.6 2c-2.7 0-4.7 2.6-4.1 5.2C8.1 7.1 4.3 5.1 1.7 2.1.4 4.1 1 6.8 3.2 8.1c-.8 0-1.6-.2-2.2-.6v.1c0 2.3 1.7 4.4 4 4.9-.7.2-1.4.3-2.2.1.6 2 2.4 3.5 4.6 3.5-1.7 1.3-3.8 2-6 2-.4 0-.8 0-1.2-.1C2.3 20.3 5 21 7.8 21c9.3 0 14.5-7.7 14.2-14.7.9-.6 1.7-1.5 2.3-2.5z"/>
            </svg>
          </a>
          <a href="mailto:info@example.com" aria-label="Email">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 13.1L0 6V4l12 7 12-7v2l-12 7.1zM0 8l12 7 12-7v12H0V8z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
