"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Lead,
  Stage,
  stages,
  metrics,
  prep,
  draft,
  serviceNames,
} from "@/lib/sales/model";
const labels: Record<Stage, string> = {
  new: "جديد",
  qualified: "مؤهل",
  meeting: "اجتماع",
  proposal: "عرض سعر",
  negotiation: "تفاوض",
  won: "فوز",
  lost: "خسارة",
};
function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export default function SalesDashboard({
  initial,
  ar,
  capped,
}: {
  initial: Lead[];
  ar: boolean;
  capped: boolean;
}) {
  const [leads, setLeads] = useState(initial),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState({
    stage: "new" as Stage,
    value: "",
    cost: "",
    loss_reason: "",
    sales_note: "",
    next_action_at: "",
  });
  const [now] = useState(() => Date.now());
  const m = metrics(leads),
    active = leads.find((l) => l.id === selected),
    brief = active ? prep(active) : null;
  const money = (n: number) =>
    `${n.toLocaleString(ar ? "ar-QA" : "en-QA")} ${ar ? "ر.ق" : "QAR"}`;
  const date = (s: string | null) =>
    s
      ? new Date(s).toLocaleString(ar ? "ar-QA" : "en-QA", {
          timeZone: "Asia/Qatar",
        })
      : ar
        ? "غير محدد"
        : "Not set";
  const due = (l: Lead) =>
    !["won", "lost"].includes(l.stage) &&
    !!l.next_action_at &&
    Date.parse(l.next_action_at) <= now;
  const rows = leads
    .filter(
      (l) =>
        (filter === "all" ||
          (filter === "due" && due(l)) ||
          l.stage === filter) &&
        `${l.name} ${l.company} ${l.email} ${l.phone}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(due(b)) - Number(due(a)) ||
        b.score - a.score ||
        Date.parse(a.created_at) - Date.parse(b.created_at),
    );
  function choose(l: Lead) {
    setSelected(l.id);
    setFeedback("");
    setEdit({
      stage: l.stage,
      value: l.value === null ? "" : String(l.value),
      cost: l.cost === null ? "" : String(l.cost),
      loss_reason: l.loss_reason,
      sales_note: l.sales_note,
      next_action_at: localDate(l.next_action_at),
    });
  }
  return (
    <div className="sales">
      <div className="salesHead">
        <h1>{ar ? "المبيعات" : "Sales"}</h1>
        <div className="actions">
          <Link
            className="btn primary"
            href={`/${ar ? "ar" : "en"}/sales/maps`}
          >
            {ar ? "البحث عن شركات" : "Find businesses"}
          </Link>
          <button className="btn" onClick={() => location.reload()}>
            {ar ? "تحديث" : "Refresh"}
          </button>
          <button
            className="btn"
            onClick={async () => {
              const r = await fetch("/api/sales/login", { method: "DELETE" });
              if (r.ok) location.reload();
            }}
          >
            {ar ? "خروج" : "Sign out"}
          </button>
        </div>
      </div>
      <div className="salesStats">
        {[
          [ar ? "الفرص المفتوحة" : "Open deals", m.open],
          [ar ? "متابعة مستحقة" : "Follow-ups due", leads.filter(due).length],
          [
            ar ? "نسبة الفوز" : "Win rate",
            m.winRate === null ? "—" : `${m.winRate}%`,
          ],
          [ar ? "قيمة العقود الرابحة" : "Won contract value", money(m.revenue)],
          [
            ar ? "هامش العقود المسجلة" : "Recorded contract margin",
            m.profit === null ? "—" : money(m.profit),
          ],
        ].map(([label, value]) => (
          <div className="summaryCard" key={label}>
            <div className="mini">{label}</div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p className="mini">
        {ar
          ? `المبالغ بالريال القطري. هامش العقود محسوب فقط للعقود ذات قيمة وتكلفة مسجلتين؛ ليس صافي الربح المحاسبي. ${m.uncosted} صفقة رابحة بلا تكلفة مسجلة.`
          : `Amounts in QAR. Margin includes only contracts with recorded value and cost; it is not accounting net profit. ${m.uncosted} won deals have no recorded cost.`}
      </p>
      {capped && (
        <p role="status">
          {ar
            ? "تظهر أحدث 5000 فرصة فقط؛ الإحصاءات تخص هذه المجموعة."
            : "Only the latest 5,000 deals are shown; metrics cover this subset."}
        </p>
      )}
      <div className="salesToolbar">
        <label>
          {ar ? "بحث" : "Search"}
          <input
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              ar ? "اسم، شركة، بريد أو هاتف" : "Name, company, email or phone"
            }
          />
        </label>
        <label>
          {ar ? "عرض" : "View"}
          <select
            className="field"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">{ar ? "كل الفرص" : "All deals"}</option>
            <option value="due">
              {ar ? "المتابعات المستحقة" : "Due follow-ups"}
            </option>
            {stages.map((s) => (
              <option value={s} key={s}>
                {ar ? labels[s] : s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="salesGrid">
        <div>
          <div className="salesTable">
            <table>
              <thead>
                <tr>
                  {[
                    ar ? "العميل" : "Client",
                    ar ? "الخدمة" : "Service",
                    ar ? "المرحلة" : "Stage",
                    ar ? "الأولوية" : "Score",
                    ar ? "المتابعة بتوقيت قطر" : "Follow-up (Qatar)",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr
                    key={l.id}
                    className={selected === l.id ? "selected" : ""}
                  >
                    <td>
                      <button className="salesLink" onClick={() => choose(l)}>
                        {l.company || l.name}
                      </button>
                      <div className="mini">{l.name}</div>
                    </td>
                    <td>
                      {ar
                        ? serviceNames[l.service] || "اكتشاف"
                        : l.service || "Discovery"}
                    </td>
                    <td>{ar ? labels[l.stage] : l.stage}</td>
                    <td>{l.score}/100</td>
                    <td>
                      {date(l.next_action_at)}
                      {due(l) && <b className="due">{ar ? "مستحقة" : "Due"}</b>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <p>
              {ar
                ? "لا توجد فرص مطابقة. الطلبات المحفوظة من نموذج الموقع ستظهر هنا."
                : "No matching deals. Saved website requests will appear here."}
            </p>
          )}
          <div className="summaryCard">
            <h2>{ar ? "أسباب خسارة الصفقات" : "Loss reasons"}</h2>
            {leads.filter((l) => l.stage === "lost").length === 0 ? (
              <p>
                {ar ? "لا توجد صفقات خاسرة مسجلة." : "No lost deals recorded."}
              </p>
            ) : (
              Object.entries(
                leads
                  .filter((l) => l.stage === "lost")
                  .reduce<Record<string, number>>((s, l) => {
                    const k = l.loss_reason || "غير مسجل";
                    s[k] = (s[k] || 0) + 1;
                    return s;
                  }, {}),
              )
                .sort((a, b) => b[1] - a[1])
                .map(([reason, count]) => (
                  <p key={reason}>
                    {reason}: {count}
                  </p>
                ))
            )}
          </div>
        </div>
        <aside>
          {active && brief ? (
            <div className="summaryCard salesDetails" key={active.id}>
              <h2>{active.company || active.name}</h2>
              <p>
                {active.email}
                <br />
                {active.phone}
              </p>
              {active.website && (
                <a
                  href={active.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ar ? "موقع الشركة" : "Company website"}
                </a>
              )}
              <p>
                {ar ? "المصدر" : "Source"}: {active.source || "Website"}
                <br />
                {ar ? "الميزانية" : "Budget"}: {active.budget || "—"}
                <br />
                {ar ? "الموعد" : "Timeline"}: {active.timeline || "—"}
              </p>
              <h3>{ar ? "سبب الأولوية" : "Priority reasons"}</h3>
              <ul>
                {active.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="mini">
                {ar
                  ? "درجة تنظيمية تعتمد على اكتمال بيانات الطلب، وليست احتمال فوز."
                  : "A triage score based on brief completeness, not a win probability."}
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setFeedback("");
                  try {
                    const r = await fetch(`/api/sales/leads/${active.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...edit,
                        version: active.version,
                        value: edit.value === "" ? null : Number(edit.value),
                        cost: edit.cost === "" ? null : Number(edit.cost),
                        next_action_at: edit.next_action_at
                          ? new Date(edit.next_action_at).toISOString()
                          : null,
                      }),
                    });
                    const data = await r.json();
                    if (!r.ok) throw Error(data.error);
                    setLeads((x) =>
                      x.map((l) => (l.id === active.id ? data.lead : l)),
                    );
                    setFeedback(ar ? "تم الحفظ" : "Saved");
                  } catch (err) {
                    setFeedback(err instanceof Error ? err.message : "Failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  {ar ? "مرحلة الصفقة" : "Deal stage"}
                  <select
                    className="field"
                    value={edit.stage}
                    onChange={(e) => {
                      const stage = e.target.value as Stage;
                      setEdit({
                        ...edit,
                        stage,
                        next_action_at: ["won", "lost"].includes(stage)
                          ? ""
                          : edit.next_action_at ||
                            localDate(
                              new Date(Date.now() + 2 * 86400000).toISOString(),
                            ),
                      });
                    }}
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>
                        {ar ? labels[s] : s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {ar
                    ? "قيمة العقد / الفرصة بالريال"
                    : "Contract / deal value (QAR)"}
                  <input
                    className="field"
                    type="number"
                    min="0"
                    max="100000000"
                    step="0.01"
                    required={edit.stage === "won"}
                    value={edit.value}
                    onChange={(e) =>
                      setEdit({ ...edit, value: e.target.value })
                    }
                  />
                </label>
                <label>
                  {ar ? "تكلفة التنفيذ بالريال" : "Delivery cost (QAR)"}
                  <input
                    className="field"
                    type="number"
                    min="0"
                    max="100000000"
                    step="0.01"
                    value={edit.cost}
                    onChange={(e) => setEdit({ ...edit, cost: e.target.value })}
                  />
                </label>
                {!["won", "lost"].includes(edit.stage) && (
                  <label>
                    {ar
                      ? "المتابعة التالية — بتوقيت جهازك"
                      : "Next follow-up — device timezone"}
                    <input
                      type="datetime-local"
                      className="field"
                      value={edit.next_action_at}
                      onChange={(e) =>
                        setEdit({ ...edit, next_action_at: e.target.value })
                      }
                    />
                  </label>
                )}
                {edit.stage === "lost" && (
                  <label>
                    {ar ? "سبب الخسارة" : "Reason for loss"}
                    <input
                      required
                      className="field"
                      maxLength={500}
                      value={edit.loss_reason}
                      onChange={(e) =>
                        setEdit({ ...edit, loss_reason: e.target.value })
                      }
                    />
                  </label>
                )}
                <label>
                  {ar ? "ملاحظات وخطوة تالية" : "Notes and next action"}
                  <textarea
                    className="field"
                    rows={3}
                    maxLength={3000}
                    value={edit.sales_note}
                    onChange={(e) =>
                      setEdit({ ...edit, sales_note: e.target.value })
                    }
                  />
                </label>
                <p role="status">{feedback}</p>
                <button disabled={busy} className="btn primary">
                  {busy
                    ? ar
                      ? "جارٍ الحفظ…"
                      : "Saving…"
                    : ar
                      ? "حفظ"
                      : "Save"}
                </button>
              </form>
              <h3>{ar ? "التحضير للاجتماع" : "Meeting preparation"}</h3>
              <p>{brief.summary}</p>
              <ul>
                {brief.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <h3>{ar ? "نقاط مسودة النطاق" : "Scope draft points"}</h3>
              <ul>
                {brief.scope.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <h3>{ar ? "مسودة متابعة" : "Follow-up draft"}</h3>
              <p className="draftText">{draft(active, active.stage)}</p>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      draft(active, active.stage),
                    );
                    setFeedback(ar ? "تم نسخ المسودة" : "Draft copied");
                  } catch {
                    setFeedback(
                      ar
                        ? "تعذر النسخ؛ حدد النص وانسخه."
                        : "Unable to copy; select and copy the text.",
                    );
                  }
                }}
              >
                {ar ? "نسخ المسودة" : "Copy draft"}
              </button>
              {active.stage === "won" && (
                <p>
                  {ar
                    ? "بعد تسليم المشروع: ناقش ملاءمة Algo Care للمتابعة والتحديثات البسيطة بسعر 100 ريال شهريًا."
                    : "After delivery, discuss whether Algo Care fits the client’s support needs at QAR 100/month."}
                </p>
              )}
            </div>
          ) : (
            <div className="summaryCard">
              {ar
                ? "اختر عميلًا لعرض تفاصيله وإدارة الصفقة."
                : "Select a client to view details and manage the deal."}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
