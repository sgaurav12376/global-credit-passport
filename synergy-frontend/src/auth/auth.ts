import {
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  signIn,
  fetchAuthSession,
  signOut
} from "aws-amplify/auth";

/**
 * UX: verify first, password later.
 * Cognito signUp requires a password, so we generate a temporary one and never show it.
 */
function generateTempPassword() {
  const rand = () => Math.random().toString(36).slice(2, 8);
  return `Gcp!${rand()}A1${rand()}z`;
}

export type SignUpIdentifier =
  | { type: "email"; value: string }
  | { type: "phone"; value: string }; // E.164 like +14155552671

export async function startSignUp(id: SignUpIdentifier) {
  const username = id.value;
  const password = generateTempPassword();

  const userAttributes: Record<string, string> = {};
  if (id.type === "email") userAttributes.email = id.value;
  if (id.type === "phone") userAttributes.phone_number = id.value;

  const res = await signUp({
    username,
    password,
    options: {
      userAttributes,
    },
  });

  return { username, isSignUpComplete: res.isSignUpComplete };
}

export async function verifySignUp(username: string, code: string) {
  return confirmSignUp({ username, confirmationCode: code });
}

/**
 * Step 3 UX: "Create Password" (we use Cognito Forgot Password to let user set a real password)
 */
export async function requestSetPassword(username: string) {
  return resetPassword({ username });
}

export async function setPasswordWithCode(username: string, code: string, newPassword: string) {
  return confirmResetPassword({ username, confirmationCode: code, newPassword });
}

export async function login(username: string, password: string) {
  try {
    return await signIn({ username, password });
  } catch (e: any) {
    const msg = String(e?.message || e);

    if (msg.toLowerCase().includes("already a signed in user")) {
      // Clear stale session then retry
      await logout();              // if you already have logout() in this file
      return await signIn({ username, password });
    }

    throw e;
  }
}

/**
 * Hard logout:
 * - Signs out from Cognito (global preferred)
 * - Clears local app state
 * - Hard redirects to /login so React state is fully reset
 */
export async function logout() {
  try {
    await signOut({ global: true });
  } catch (e) {
    console.warn("Amplify signOut failed:", e);
  }

  // Clear app state
  try {
    localStorage.removeItem("gcp.purpose");
    localStorage.removeItem("gcp.username");
    localStorage.removeItem("gcp.idType");
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}

  // Hard redirect resets any cached app state
  window.location.replace("/login");
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await fetchAuthSession();
    return !!session.tokens?.accessToken;
  } catch {
    return false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString() ?? null;
}
