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
  return signIn({ username, password });
}

export async function logout() {
  return signOut();
}

export async function getAccessToken(): Promise<string | null> {
  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString() ?? null;
}
