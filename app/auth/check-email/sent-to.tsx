"use client";

import { useSyncExternalStore } from "react";

import { noopSubscribe, readSignupEmail } from "./signup-email";

// Falls back to a generic phrase when the address is missing (e.g. reload in
// a new tab) and during server rendering.
export function SentTo() {
  const email = useSyncExternalStore(noopSubscribe, readSignupEmail, () => null);

  return <>Te enviamos un enlace a {email ? <strong className="font-semibold text-[#31503a]">{email}</strong> : "tu correo"} para activar tu cuenta.</>;
}
