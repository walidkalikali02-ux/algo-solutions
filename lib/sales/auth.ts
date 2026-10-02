import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
export const cookieName = "algo_sales_session";
export function authKey() {
  const key = process.env.SALES_ADMIN_KEY;
  return key && key.length >= 32 ? key : null;
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function session(key: string) {
  const expiry = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expiry}.${createHmac("sha256", key).update(expiry).digest("hex")}`;
}
export async function authorized() {
  const key = authKey(),
    value = (await cookies()).get(cookieName)?.value;
  if (!key || !value) return false;
  const [expiry, mac] = value.split(".");
  return (
    /^\d+$/.test(expiry) &&
    Number(expiry) > Date.now() &&
    Number(expiry) <= Date.now() + 8 * 60 * 60 * 1000 &&
    !!mac &&
    equal(mac, createHmac("sha256", key).update(expiry).digest("hex"))
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      url.host === (request.headers.get("host") || new URL(request.url).host)
    );
  } catch {
    return false;
  }
}
