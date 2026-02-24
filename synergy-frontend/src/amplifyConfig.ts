import { Amplify } from "aws-amplify";

export function configureAmplify() {
  const region = import.meta.env.VITE_AWS_REGION as string;
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string;
  const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string;

  if (!region || !userPoolId || !userPoolClientId) {
    // eslint-disable-next-line no-console
    console.warn("Missing Cognito env vars. Check .env.local");
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
      },
    },
  });
}
