import { NextResponse } from "next/server";
import { parseBrief, qualify } from "@/lib/sales/model";
import { db } from "@/lib/sales/db";
import { createHmac } from "node:crypto";
import { sameOrigin } from "@/lib/sales/auth";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 24000)
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  let raw: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 24000)
      return NextResponse.json({ error: "Too large" }, { status: 413 });
    raw = JSON.parse(body);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  let brief;
  try {
    brief = parseBrief(raw);
    if (raw.companyFax) throw Error("spam");
  } catch {
    return NextResponse.json(
      { error: "Check your contact details" },
      { status: 400 },
    );
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key)
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503 },
    );
  // Vercel provides this header. Do not trust a user-supplied forwarded-for header.
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    "local";
  const fingerprint = createHmac("sha256", key).update(ip).digest("hex");
  try {
    const result = await db("rpc/capture_sales_lead", {
      method: "POST",
      body: JSON.stringify({
        p_brief: brief,
        p_score: qualify(brief).score,
        p_reasons: qualify(brief).reasons,
        p_fingerprint: fingerprint,
      }),
    });
    if (result.error === "rate_limit")
      return NextResponse.json(
        { error: "Too many requests. Please try later." },
        { status: 429 },
      );
    if (result.error)
      return NextResponse.json(
        { error: "Request identifier already used. Reload and try again." },
        { status: 409 },
      );
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Your request could not be saved. Please try again." },
      { status: 503 },
    );
  }
}
