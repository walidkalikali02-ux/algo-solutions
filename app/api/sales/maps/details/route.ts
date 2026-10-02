import { NextResponse } from "next/server";
import { authorized, sameOrigin } from "@/lib/sales/auth";
import { MapsError, placeDetails } from "@/lib/sales/maps";
export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await authorized()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let input;
  try {
    const body = await request.text();
    if (body.length > 1000) throw Error();
    input = JSON.parse(body);
    if (!input || typeof input !== "object") throw Error();
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      { place: await placeDetails(input.placeId, input.locale) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Details unavailable" },
      {
        status: error instanceof MapsError ? error.status : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
