// Whether a sign-in is waiting on the browser. On Android the redirect back into the app also opens the
// /auth route; that page waits while a sign-in is pending and otherwise goes home.
let pending = false;

export function setSignInPending(value: boolean) {
  pending = value;
}

export function isSignInPending(): boolean {
  return pending;
}
