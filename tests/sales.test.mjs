import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
const source = ts.transpileModule(
  readFileSync(new URL("../lib/sales/model.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { parseBrief, qualify, metrics, draft, prep } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const raw = {
  requestId: "73378888-aaaa-4bbb-8ccc-111111111111",
  goal: "operations",
  service: "system",
  name: "Test",
  company: "Example",
  email: "test@example.com",
  phone: "+97412345678",
  role: "decision_maker",
  note: "We need inventory integration and automated order tracking.",
  budget: "5,000–10,000 QAR",
  timeline: "Within 30 days",
  locale: "ar",
};
test("invalid contact and reused foreign identifiers are rejected", () => {
  assert.throws(() => parseBrief({ ...raw, email: "", phone: "" }));
  assert.throws(() => parseBrief({ ...raw, email: "invalid" }));
  assert.throws(() => parseBrief({ ...raw, requestId: "broken" }));
  assert.throws(() => parseBrief({ ...raw, website: "javascript:alert(1)" }));
});
test("qualification does not infer decision power or budget", () => {
  const full = parseBrief(raw);
  assert.equal(qualify(full).score, 100);
  const sparse = parseBrief({
    ...raw,
    company: "",
    role: "",
    note: "",
    budget: "",
    timeline: "",
    phone: "",
    service: "",
  });
  assert.equal(qualify(sparse).score, 0);
});
test("profit excludes contracts without costs and win rate excludes open deals", () => {
  const r = metrics([
    { stage: "won", value: 1000, cost: 500 },
    { stage: "won", value: 2000, cost: null },
    { stage: "lost", value: 900, cost: 400 },
    { stage: "proposal", value: 10000, cost: null },
  ]);
  assert.equal(r.revenue, 3000);
  assert.equal(r.profit, 500);
  assert.equal(r.uncosted, 1);
  assert.equal(r.winRate, 67);
  assert.equal(r.open, 1);
  assert.equal(metrics([]).winRate, null);
  assert.equal(
    metrics([{ stage: "won", value: 100, cost: null }]).profit,
    null,
  );
});
test("meeting questions and follow-up match the service and proposal stage", () => {
  const b = parseBrief(raw);
  assert.ok(prep(b).questions.some((q) => q.includes("الأنظمة")));
  assert.ok(draft(b, "proposal").includes("عرض السعر"));
  assert.ok(draft({ ...b, locale: "en" }, "new").startsWith("Hello Test"));
});
