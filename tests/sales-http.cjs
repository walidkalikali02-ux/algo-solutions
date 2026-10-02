const { createServer } = require("node:http");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const root = process.cwd();
const { PGlite } = require(root + "/node_modules/@electric-sql/pglite");
(async () => {
  const pg = new PGlite();
  await pg.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;",
  );
  await pg.exec(
    fs.readFileSync(
      root + "/supabase/migrations/20261002171000_sales.sql",
      "utf8",
    ),
  );
  const server = createServer(async (req, res) => {
    try {
      let data = "";
      for await (const chunk of req) data += chunk;
      if (req.headers.apikey !== "test-service-key") {
        res.writeHead(403);
        res.end("{}");
        return;
      }
      let output;
      if (req.url === "/rest/v1/rpc/capture_sales_lead") {
        const p = JSON.parse(data);
        output = (
          await pg.query(
            "select capture_sales_lead($1::jsonb,$2,$3::jsonb,$4) as data",
            [
              JSON.stringify(p.p_brief),
              p.p_score,
              JSON.stringify(p.p_reasons),
              p.p_fingerprint,
            ],
          )
        ).rows[0].data;
      } else if (req.method === "GET") {
        output = (
          await pg.query(
            "select row_to_json(l) as data from sales_leads l order by created_at desc",
          )
        ).rows.map((r) => r.data);
      } else if (req.method === "PATCH") {
        const u = new URL(req.url, "http://localhost"),
          p = JSON.parse(data),
          id = u.searchParams.get("id").slice(3),
          version = Number(u.searchParams.get("version").slice(3));
        output = (
          await pg.query(
            "update sales_leads set stage=$1,value=$2,cost=$3,loss_reason=$4,sales_note=$5,next_action_at=$6,version=$7,updated_at=$8 where id=$9 and version=$10 returning row_to_json(sales_leads) as data",
            [
              p.stage,
              p.value,
              p.cost,
              p.loss_reason,
              p.sales_note,
              p.next_action_at,
              p.version,
              p.updated_at,
              id,
              version,
            ],
          )
        ).rows.map((r) => r.data);
      } else throw Error("unexpected path");
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(output));
    } catch (e) {
      console.error(e.message);
      res.writeHead(500);
      res.end("{}");
    }
  });
  await new Promise((r) => server.listen(4010, "127.0.0.1", r));
  const key = "test-admin-key-" + "1234567890".repeat(5);
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3017",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        SUPABASE_URL: "http://127.0.0.1:4010",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
        SALES_ADMIN_KEY: key,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (d) =>
    fs.appendFileSync("/tmp/algo-sales-dev.log", d),
  );
  child.stderr.on("data", (d) =>
    fs.appendFileSync("/tmp/algo-sales-dev.log", d),
  );
  try {
    for (let i = 0; i < 90; i++) {
      try {
        if ((await fetch("http://127.0.0.1:3017/ar/start-project")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    const origin = "http://127.0.0.1:3017";
    const request = async (path, method = "GET", body, cookie) =>
      fetch(origin + path, {
        method,
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    const brief = {
      requestId: "73378888-aaaa-4bbb-8ccc-111111111111",
      locale: "ar",
      goal: "operations",
      service: "system",
      name: "Integration Test",
      company: "Private Example",
      email: "example@example.com",
      phone: "",
      role: "decision_maker",
      note: "We need inventory tracking and integration with our orders.",
      budget: "5,000–10,000 QAR",
    };
    const saved = await request("/api/leads", "POST", brief);
    assert.equal(saved.status, 201);
    const receipt = await saved.json();
    assert.ok(receipt.id);
    const retry = await request("/api/leads", "POST", brief);
    assert.equal((await retry.json()).id, receipt.id);
    assert.equal(
      (await pg.query("select count(*)::int as n from sales_leads")).rows[0].n,
      1,
    );
    const publicPage = await (await request("/ar/sales")).text();
    assert.ok(publicPage.includes("مفتاح الدخول"));
    assert.ok(!publicPage.includes("Private Example"));
    assert.equal(
      (await request("/api/sales/leads/" + receipt.id, "PATCH", {})).status,
      403,
    );
    assert.equal(
      (await request("/api/sales/login", "POST", { key: "wrong" })).status,
      401,
    );
    const login = await request("/api/sales/login", "POST", { key });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert.ok(login.headers.get("set-cookie").includes("HttpOnly"));
    const privatePage = await (
      await request("/ar/sales", "GET", null, cookie)
    ).text();
    assert.ok(privatePage.includes("Private Example"));
    const update = {
      stage: "won",
      value: 5000,
      cost: 2000,
      loss_reason: "",
      sales_note: "Delivered",
      next_action_at: null,
      version: 1,
    };
    assert.equal(
      (await request("/api/sales/leads/" + receipt.id, "PATCH", update, cookie))
        .status,
      200,
    );
    const deal = (await pg.query("select * from sales_leads")).rows[0];
    assert.equal(deal.stage, "won");
    assert.equal(Number(deal.value), 5000);
    assert.equal(deal.next_action_at, null);
    assert.equal(
      (await request("/api/sales/leads/" + receipt.id, "PATCH", update, cookie))
        .status,
      409,
    );
    const cross = await fetch(origin + "/api/leads", {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(brief),
    });
    assert.equal(cross.status, 403);
    const invalid = await request("/api/leads", "POST", {
      ...brief,
      requestId: "nope",
    });
    assert.equal(invalid.status, 400);
    assert.equal(
      (await request("/api/sales/login", "DELETE", null, cookie)).status,
      200,
    );
    console.log(
      "PASS: real Next.js HTTP → PostgreSQL capture/retry → protected login/page → won value/cost update; concurrent update conflict; CSRF and invalid input rejection; logout.",
    );
  } finally {
    child.kill("SIGTERM");
    await new Promise((r) => server.close(r));
    await pg.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
