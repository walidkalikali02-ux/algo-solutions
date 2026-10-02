import { NextResponse } from "next/server";
import {
  authKey,
  equal,
  session,
  cookieName,
  sameOrigin,
} from "@/lib/sales/auth";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const key = authKey();
  if (!key)
    return NextResponse.json(
      { error: "Sales access is not configured" },
      { status: 503 },
    );
  let token;
  try {
    const body = await request.text();
    if (body.length > 1024) throw Error();
    token = JSON.parse(body).key;
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (typeof token !== "string" || !equal(token, key))
    return NextResponse.json({ error: "Invalid access key" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, session(key), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(cookieName);
  return response;
}
