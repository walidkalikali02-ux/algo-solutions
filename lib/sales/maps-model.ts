export type MapsPlace = {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  mapsUrl: string;
  businessStatus: string;
  attributions: { name: string; url: string }[];
};
export type MapsProspect = {
  place_id: string;
  service: string;
  notes: string;
  status: "new" | "reviewing" | "contacted" | "not_fit";
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
};
export const mapsCities = {
  doha: "Doha",
  lusail: "Lusail",
  rayyan: "Al Rayyan",
  wakrah: "Al Wakrah",
  khor: "Al Khor",
} as const;
export function placeId(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{10,255}$/.test(value))
    throw Error("Invalid place reference");
  return value;
}
export function searchInput(raw: Record<string, unknown>) {
  if (
    typeof raw.sector !== "string" ||
    raw.sector.trim().length < 2 ||
    raw.sector.length > 100 ||
    typeof raw.city !== "string" ||
    !Object.hasOwn(mapsCities, raw.city)
  )
    throw Error("Choose a business sector and city");
  const locale = raw.locale === "en" ? "en" : "ar";
  return {
    sector: raw.sector.trim(),
    city: raw.city as keyof typeof mapsCities,
    locale,
  };
}
export function prospectInput(raw: Record<string, unknown>) {
  const id = placeId(raw.placeId);
  if (
    typeof raw.service !== "string" ||
    !["website", "system", "store", "social", "full", "unsure"].includes(
      raw.service,
    )
  )
    throw Error("Choose a service");
  if (typeof raw.notes !== "string" || raw.notes.length > 3000)
    throw Error("Invalid notes");
  const status = raw.status || "new";
  if (!["new", "reviewing", "contacted", "not_fit"].includes(String(status)))
    throw Error("Invalid status");
  let date: null | string = null;
  if (raw.nextActionAt) {
    if (
      typeof raw.nextActionAt !== "string" ||
      !Number.isFinite(Date.parse(raw.nextActionAt))
    )
      throw Error("Invalid date");
    date = new Date(raw.nextActionAt).toISOString();
  }
  // Google listing content is deliberately not copied into durable CRM fields.
  return {
    place_id: id,
    service: raw.service,
    notes: raw.notes.trim(),
    status: status as MapsProspect["status"],
    next_action_at: status === "not_fit" ? null : date,
    updated_at: new Date().toISOString(),
  };
}
export function safeLink(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function normalizePlace(raw: Record<string, any>): MapsPlace {
  return {
    id: placeId(raw.id),
    name: typeof raw.displayName?.text === "string" ? raw.displayName.text : "",
    address:
      typeof raw.formattedAddress === "string" ? raw.formattedAddress : "",
    phone:
      typeof raw.internationalPhoneNumber === "string"
        ? raw.internationalPhoneNumber
        : "",
    website: safeLink(raw.websiteUri),
    mapsUrl: safeLink(raw.googleMapsUri),
    businessStatus:
      typeof raw.businessStatus === "string" ? raw.businessStatus : "",
    attributions: Array.isArray(raw.attributions)
      ? raw.attributions.map((a: Record<string, unknown>) => ({
          name: typeof a.provider === "string" ? a.provider : "",
          url: safeLink(a.providerUri),
        }))
      : [],
  };
}
