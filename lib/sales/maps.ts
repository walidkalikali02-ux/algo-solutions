import "server-only";
import { createHmac } from "node:crypto";
import { authKey, equal } from "./auth";
import { db } from "./db";
import { mapsCities, normalizePlace, placeId, searchInput } from "./maps-model";
export class MapsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const fields =
  "id,displayName,formattedAddress,internationalPhoneNumber,websiteUri,googleMapsUri,businessStatus,attributions";
function key() {
  const value = process.env.GOOGLE_PLACES_API_KEY;
  if (!value)
    throw new MapsError(
      "Google Maps is not connected. Configure GOOGLE_PLACES_API_KEY.",
      503,
    );
  return value;
}
async function reserve() {
  const configured = Number(process.env.GOOGLE_PLACES_DAILY_LIMIT || 50);
  const limit =
    Number.isInteger(configured) && configured >= 1 && configured <= 500
      ? configured
      : 50;
  try {
    const allowed = await db("rpc/consume_sales_maps_quota", {
      method: "POST",
      body: JSON.stringify({ p_limit: limit }),
    });
    if (allowed !== true)
      throw new MapsError("Daily Google Maps request limit reached.", 429);
  } catch (e) {
    if (e instanceof MapsError) throw e;
    throw new MapsError(
      "Google Maps usage control is unavailable. Check the database migration.",
      503,
    );
  }
}
async function google(path: string, init: RequestInit, mask: string) {
  const apiKey = key();
  await reserve();
  let response;
  try {
    response = await fetch(`https://places.googleapis.com/v1/${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": mask,
      },
    });
  } catch {
    throw new MapsError(
      "Google Maps could not be reached. Try again later.",
      502,
    );
  }
  if (!response.ok) {
    if (response.status === 403)
      throw new MapsError(
        "Google Places access was denied. Check API activation, billing, and key restrictions.",
        503,
      );
    if (response.status === 429)
      throw new MapsError("Google Places quota reached. Try later.", 429);
    throw new MapsError(
      "Google Maps lookup failed. Try again or change the search.",
      502,
    );
  }
  return response.json();
}
function sign(value: string) {
  const secret = authKey();
  if (!secret) throw new MapsError("Sales access is not configured.", 503);
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function searchPlaces(raw: Record<string, unknown>) {
  const input = searchInput(raw);
  let pageToken = "";
  if (raw.cursor) {
    if (typeof raw.cursor !== "string" || raw.cursor.length > 12000)
      throw new MapsError("Invalid page cursor.", 400);
    try {
      const [payload, signature] = raw.cursor.split(".");
      if (!signature || !equal(sign(payload), signature)) throw Error();
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
      if (
        parsed.expires < Date.now() ||
        parsed.sector !== input.sector ||
        parsed.city !== input.city ||
        parsed.locale !== input.locale ||
        typeof parsed.token !== "string"
      )
        throw Error();
      pageToken = parsed.token;
    } catch {
      throw new MapsError("Search page expired. Run the search again.", 400);
    }
  }
  const result = await google(
    "places:searchText",
    {
      method: "POST",
      body: JSON.stringify({
        textQuery: `${input.sector} in ${mapsCities[input.city]}, Qatar`,
        pageSize: 10,
        languageCode: input.locale,
        regionCode: "QA",
        ...(pageToken ? { pageToken } : {}),
      }),
    },
    fields
      .split(",")
      .map((f) => `places.${f}`)
      .join(",") + ",nextPageToken",
  );
  let cursor = "";
  if (result.nextPageToken) {
    const payload = Buffer.from(
      JSON.stringify({
        ...input,
        token: result.nextPageToken,
        expires: Date.now() + 15 * 60000,
      }),
    ).toString("base64url");
    cursor = `${payload}.${sign(payload)}`;
  }
  return { places: (result.places || []).map(normalizePlace), cursor };
}
export async function placeDetails(id: unknown, locale: string) {
  const valid = placeId(id);
  return normalizePlace(
    await google(
      `places/${encodeURIComponent(valid)}?languageCode=${locale === "en" ? "en" : "ar"}`,
      { method: "GET" },
      fields,
    ),
  );
}
