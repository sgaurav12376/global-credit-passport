import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAccessToken } from "../auth/auth";
import { cancelPassportUpdate, connectSources, generatePassport, getOrCreatePassportUpdateDraft, initPassport, recordEntrustSubmission, updatePassportDraft } from "../api/passport";
import PlaidConnect from "../components/PlaidConnect";
import SurepassCreditConnect from "../components/SurepassCreditConnect";

const ENTRUST_WORKFLOW_URL =
  import.meta.env.VITE_ENTRUST_SMART_CAPTURE_URL;

type PassportInitState = {
  status: "not_started" | "in_progress" | "complete";
  origin?: string;
  destination?: string;
  fullName?: string;
  dob?: string; // YYYY-MM-DD
  purpose?: string; // LOAN/BANK/RENT/EMPLOYMENT
  passportId?: string;
  supersedesPassportId?: string;
  startStep?: 1 | 2 | 3 | 4;
  mode?: "view" | "edit";
  identityStatus?: string | null;
  identityCompletedAt?: string | null;
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
  const [passportId, setPassportId] = useState<string | undefined>(
    () => loadInit().passportId
  );
  const [entrustStarted, setEntrustStarted] = useState(false);
  const [entrustCompleted, setEntrustCompleted] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">(() => loadInit().mode || "edit");
  const [supersedesPassportId, setSupersedesPassportId] = useState<string | undefined>(
    () => loadInit().supersedesPassportId
  );
  const [showUpdateChooser, setShowUpdateChooser] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const init = useMemo(() => loadInit(), []);
  const readOnly = mode === "view";

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
      setPassportId(init.passportId);
      setSupersedesPassportId(init.supersedesPassportId);
      setEntrustCompleted(
        init.identityStatus === "ENTRUST_SUBMITTED" || init.identityStatus === "PILOT_COMPLETED"
      );

      if (init.startStep) {
        setStep(init.startStep);
        return;
      }

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
      ...current,
      status: "in_progress",
      origin,
      destination,
      fullName,
      dob,
      sources: { creditBureau, bank },
      passportId: passportId ?? current.passportId,
      purpose: mapPurpose(localStorage.getItem("gcp.purpose")),
      startStep: undefined,
      ...partial,
    };
    saveInit(next);
  }

  async function saveDetails(resolvedPassportId: string, currentSection?: string) {
    const saved = await updatePassportDraft(resolvedPassportId, {
      purpose: mapPurpose(localStorage.getItem("gcp.purpose")),
      originCountry: origin,
      destCountry: destination,
      fullName: fullName.trim(),
      dob,
      currentSection,
    });
    persistInProgress({
      origin: saved.originCountry,
      destination: saved.destCountry,
      fullName: saved.fullName || "",
      dob: saved.dob || "",
      identityStatus: saved.identityStatus,
      identityCompletedAt: saved.identityCompletedAt,
    });
    setEntrustCompleted(
      saved.identityStatus === "ENTRUST_SUBMITTED" || saved.identityStatus === "PILOT_COMPLETED"
    );
    setSaveMessage("Saved to your passport");
    return saved;
  }

  async function saveProgress() {
    persistInProgress();
    if (!origin || !destination || !fullName.trim() || !dob) {
      setSaveMessage("Progress saved on this device");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const resolvedPassportId = await ensurePassportId();
      await saveDetails(resolvedPassportId);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Unable to save your changes.");
    } finally { setLoading(false); }
  }

  async function nextFromStep1() {
    setErr(null);
    setSaveMessage(null);
    if (!origin || !destination) {
      setErr("Please select both origin and destination.");
      return;
    }
    persistInProgress({ origin, destination, startStep: 2 });
    if (!passportId) {
      setStep(2);
      return;
    }
    setLoading(true);
    try {
      await saveDetails(passportId, "IDENTITY");
      setStep(2);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Unable to save your changes.");
    } finally { setLoading(false); }
  }

  async function nextFromStep2() {
    setErr(null);

    if (!fullName.trim() || !dob) {
      setErr("Please enter your full name and date of birth.");
      return;
    }

    setLoading(true);
    try {
      persistInProgress({ fullName: fullName.trim(), dob });

      // Create and persist the new passport version before data sources mount.
      const resolvedPassportId = await ensurePassportId();
      await saveDetails(resolvedPassportId, "FINANCIAL");

      setStep(3);
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Unable to create the updated passport draft."
      );
    } finally {
      setLoading(false);
    }
  }

  async function nextFromStep3() {
    setErr(null);
    if (!creditBureau && !bank) {
      setErr("Connect at least one data source to continue (pilot requirement).");
      return;
    }
    setLoading(true);
    try {
      const resolvedPassportId = await ensurePassportId();
      await saveDetails(resolvedPassportId, "REVIEW");
      persistInProgress({ sources: { creditBureau, bank }, startStep: 4 });
      setStep(4);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Unable to save your changes.");
    } finally { setLoading(false); }
  }

  function startEntrustVerification() {
    setErr(null);

    if (!ENTRUST_WORKFLOW_URL) {
      setErr("Entrust verification URL is not configured.");
      return;
    }

    setEntrustStarted(true);

    window.open(
      ENTRUST_WORKFLOW_URL,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function confirmEntrustCompletion() {
    setLoading(true);
    setErr(null);
    try {
      const resolvedPassportId = await ensurePassportId();
      await saveDetails(resolvedPassportId);
      const result = await recordEntrustSubmission(resolvedPassportId);
      setEntrustCompleted(true);
      persistInProgress({
        identityStatus: result.identityStatus,
        identityCompletedAt: result.completedAt,
      });
      setSaveMessage("Identity submission saved");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Unable to save identity completion.");
    } finally { setLoading(false); }
  }

  async function createPassport() {
    setErr(null);
    setLoading(true);

    try {
      const purpose = mapPurpose(localStorage.getItem("gcp.purpose"));

      // 1) reuse the draft created for provider connections, or create it now
      const resolvedPassportId = await ensurePassportId();
      const savedPassport = await saveDetails(resolvedPassportId);
      if (
        savedPassport.identityStatus !== "ENTRUST_SUBMITTED" &&
        savedPassport.identityStatus !== "PILOT_COMPLETED"
      ) {
        setStep(2);
        throw new Error("Complete identity verification before publishing this passport.");
      }

      // 2) connect sources (based on toggles)
      const sources: string[] = [];
      if (creditBureau) sources.push("CREDIT_BUREAU");
      if (bank) sources.push("OPEN_BANKING");

      if (sources.length > 0) {
        await connectSources(resolvedPassportId, sources);
      }

      // 3) generate
      await generatePassport(resolvedPassportId);

      // 4) mark complete locally
      const next: PassportInitState = {
        status: "complete",
        purpose,
        passportId: resolvedPassportId,
        origin,
        destination,
        fullName: fullName.trim(),
        dob,
        sources: { creditBureau, bank },
        supersedesPassportId: init.supersedesPassportId,
      };
      saveInit(next);

      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create passport");
    } finally {
      setLoading(false);
    }
  }

  async function ensurePassportId(): Promise<string> {
    if (passportId) return passportId;
    if (!origin || !destination || !fullName.trim() || !dob) {
      throw new Error("Complete corridor and profile details before connecting a data source.");
    }
    const result = await initPassport({
      purpose: mapPurpose(localStorage.getItem("gcp.purpose")),
      originCountry: origin,
      destCountry: destination,
      fullName: fullName.trim(),
      dob,
      supersedesPassportId: init.supersedesPassportId,
    });
    setPassportId(result.passportId);
    persistInProgress({ passportId: result.passportId });
    return result.passportId;
  }

  async function beginUpdate(targetStep: 1 | 2 | 3 = 1) {
    if (!passportId) return;
    setLoading(true);
    setErr(null);
    try {
      const result = await getOrCreatePassportUpdateDraft(passportId);
      const section = targetStep === 1 ? "PURPOSE" : targetStep === 2 ? "IDENTITY" : "FINANCIAL";
      await updatePassportDraft(result.passportId, {
        purpose: mapPurpose(localStorage.getItem("gcp.purpose")),
        originCountry: origin,
        destCountry: destination,
        fullName: fullName.trim(),
        dob,
        currentSection: section,
      });
      const next = { ...loadInit(), mode: "edit" as const, status: "in_progress" as const,
        passportId: result.passportId, supersedesPassportId: passportId, startStep: targetStep };
      saveInit(next);
      setPassportId(result.passportId);
      setSupersedesPassportId(passportId);
      setMode("edit");
      setStep(targetStep);
      setShowUpdateChooser(false);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Unable to open an update draft.");
    } finally { setLoading(false); }
  }

  async function discardUpdate() {
    if (!passportId || !supersedesPassportId) return;
    if (!window.confirm("Discard this unfinished update? Your current published passport will not change.")) return;
    setLoading(true);
    setErr(null);
    try {
      await cancelPassportUpdate(passportId);
      localStorage.removeItem(LS_KEY);
      nav("/dashboard");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Unable to discard this update.");
    } finally { setLoading(false); }
  }

  function navigateToStep(targetStep: 1 | 2 | 3 | 4) {
    setStep(targetStep);
    if (readOnly) return;
    persistInProgress({ startStep: targetStep });
    if (passportId) {
      const section = targetStep === 1 ? "PURPOSE" : targetStep === 2 ? "IDENTITY" : targetStep === 3 ? "FINANCIAL" : "REVIEW";
      void saveDetails(passportId, section).catch((error) =>
        setErr(error instanceof Error ? error.message : "Unable to save your position."));
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
    setPassportId(undefined);
    setSupersedesPassportId(undefined);
    setEntrustStarted(false);
    setEntrustCompleted(false);
    setStep(1);
  }

  return (
    <div className="page-bg workspace-bg">
      <div className="card passport-workspace-card">
        <div className="card-header workspace-card-header">
          <div><span className="eyebrow">GLOBAL CREDIT PASSPORT</span><h2>{readOnly ? "Your passport" : supersedesPassportId ? "Update your passport" : "Build your passport"}</h2></div>
          <Link to="/dashboard" className="btn btn-secondary compact-action">Dashboard</Link>
        </div>
        <div className="card-body">
          {readOnly && <div className="view-mode-banner"><span><b>Published passport</b> — review your information or start an update.</span><button className="btn compact-action" disabled={loading} onClick={() => setShowUpdateChooser(true)}>Update information</button></div>}

          {showUpdateChooser && <section className="update-chooser" aria-label="Choose information to update">
            <div><h3>What would you like to update?</h3><p>Choose one section. You can review everything before publishing.</p></div>
            <div className="update-choice-list">
              <button onClick={() => void beginUpdate(1)}><b>Purpose and countries</b><span>Where your history comes from and where you will use it</span></button>
              <button onClick={() => void beginUpdate(2)}><b>Personal details</b><span>Name, date of birth, and identity verification</span></button>
              <button onClick={() => void beginUpdate(3)}><b>Financial information</b><span>Credit reports and connected bank accounts</span></button>
            </div>
            <button className="text-button centered" onClick={() => setShowUpdateChooser(false)}>Cancel</button>
          </section>}

          <div className="journey-intro"><b>{readOnly ? "Passport information" : "A few steps bring your verified information together."}</b><span>{readOnly ? "Choose a section to review." : `Step ${step} of 4`}</span></div>

          <div className="workspace-stepper" style={{ marginTop: 10 }}>
            <div className={"tile " + (step === 1 ? "selected" : "")} onClick={() => navigateToStep(1)}>
              <div className="step-number">1</div>
              <div><b>Purpose</b><small>Where you will use it</small></div>
            </div>
            <div className={"tile " + (step === 2 ? "selected" : "")} onClick={() => navigateToStep(2)}>
              <div className="step-number">2</div>
              <div><b>Identity</b><small>Your verified details</small></div>
            </div>
            <div className={"tile " + (step === 3 ? "selected" : "")} onClick={() => navigateToStep(3)}>
              <div className="step-number">3</div>
              <div><b>Financial information</b><small>Credit and banking</small></div>
            </div>
            <div className={"tile " + (step === 4 ? "selected" : "")} onClick={() => navigateToStep(4)}>
              <div className="step-number">4</div>
              <div><b>Review</b><small>Check and finish</small></div>
            </div>
          </div>

          {err && <div style={{ color: "#b00020", fontSize: 13, marginTop: 12 }}>{err}</div>}
          {saveMessage && !err && <div className="save-confirmation">✓ {saveMessage}</div>}

          {step === 1 && (
            <div style={{ marginTop: 14 }}>
              <h3 className="task-title">Where will you use your financial history?</h3>
              <div className="hint" style={{ textAlign: "left" }}>
                Tell us where your history comes from and where you plan to use it.
              </div>

              <div className="label">Origin Country</div>
              <select className="input" disabled={readOnly} value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="">Select</option>
                <option value="IN">India</option>
                <option value="US">United States</option>
                <option value="SG">Singapore</option>
                <option value="AE">UAE</option>
              </select>

              <div className="label">Destination Country</div>
              <select className="input" disabled={readOnly} value={destination} onChange={(e) => setDestination(e.target.value)}>
                <option value="">Select</option>
                <option value="US">United States</option>
                <option value="SG">Singapore</option>
                <option value="IN">India</option>
                <option value="AE">UAE</option>
              </select>

              <button className="btn" disabled={loading} onClick={() => readOnly ? setStep(2) : void nextFromStep1()} style={{ marginTop: 14 }}>
                {readOnly ? "Next section" : "Continue"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ marginTop: 14 }}>
              <h3 className="task-title">Verify that this information belongs to you</h3>
              <div className="hint" style={{ textAlign: "left" }}>
                Enter your basic profile details, then complete secure identity verification through Entrust.
              </div>

              <div className="label">Full Name</div>
              <input
                className="input"
                disabled={readOnly}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your legal name"
              />

              <div className="label">Date of Birth</div>
              <input
                className="input"
                disabled={readOnly}
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 16,
                  color: "var(--text)",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  Identity verification
                </div>

                <div
                  className="hint"
                  style={{
                    textAlign: "left",
                    marginTop: 6,
                  }}
                >
                  Complete a secure identity check. Entrust performs the verification for GCP.
                </div>

                {!entrustCompleted && <button
                  className="btn"
                  type="button"
                  disabled={readOnly}
                  onClick={startEntrustVerification}
                  style={{ marginTop: 12 }}
                >
                  {entrustStarted
                    ? "Reopen Entrust verification"
                    : "Verify identity with Entrust"}
                </button>}

                {entrustStarted && !entrustCompleted && (
                  <div style={{ marginTop: 12 }}>
                    <div
                      className="hint"
                      style={{ textAlign: "left" }}
                    >
                      After Entrust displays “Thank you,” close that tab,
                      return here and confirm that you completed the steps.
                    </div>

                    <button
                      className="btn"
                      type="button"
                      disabled={loading}
                      onClick={() => void confirmEntrustCompletion()}
                      style={{ marginTop: 10 }}
                    >
                      {loading ? "Saving..." : "I have completed the Entrust steps"}
                    </button>
                  </div>
                )}

                {entrustCompleted && (
                  <div
                    style={{
                      color: "#18794e",
                      fontSize: 13,
                      marginTop: 12,
                    }}
                  >
                    ✓ Entrust submission recorded — provider confirmation pending
                  </div>
                )}
              </div>

              <button
                className="btn"
                onClick={() => readOnly ? setStep(3) : void nextFromStep2()}
                disabled={loading}
                style={{ marginTop: 14 }}
              >
                {loading ? "Preparing data sources..." : readOnly ? "Next section" : "Continue"}
              </button>
              {!readOnly && <div className="footer">
                <a className="link" href="#" onClick={(e) => { e.preventDefault(); void saveProgress(); }}>
                  Save progress
                </a>
              </div>}
            </div>
          )}

          {step === 3 && (
            <div style={{ marginTop: 14 }}>
              <h3 className="task-title">Add financial information</h3>
              <div className="hint" style={{ textAlign: "left" }}>
                Add at least one source. More verified information can make your passport more useful.
              </div>

              <div className="data-source-grid">
                <SurepassCreditConnect
                  readOnly={readOnly}
                  connected={creditBureau}
                  passportId={passportId}
                  fullName={fullName}
                  ensurePassportId={ensurePassportId}
                  onConnected={() => {
                    setCreditBureau(true);
                    persistInProgress({
                      sources: { creditBureau: true, bank },
                    });
                  }}
                />

                <PlaidConnect
                  readOnly={readOnly}
                  connected={bank}
                  passportId={passportId}
                  ensurePassportId={ensurePassportId}
                  onConnected={() => {
                    setBank(true);
                    persistInProgress({
                      sources: { creditBureau, bank: true },
                    });
                  }}
                  onAllRemoved={() => {
                    setBank(false);
                    persistInProgress({
                      sources: { creditBureau, bank: false },
                    });
                  }}
                />
              </div>

              <button className="btn" disabled={loading} onClick={() => readOnly ? setStep(4) : void nextFromStep3()} style={{ marginTop: 14 }}>
                {readOnly ? "Next section" : "Continue"}
              </button>
              {!readOnly && <div className="footer">
                <a className="link" href="#" onClick={(e) => { e.preventDefault(); reset(); }}>
                  Reset setup
                </a>
              </div>}
            </div>
          )}

          {step === 4 && (
            <div style={{ marginTop: 14 }}>
              <h3 className="task-title">Review your passport</h3>
              <div className="hint" style={{ textAlign: "left" }}>
                Confirm that the information below is ready to use.
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
                  <b>Financial information:</b>{" "}
                  {(creditBureau ? "Credit Bureau" : "")}
                  {(creditBureau && bank ? ", " : "")}
                  {(bank ? "Bank/Open Banking" : "")}
                  {(!creditBureau && !bank) ? "-" : ""}
                </div>
              </div>

              {readOnly ? <button className="btn" onClick={() => nav("/dashboard")} style={{ marginTop: 14 }}>Back to dashboard</button> :
                <button className="btn" onClick={createPassport} disabled={loading} style={{ marginTop: 14 }}>{loading ? "Creating..." : "Publish updated passport"}</button>}

              {!readOnly && <div className="footer">
                <a className="link" href="#" onClick={(e) => { e.preventDefault(); void saveProgress(); }}>
                  Save progress
                </a>
              </div>}
            </div>
          )}

          {!readOnly && supersedesPassportId && <div className="discard-update-row">
            <button className="text-button danger-text" disabled={loading} onClick={() => void discardUpdate()}>Discard this update</button>
            <small>Your published passport will remain unchanged.</small>
          </div>}

        </div>
      </div>
    </div>
  );
}
