import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
test("Maps references are unique, private and limited by atomic daily usage", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;",
    );
    const migration = readFileSync(
      new URL(
        "../supabase/migrations/20261002180000_google_maps.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    await db.exec("set role service_role");
    await db.query(
      "insert into sales_maps_prospects(place_id,service,notes) values('ChIJ_Test_Place_123','website','Review scope')",
    );
    await db.query(
      "insert into sales_maps_prospects(place_id,service,notes) values('ChIJ_Test_Place_123','website','Overwrite') on conflict(place_id) do nothing",
    );
    assert.equal(
      (await db.query("select notes from sales_maps_prospects")).rows[0].notes,
      "Review scope",
    );
    const columns = (
      await db.query(
        "select column_name from information_schema.columns where table_name='sales_maps_prospects'",
      )
    ).rows.map((r) => r.column_name);
    assert.ok(
      !columns.includes("phone") &&
        !columns.includes("company") &&
        !columns.includes("website"),
    );
    const reserve = async () =>
      (await db.query("select consume_sales_maps_quota(2) as allowed")).rows[0]
        .allowed;
    assert.equal(await reserve(), true);
    assert.equal(await reserve(), true);
    assert.equal(await reserve(), false);
    await db.exec("reset role;set role anon");
    await assert.rejects(
      () => db.query("select * from sales_maps_prospects"),
      /permission denied/,
    );
    await assert.rejects(reserve, /permission denied/);
    await db.exec("reset role;set role authenticated");
    await assert.rejects(
      () => db.query("select * from sales_maps_prospects"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
