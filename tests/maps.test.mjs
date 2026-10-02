import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
const compile = (s) =>
  ts.transpileModule(s, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const url = (s) =>
  "data:text/javascript;base64," + Buffer.from(s).toString("base64");
const modelUrl = url(
  compile(
    readFileSync(
      new URL("../lib/sales/maps-model.ts", import.meta.url),
      "utf8",
    ),
  ),
);
const { searchInput, prospectInput, normalizePlace } = await import(modelUrl);
test("prospects persist only references and user workflow data", () => {
  const p = prospectInput({
    placeId: "ChIJ_Test_Place_123",
    service: "website",
    notes: "Ask about requirements",
    company: "Google listing name",
    phone: "+97412345678",
    website: "https://example.com",
  });
  assert.equal(p.place_id, "ChIJ_Test_Place_123");
  assert.equal(p.company, undefined);
  assert.equal(p.phone, undefined);
  assert.equal(p.website, undefined);
  assert.throws(() =>
    prospectInput({ placeId: "bad", service: "website", notes: "" }),
  );
  assert.throws(() => searchInput({ sector: "clinics", city: "invalid" }));
  assert.equal(
    normalizePlace({ id: p.place_id, websiteUri: "javascript:alert(1)" })
      .website,
    "",
  );
});
test("Google transport uses masks, signed pagination and quota before requests", async () => {
  const authUrl = url(
    'export const authKey=()=>"test-key-at-least-thirty-two-characters";export const equal=(a,b)=>a===b;',
  );
  const dbUrl = url(
    "export async function db(){globalThis.__mapsReservations++;return globalThis.__mapsAllowed;}",
  );
  const source = compile(
    readFileSync(new URL("../lib/sales/maps.ts", import.meta.url), "utf8"),
  )
    .replace('import "server-only";', "")
    .replace('from "./auth"', `from "${authUrl}"`)
    .replace('from "./db"', `from "${dbUrl}"`)
    .replace('from "./maps-model"', `from "${modelUrl}"`);
  const { searchPlaces, placeDetails } = await import(url(source));
  const previous = globalThis.fetch;
  const oldKey = process.env.GOOGLE_PLACES_API_KEY;
  const oldLimit = process.env.GOOGLE_PLACES_DAILY_LIMIT;
  process.env.GOOGLE_PLACES_API_KEY = "fixture-google-key";
  globalThis.__mapsAllowed = true;
  globalThis.__mapsReservations = 0;
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return new Response(
      JSON.stringify(
        path.includes("searchText")
          ? {
              places: [
                {
                  id: "ChIJ_Test_Place_123",
                  displayName: { text: "Fixture business" },
                  websiteUri: "https://example.com",
                },
              ],
              nextPageToken: "fixture-next-page",
            }
          : {
              id: "ChIJ_Test_Place_123",
              displayName: { text: "Fixture business" },
            },
      ),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const search = { sector: "Dental clinics", city: "doha", locale: "en" };
    const first = await searchPlaces(search);
    assert.equal(first.places[0].name, "Fixture business");
    const input = JSON.parse(calls[0].options.body);
    assert.equal(input.textQuery, "Dental clinics in Doha, Qatar");
    assert.equal(input.pageSize, 10);
    assert.ok(
      calls[0].options.headers["X-Goog-FieldMask"].includes(
        "places.websiteUri",
      ),
    );
    assert.equal(calls[0].options.cache, "no-store");
    assert.ok(!calls[0].options.headers["X-Goog-FieldMask"].includes("*"));
    await searchPlaces({ ...search, cursor: first.cursor });
    assert.equal(
      JSON.parse(calls[1].options.body).pageToken,
      "fixture-next-page",
    );
    await assert.rejects(
      () => searchPlaces({ ...search, city: "lusail", cursor: first.cursor }),
      /expired/,
    );
    await assert.rejects(
      () => searchPlaces({ ...search, cursor: first.cursor + "corrupt" }),
      /expired/,
    );
    await placeDetails("ChIJ_Test_Place_123", "ar");
    assert.ok(calls[2].path.includes("languageCode=ar"));
    assert.equal(globalThis.__mapsReservations, 3);
    globalThis.__mapsAllowed = false;
    await assert.rejects(() => searchPlaces(search), /limit/);
    assert.equal(calls.length, 3);
    delete process.env.GOOGLE_PLACES_API_KEY;
    await assert.rejects(() => searchPlaces(search), /not connected/);
    assert.equal(calls.length, 3);
    process.env.GOOGLE_PLACES_API_KEY = "fixture-google-key";
    globalThis.__mapsAllowed = true;
    globalThis.fetch = async () => new Response("{}", { status: 403 });
    await assert.rejects(() => searchPlaces(search), /access was denied/);
  } finally {
    globalThis.fetch = previous;
    if (oldKey === undefined) delete process.env.GOOGLE_PLACES_API_KEY;
    else process.env.GOOGLE_PLACES_API_KEY = oldKey;
    if (oldLimit === undefined) delete process.env.GOOGLE_PLACES_DAILY_LIMIT;
    else process.env.GOOGLE_PLACES_DAILY_LIMIT = oldLimit;
    delete globalThis.__mapsAllowed;
    delete globalThis.__mapsReservations;
  }
});
