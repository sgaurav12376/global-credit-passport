import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAccessToken } from "../auth/auth";
import { connectSources, generatePassport, initPassport } from "../api/passport";

type PassportInitState = {
  status: "not_started" | "in_progress" | "complete";
  origin?: string;
  destination?: string;
  fullName?: string;
  dob?: string; // YYYY-MM-DD
  purpose?: string; // LOAN/BANK/RENT/EMPLOYMENT
  passportId?: string;
  sources?: {
    creditBureau?: boolean;
    bank?: boolean;
  };
  updatedAt?: string;
};

const LS_KEY = "gcp.passportInit";

function loadInit(): PassportInitState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { status: "not_started" };
    return JSON.parse(raw);
  } catch {
    return { status: "not_started" };
  }
}

function saveInit(next: PassportInitState) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({ ...next, updatedAt: new Date().toISOString() })
  );
}

function mapPurpose(p: string | null): string {
  // localStorage stores: loan/bank/rent/employment
  switch ((p || "").toLowerCase()) {
    case "loan": return "LOAN";
    case "bank": return "BANK";
    case "rent": return "RENT";
    case "employment": return "EMPLOYMENT";
    default: return "LOAN";
  }
}

export default function PassportInit() {
  const nav = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [creditBureau, setCreditBureau] = useState(false);
  const [bank, setBank] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const init = useMemo(() => loadInit(), []);

  // Guard: require logged-in session
  useEffect(() => {
    getAccessToken()
      .then((t) => {
        if (!t) nav("/login");
      })
      .catch(() => nav("/login"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill if already started
  useEffect(() => {
    if (init?.status === "complete") {
      nav("/dashboard");
      return;
    }

    if (init?.status === "in_progress") {
      setOrigin(init.origin ?? "");
      setDestination(init.destination ?? "");
      setFullName(init.fullName ?? "");
      setDob(init.dob ?? "");
      setCreditBureau(!!init.sources?.creditBureau);
      setBank(!!init.sources?.bank);

      if (!init.origin || !init.destination) setStep(1);
      else if (!init.fullName || !init.dob) setStep(2);
      else if (!init.sources?.creditBureau && !init.sources?.bank) setStep(3);
      else setStep(4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistInProgress(partial?: Partial<PassportInitState>) {
    const current = loadInit();
    const next: PassportInitState = {
      status: "in_progress",
      origin,
      destination,
      fullName,
      dob,
      sources: { creditBureau, bank },
      purpose: mapPurpose(localStorage.getItem("gcp.purpose")),
      ...current,
      ...partial,
    };
    saveInit(next);
  }

  function nextFromStep1() {
    setErr(null);
    if (!origin || !destination) {
      setErr("Please select both origin and destination.");
      return;
    }
    persistInProgress({ origin, destination });
    setStep(2);
  }

  function nextFromStep2() {
    setErr(null);
    if (!fullName.trim() || !dob) {
      setErr("Please enter your full name and date of birth.");
      return;
    }
    persistInProgress({ fullName: fullName.trim(), dob });
    setStep(3);
  }

  function nextFromStep3() {
    setErr(null);
    if (!creditBureau && !bank) {
      setErr("Connect at least one data source to continue (pilot requirement).");
      return;
    }
    persistInProgress({ sources: { creditBureau, bank } });
    setStep(4);
  }

  async function createPassport() {
    setErr(null);
    setLoading(true);

    try {
      const purpose = mapPurpose(localStorage.getItem("gcp.purpose"));

      // 1) init passport
      const initRes = await initPassport({
        purpose,
        originCountry: origin,
        destCountry: destination,
        fullName: fullName.trim(),
        dob,
      });

      const passportId = initRes.passportId;

      // 2) connect sources (based on toggles)
      const sources: string[] = [];
      if (creditBureau) sources.push("CREDIT_BUREAU");
      if (bank) sources.push("OPEN_BANKING");

      if (sources.length > 0) {
        await connectSources(passportId, sources);
      }

      // 3) generate
      await generatePassport(passportId);

      // 4) mark complete locally
      const next: PassportInitState = {
        status: "complete",
        purpose,
        passportId,
        origin,
        destination,
        fullName: fullName.trim(),
        dob,
        sources: { creditBureau, bank },
      };
      saveInit(next);

      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create passport");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    localStorage.removeItem(LS_KEY);
    setOrigin("");
    setDestination("");
    setFullName("");
    setDob("");
    setCreditBureau(false);
    setBank(false);
    setStep(1);
  }

  return (
    <div className="page-bg">
      <div className="card" style={{ width: 560 }}>
        <div className="card-header">Passport Initialization</div>
        <div className="card-body">
          <Link to="/purpose" className="back">← Back</Link>

          <div className="hint" style={{ textAlign: "left" }}>
            Step {step} of 4
          </div>

          <div className="grid2" style={{ marginTop: 10 }}>
            <div className={"tile " + (step === 1 ? "selected" : "")} onClick={() => setStep(1)}>
              <div className="icon">🌍</div>
              <div style={{ fontWeight: 700 }}>Corridor</div>
            </div>
            <div className={"tile " + (step === 2 ? "selected" : "")} onClick={() => setStep(2)}>
              <div className="icon">🧾</div>
              <div style={{ fontWeight: 700 }}>Profile</div>
            </div>
            <div className={"tile " + (step === 3 ? "selected" : "")} onClick={() => setStep(3)}>
              <div className="icon">🔗</div>
              <div style={{ fontWeight: 700 }}>Data Sources</div>
            </div>
            <div className={"tile " + (step === 4 ? "selected" : "")} onClick={() => setStep(4)}>
              <div className="icon">🪪</div>
              <div style={{ fontWeight: 700 }}>Generate</div>
            </div>
          </div>

          {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 12 }}>{err}</div>}

          {step === 1 && (
            <div style={{ marginTop: 14 }}>
              <div className="hint" style={{ textAlign: "left" }}>
                Choose your origin and destination country for this passport.
              </div>

              <div className="label">Origin Country</div>
              <select className="input" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="">Select</option>
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="SG">Singapore</option>
                <option value="AE">UAE</option>
              </select>

              <div className="label">Destination Country</div>
              <select className="input" value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="">Select</option>
                <option value="US">United States</option>
                <option value="SG">Singapore</option>
                <option value="IN">India</option>
                <option value="AE">UAE</option>
              </select>

              <button className="btn" onClick={nextFromStep1} style={{ marginTop: 14 }}>
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ marginTop: 14 }}>
              <div className="hint" style={{ textAlign: "left" }}>
                Basic identity profile (pilot KYC-lite). This will later map to full KYC/AML.
              </div>

              <div className="label">Full Name</div>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your legal name"
              />

              <div className="label">Date of Birth</div>
              <input
                className="input"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />

              <button className="btn" onClick={nextFromStep2} style={{ marginTop: 14 }}>
                Continue
              </button>
              <div className="footer">
                <a className="link" href="#" onClick={(e) => { e.preventDefault(); persistInProgress(); }}>
                  Save progress
                </a>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ marginTop: 14 }}>
              <div className="hint" style={{ textAlign: "left" }}>
                Connect at least one source to generate a Passport preview (pilot).
              </div>

              <div className="grid2">
                <div
                  className={"tile " + (creditBureau ? "selected" : "")}
                  onClick={() => {
                    const v = !creditBureau;
                    setCreditBureau(v);
                    persistInProgress({ sources: { creditBureau: v, bank } });
                  }}
                >
                  <div className="icon">📊</div>
                  <div style={{ fontWeight: 700 }}>Credit Bureau</div>
                  <div className="hint" style={{ marginTop: 6 }}>Mock connect</div>
                </div>

                <div
                  className={"tile " + (bank ? "selected" : "")}
                  onClick={() => {
                    const v = !bank;
                    setBank(v);
                    persistInProgress({ sources: { creditBureau, bank: v } });
                  }}
                >
                  <div className="icon">🏦</div>
                  <div style={{ fontWeight: 700 }}>Bank / Open Banking</div>
                  <div className="hint" style={{ marginTop: 6 }}>Mock connect</div>
                </div>
              </div>

              <button className="btn" onClick={nextFromStep3} style={{ marginTop: 14 }}>
                Continue
              </button>
              <div className="footer">
                <a className="link" href="#" onClick={(e) => { e.preventDefault(); reset(); }}>
                  Reset setup
                </a>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ marginTop: 14 }}>
              <div className="hint" style={{ textAlign: "left" }}>
                Review and generate your Passport.
              </div>

              <div style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                marginTop: 10,
                color: "var(--text)"
              }}>
                <div><b>Corridor:</b> {origin || "-"} → {destination || "-"}</div>
                <div style={{ marginTop: 6 }}><b>Name:</b> {fullName || "-"}</div>
                <div style={{ marginTop: 6 }}><b>DOB:</b> {dob || "-"}</div>
                <div style={{ marginTop: 6 }}>
                  <b>Sources:</b>{" "}
                  {(creditBureau ? "Credit Bureau" : "")}
                  {(creditBureau && bank ? ", " : "")}
                  {(bank ? "Bank/Open Banking" : "")}
                  {(!creditBureau && !bank) ? "-" : ""}
                </div>
              </div>

              <button className="btn" onClick={createPassport} disabled={loading} style={{ marginTop: 14 }}>
                {loading ? "Creating..." : "Create Passport"}
              </button>

              <div className="footer">
                <a className="link" href="#" onClick={(e) => { e.preventDefault(); persistInProgress(); }}>
                  Save progress
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
