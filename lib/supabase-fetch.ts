// A gateway can briefly reject an otherwise valid key when its clock is behind
// the issuer. Such a rejection happens before the RPC executes. Retry it once
// with the same credentials; ordinary authorization failures are never retried.
export async function supabaseFetch(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (![400, 401, 403].includes(response.status) || init?.signal?.aborted || input instanceof Request) return response;
  const error = await response.clone().json().catch(() => null);
  if (typeof error?.message !== "string" || !error.message.includes("JWT issued at future")) return response;
  await new Promise(resolve => setTimeout(resolve, 250));
  if (init?.signal?.aborted) return response;
  return fetch(input, init);
}
