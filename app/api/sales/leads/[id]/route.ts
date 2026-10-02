import { NextResponse } from "next/server";
import { authorized, sameOrigin } from "@/lib/sales/auth";
import { db } from "@/lib/sales/db";
import { stages } from "@/lib/sales/model";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request) || !(await authorized()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  let body;
  try {
    const text = await request.text();
    if (text.length > 10000) throw Error();
    body = JSON.parse(text);
    if (!body || typeof body !== "object") throw Error();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (
    !stages.includes(body.stage) ||
    !Number.isInteger(body.version) ||
    body.version < 1
  )
    return NextResponse.json(
      { error: "Invalid stage/version" },
      { status: 400 },
    );
  for (const field of ["value", "cost"])
    if (
      body[field] !== null &&
      (typeof body[field] !== "number" ||
        !Number.isFinite(body[field]) ||
        body[field] < 0 ||
        body[field] > 100000000)
    )
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (body.stage === "won" && body.value === null)
    return NextResponse.json(
      { error: "Won deals require a contract value" },
      { status: 400 },
    );
  if (
    typeof body.loss_reason !== "string" ||
    typeof body.sales_note !== "string" ||
    body.loss_reason.length > 500 ||
    body.sales_note.length > 3000
  )
    return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
  if (body.stage === "lost" && !body.loss_reason.trim())
    return NextResponse.json(
      { error: "Record the reason for loss" },
      { status: 400 },
    );
  if (
    body.next_action_at !== null &&
    (typeof body.next_action_at !== "string" ||
      !Number.isFinite(Date.parse(body.next_action_at)))
  )
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const update = {
    stage: body.stage,
    value: body.value,
    cost: body.cost,
    loss_reason: body.loss_reason.trim(),
    sales_note: body.sales_note.trim(),
    next_action_at: ["won", "lost"].includes(body.stage)
      ? null
      : body.next_action_at,
    version: body.version + 1,
    updated_at: new Date().toISOString(),
  };
  try {
    const leads = await db(
      `sales_leads?id=eq.${id}&version=eq.${body.version}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(update),
      },
    );
    if (!leads.length)
      return NextResponse.json(
        { error: "This deal changed. Refresh before saving." },
        { status: 409 },
      );
    return NextResponse.json({ lead: leads[0] });
  } catch {
    return NextResponse.json(
      { error: "Could not save changes" },
      { status: 503 },
    );
  }
}
