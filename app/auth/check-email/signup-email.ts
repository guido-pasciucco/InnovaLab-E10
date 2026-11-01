// The signup form leaves the address in sessionStorage so the "check your
// email" screen can name it and resend to it; it never travels in the URL.
export const SIGNUP_EMAIL_KEY = "signup-email";

export const noopSubscribe = () => () => {};

export function readSignupEmail(): string | null {
  try {
    return sessionStorage.getItem(SIGNUP_EMAIL_KEY);
  } catch {
    return null;
  }
}
