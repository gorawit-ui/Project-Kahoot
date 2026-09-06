import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export const HOST_SESSION_COOKIE = "jixgo_host_session";

export function getHostControlKey() {
  return process.env.JIXGO_HOST_CONTROL_KEY ?? null;
}

export function isValidHostKey(value: string | null) {
  const expected = getHostControlKey();
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function sessionSignature(hostKey: string) {
  return createHmac("sha256", hostKey).update("jixgo-host-session:v1").digest("base64url");
}

export function createHostSession() {
  const hostKey = getHostControlKey();
  return hostKey ? sessionSignature(hostKey) : null;
}

export function isValidHostSession(value: string | undefined) {
  const expected = createHostSession();
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
