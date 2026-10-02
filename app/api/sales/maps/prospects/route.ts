import { NextResponse } from "next/server";
import { authorized, sameOrigin } from "@/lib/sales/auth";
import { db } from "@/lib/sales/db";
import { prospectInput } from "@/lib/sales/maps-model";
export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await authorized()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let input;
  try {
    const body = await request.text();
    if (body.length > 8000) throw Error();
    input = prospectInput(JSON.parse(body));
  } catch {
    return NextResponse.json(
      { error: "Check the service, notes and follow-up date." },
      { status: 400 },
    );
  }
  try {
    const result = await db("sales_maps_prospects?on_conflict=place_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(input),
    });
    return NextResponse.json(
      { saved: true, duplicate: result.length === 0, placeId: input.place_id },
      { status: result.length ? 201 : 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not save the prospect. Check the database connection." },
      { status: 503 },
    );
  }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request) || !(await authorized()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let input;
  try {
    const body = await request.text();
    if (body.length > 8000) throw Error();
    input = prospectInput(JSON.parse(body));
  } catch {
    return NextResponse.json(
      { error: "Invalid notes or follow-up date." },
      { status: 400 },
    );
  }
  try {
    const result = await db(
      `sales_maps_prospects?place_id=eq.${encodeURIComponent(input.place_id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(input),
      },
    );
    if (!result.length)
      return NextResponse.json(
        { error: "Prospect not found." },
        { status: 404 },
      );
    return NextResponse.json({ prospect: result[0] });
  } catch {
    return NextResponse.json(
      { error: "Could not update the prospect." },
      { status: 503 },
    );
  }
}
