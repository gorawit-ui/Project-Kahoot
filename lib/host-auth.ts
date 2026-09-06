import "server-only";
import { timingSafeEqual } from "crypto";

export function isValidHostKey(value: string | null) {
  const expected = process.env.JIXGO_HOST_CONTROL_KEY;
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
