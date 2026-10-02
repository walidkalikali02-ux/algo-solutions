import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const migration = readFileSync(
  new URL("../supabase/migrations/20261002171000_sales.sql", import.meta.url),
  "utf8",
);
const brief = {
  requestId: "73378888-aaaa-4bbb-8ccc-111111111111",
  goal: "presence",
  service: "website",
  locale: "ar",
  name: "Test",
  company: "Example",
  email: "test@example.com",
  phone: "",
  sector: "",
  role: "",
  website: "",
  note: "",
  budget: "",
  timeline: "",
  type: "",
  source: "website",
};
test("migration, capture retries, access control, update version and rate limit", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;",
    );
    await db.exec(migration);
    await db.exec(migration);
    await db.exec("set role service_role");
    const capture = async (b, f = "fingerprint") =>
      (
        await db.query(
          "select public.capture_sales_lead($1::jsonb,10,$2::jsonb,$3) as result",
          [JSON.stringify(b), '["company available"]', f],
        )
      ).rows[0].result;
    const first = await capture(brief),
      retry = await capture(brief);
    assert.equal(first.id, retry.id);
    assert.equal(
      (await db.query("select count(*)::int as n from sales_leads")).rows[0].n,
      1,
    );
    const conflict = await capture({
      ...brief,
      email: "different@example.com",
    });
    assert.equal(conflict.error, "conflict");
    assert.equal(
      (
        await db.query(
          "update sales_leads set stage=$1,version=2 where id=$2 and version=1 returning id",
          ["qualified", first.id],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update sales_leads set stage=$1 where id=$2 and version=1 returning id",
          ["lost", first.id],
        )
      ).rows.length,
      0,
    );
    for (let i = 2; i <= 10; i++) {
      const r = await capture({
        ...brief,
        requestId: `73378888-aaaa-4bbb-8ccc-${String(i).padStart(12, "0")}`,
      });
      assert.ok(r.id);
    }
    assert.equal(
      (
        await capture({
          ...brief,
          requestId: "73378888-aaaa-4bbb-8ccc-000000000011",
        })
      ).error,
      "rate_limit",
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      () => db.query("select * from sales_leads"),
      /permission denied/,
    );
    await assert.rejects(() => capture(brief), /permission denied/);
    await db.exec("reset role;set role authenticated");
    await assert.rejects(
      () => db.query("select * from sales_leads"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
