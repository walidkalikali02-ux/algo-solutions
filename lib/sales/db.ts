import "server-only";
export class StorageUnavailable extends Error {}
export async function db(path: string, init: RequestInit = {}) {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new StorageUnavailable("Sales storage is not configured");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Sales storage request failed (${response.status})`);
  }
  return response.status === 204 ? null : response.json();
}
