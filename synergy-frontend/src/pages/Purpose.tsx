import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type PurposeKey = "loan" | "bank" | "rent" | "employment";

const PASSPORT_LS_KEY = "gcp.passportInit";

function passportIsComplete(): boolean {
  try {
    const raw = localStorage.getItem(PASSPORT_LS_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return obj?.status === "complete";
  } catch {
    return false;
  }
}

export default function Purpose() {
  const nav = useNavigate();
  const [selected, setSelected] = useState<PurposeKey | null>(null);
  const [consent, setConsent] = useState(false);

  // If purpose exists, decide whether to go to init or dashboard
  useEffect(() => {
    const existing = localStorage.getItem("gcp.purpose");
    if (existing) {
      if (passportIsComplete()) nav("/dashboard");
      else nav("/passport-init");
    }
  }, [nav]);

  function next() {
    if (!selected) return;
    if (!consent) return;

    localStorage.setItem("gcp.purpose", selected);
    nav("/passport-init");
  }

  return (
    <div className="page-bg">
      <div className="card">
        <div className="card-header">Choose Your Purpose</div>
        <div className="card-body">
          <Link to="/create-password" className="back">← Back</Link>
          <div className="hint">What brings you to Global Credit Passport?</div>

          <div className="grid2">
            <div className={"tile " + (selected === "loan" ? "selected" : "")} onClick={()=>setSelected("loan")}>
              <div className="icon">🏠</div>
              <div style={{ fontWeight: 700 }}>Apply for a Loan</div>
            </div>

            <div className={"tile " + (selected === "bank" ? "selected" : "")} onClick={()=>setSelected("bank")}>
              <div className="icon">🏦</div>
              <div style={{ fontWeight: 700 }}>Open a Bank Account</div>
            </div>

            <div className={"tile " + (selected === "rent" ? "selected" : "")} onClick={()=>setSelected("rent")}>
              <div className="icon">🔑</div>
              <div style={{ fontWeight: 700 }}>Rent a Home</div>
            </div>

            <div className={"tile " + (selected === "employment" ? "selected" : "")} onClick={()=>setSelected("employment")}>
              <div className="icon">🪪</div>
              <div style={{ fontWeight: 700 }}>Employment Verification</div>
            </div>
          </div>

          <label className="checkbox" style={{ marginTop: 14 }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e)=>setConsent(e.target.checked)}
            />
            <span>I consent to data access & verification for my selected purpose.</span>
          </label>

          <button className="btn" onClick={next} disabled={!selected || !consent}>
            Next
          </button>

          <div className="footer">
            <a className="link" href="#" onClick={(e)=>e.preventDefault()}>
              Learn More
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
