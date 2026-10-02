"use client";
import { useState } from "react";
import Link from "next/link";
import { MapsPlace, MapsProspect, mapsCities } from "@/lib/sales/maps-model";
import { serviceNames } from "@/lib/sales/model";
const cityLabels: Record<string, string> = {
  doha: "الدوحة",
  lusail: "لوسيل",
  rayyan: "الريان",
  wakrah: "الوكرة",
  khor: "الخور",
};
const statusLabels: Record<string, string> = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  contacted: "تم التواصل",
  not_fit: "غير مناسب",
};
function dateInput(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export default function MapsProspector({
  ar,
  initial,
  connected,
  storageReady,
  capped,
}: {
  ar: boolean;
  initial: MapsProspect[];
  connected: boolean;
  storageReady: boolean;
  capped: boolean;
}) {
  const [prospects, setProspects] = useState(initial),
    [places, setPlaces] = useState<MapsPlace[]>([]),
    [city, setCity] = useState("doha"),
    [sector, setSector] = useState(
      ar ? "شركات مقاولات" : "Construction companies",
    ),
    [cursor, setCursor] = useState(""),
    [searched, setSearched] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [active, setActive] = useState<MapsPlace | null>(null),
    [draft, setDraft] = useState({
      service: "website",
      notes: "",
      status: "new",
      nextActionAt: "",
    }),
    [missingWebsite, setMissingWebsite] = useState(false);
  const locale = ar ? "ar" : "en";
  const [lastSearch, setLastSearch] = useState({ sector: "", city: "" });
  function apiError(message: string) {
    if (!ar) return message;
    if (message.includes("limit") || message.includes("quota"))
      return "تم بلوغ حد طلبات Google Maps. حاول لاحقًا.";
    if (message.includes("not connected"))
      return "لم يتم إعداد اتصال Google Maps بعد.";
    if (message.includes("usage control"))
      return "تعذر التحقق من حد الاستخدام. راجع اتصال قاعدة البيانات.";
    if (message.includes("access was denied"))
      return "تعذر الوصول إلى Google Maps. راجع تفعيل الخدمة وإعدادات الوصول والفوترة.";
    return "تعذر إكمال العملية. راجع الاتصال وحاول مرة أخرى.";
  }
  async function call(path: string, body: unknown, method = "POST") {
    const r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw Error(apiError(data.error || "Request failed"));
    return data;
  }
  async function search(more = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const current = more ? lastSearch : { sector, city };
      const result = await call("/api/sales/maps/search", {
        ...current,
        locale,
        ...(more ? { cursor } : {}),
      });
      setPlaces((old) => {
        const all: MapsPlace[] = more
          ? [...old, ...result.places]
          : result.places;
        return Array.from(
          new Map<string, MapsPlace>(all.map((p) => [p.id, p])).values(),
        );
      });
      setCursor(result.cursor);
      setLastSearch(current);
      setSearched(true);
      if (!more) setActive(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  function choose(place: MapsPlace) {
    const saved = prospects.find((p) => p.place_id === place.id);
    setActive(place);
    setDraft({
      service: saved?.service || "website",
      notes: saved?.notes || "",
      status: saved?.status || "new",
      nextActionAt: dateInput(saved?.next_action_at || null),
    });
    setNotice("");
  }
  async function loadSaved(p: MapsProspect) {
    setBusy(true);
    setError("");
    try {
      const result = await call("/api/sales/maps/details", {
        placeId: p.place_id,
        locale,
      });
      choose(result.place);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  const savedActive = active
    ? prospects.find((p) => p.place_id === active.id)
    : null;
  return (
    <div className="sales">
      <div className="salesHead">
        <h1>{ar ? "البحث عن شركات" : "Find businesses"}</h1>
        <Link className="btn" href={`/${locale}/sales`}>
          {ar ? "لوحة المبيعات" : "Sales dashboard"}
        </Link>
      </div>
      <p>
        {ar
          ? "ابحث حسب النشاط والمدينة، راجع الشركة، ثم احفظ مرجعها للمتابعة."
          : "Search by business sector and city, review a business, then save its reference for follow-up."}
      </p>
      {!connected && (
        <p className="formError" role="status">
          {ar
            ? "اتصال Google Maps لم يُجهز بعد. يلزم إعداد الوصول قبل البحث."
            : "Google Maps access is not configured yet."}
        </p>
      )}
      {!storageReady && (
        <p className="formError" role="status">
          {ar
            ? "حفظ الفرص غير متاح حتى يكتمل اتصال قاعدة البيانات وإعداد المبيعات."
            : "Prospect storage is unavailable until the database connection and migration are ready."}
        </p>
      )}
      <form
        className="mapsSearch"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label>
          {ar ? "النشاط" : "Business sector"}
          <input
            className="field"
            required
            minLength={2}
            maxLength={100}
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              setCursor("");
            }}
            list="maps-sectors"
          />
          <datalist id="maps-sectors">
            {(ar
              ? [
                  "شركات مقاولات",
                  "عيادات أسنان",
                  "صالونات تجميل",
                  "مطاعم",
                  "مكاتب عقارات",
                  "شركات سياحة",
                ]
              : [
                  "Construction companies",
                  "Dental clinics",
                  "Beauty salons",
                  "Restaurants",
                  "Real estate agencies",
                  "Travel agencies",
                ]
            ).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label>
          {ar ? "المدينة" : "City"}
          <select
            className="field"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setCursor("");
            }}
          >
            {Object.entries(mapsCities).map(([key, label]) => (
              <option key={key} value={key}>
                {ar ? cityLabels[key] : label}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy || !connected || !storageReady}
          className="btn primary"
        >
          {busy ? (ar ? "جارٍ التحميل…" : "Loading…") : ar ? "بحث" : "Search"}
        </button>
      </form>
      <p className="formError" role="alert">
        {error}
      </p>
      <p role="status">{notice}</p>
      <div className="salesGrid">
        <section>
          <div className="mapsResults">
            <div className="mapsAttribution">
              <span translate="no" lang="en">
                Google Maps
              </span>
              <span className="mini">
                {ar ? "بيانات تُجلب عند الطلب" : "Data retrieved on request"}
              </span>
            </div>
            <label className="mapsFilter">
              <input
                type="checkbox"
                checked={missingWebsite}
                onChange={(e) => setMissingWebsite(e.target.checked)}
              />
              {ar
                ? "عرض السجلات التي لم تُظهر رابط موقع"
                : "Show listings with no website link returned"}
            </label>
            {places
              .filter((p) => !missingWebsite || !p.website)
              .map((p) => (
                <article className="summaryCard mapsCard" key={p.id}>
                  <h2>{p.name || p.id}</h2>
                  <p>{p.address}</p>
                  <div className="actions">
                    {p.mapsUrl && (
                      <a
                        className="btn"
                        href={p.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {ar ? "عرض على الخرائط" : "View on Maps"}
                      </a>
                    )}
                    {p.website && (
                      <a
                        className="btn"
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {ar ? "موقع الشركة" : "Company website"}
                      </a>
                    )}
                    <button
                      className="btn primary"
                      disabled={busy}
                      onClick={() => choose(p)}
                    >
                      {prospects.some((s) => s.place_id === p.id)
                        ? ar
                          ? "محفوظ — مراجعة"
                          : "Saved — review"
                        : ar
                          ? "مراجعة الفرصة"
                          : "Review prospect"}
                    </button>
                  </div>
                  {p.phone && <p dir="ltr">{p.phone}</p>}
                  {!p.website && (
                    <p className="mini">
                      {ar
                        ? "لم يُعرض رابط موقع في هذا السجل؛ تحقق قبل اقتراح خدمة."
                        : "No website link was returned for this listing; verify before proposing a service."}
                    </p>
                  )}
                  {p.businessStatus === "CLOSED_PERMANENTLY" && (
                    <p className="formError">
                      {ar
                        ? "السجل يشير إلى إغلاق دائم."
                        : "Listing indicates permanent closure."}
                    </p>
                  )}
                  {p.attributions.map((a, i) => (
                    <p className="mini" key={i}>
                      {a.url ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {a.name}
                        </a>
                      ) : (
                        a.name
                      )}
                    </p>
                  ))}
                </article>
              ))}
            {!searched && (
              <p>
                {ar
                  ? "اختر النشاط والمدينة لعرض النتائج."
                  : "Choose a sector and city to see results."}
              </p>
            )}
            {searched &&
              places.filter((p) => !missingWebsite || !p.website).length ===
                0 && (
                <p>
                  {ar
                    ? "لا توجد نتائج مطابقة في النتائج المعروضة."
                    : "No matches in the displayed results."}
                </p>
              )}
            {cursor && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => void search(true)}
              >
                {ar ? "نتائج إضافية" : "More results"}
              </button>
            )}
          </div>
          <div className="summaryCard">
            <h2>{ar ? "فرص محفوظة للمتابعة" : "Saved prospects"}</h2>
            <p className="mini">
              {ar
                ? "نحفظ معرّف المكان وملاحظات العمل. تفاصيل Google تُجلب عند فتح السجل."
                : "We store the place reference and workflow notes. Google details are retrieved when you open a record."}
            </p>
            {capped && (
              <p>
                {ar
                  ? "تظهر أحدث 500 فرصة فقط."
                  : "Showing the latest 500 prospects only."}
              </p>
            )}
            {prospects.length === 0 && (
              <p>
                {ar ? "لا توجد فرص محفوظة بعد." : "No saved prospects yet."}
              </p>
            )}
            {prospects.map((p) => (
              <div className="mapsSaved" key={p.place_id}>
                <button
                  className="salesLink"
                  disabled={busy || !connected}
                  onClick={() => void loadSaved(p)}
                >
                  {ar ? "فتح تفاصيل الشركة" : "Open business details"}
                </button>
                <span>
                  {ar ? serviceNames[p.service] : p.service} ·{" "}
                  {ar ? statusLabels[p.status] : p.status}
                </span>
                {p.notes && <p>{p.notes}</p>}
                {p.next_action_at && (
                  <p className="mini">
                    {ar ? "المتابعة بتوقيت قطر" : "Follow-up (Qatar)"}:{" "}
                    {new Date(p.next_action_at).toLocaleString(
                      ar ? "ar-QA" : "en-QA",
                      { timeZone: "Asia/Qatar" },
                    )}
                  </p>
                )}
                <code>{p.place_id}</code>
              </div>
            ))}
          </div>
        </section>
        <aside>
          {active ? (
            <div className="summaryCard salesDetails">
              <div className="mapsAttribution">
                <h2>{active.name || active.id}</h2>
                <span translate="no" lang="en">
                  Google Maps
                </span>
              </div>
              <p>
                {ar
                  ? "هذه فرصة بحث، ولم تؤكد الشركة اهتمامها أو ميزانيتها."
                  : "This is a researched prospect. The business has not confirmed interest or budget."}
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  setNotice("");
                  try {
                    const body = {
                      placeId: active.id,
                      ...draft,
                      nextActionAt: draft.nextActionAt
                        ? new Date(draft.nextActionAt).toISOString()
                        : null,
                    };
                    const result = await call(
                      "/api/sales/maps/prospects",
                      body,
                      savedActive ? "PATCH" : "POST",
                    );
                    if (result.duplicate) {
                      setNotice(
                        ar
                          ? "الفرصة محفوظة سابقًا. حدّث الصفحة لمراجعتها."
                          : "This prospect was already saved. Refresh to review it.",
                      );
                    } else {
                      const item: MapsProspect = result.prospect || {
                        place_id: active.id,
                        service: draft.service,
                        notes: draft.notes,
                        status: draft.status as MapsProspect["status"],
                        next_action_at: body.nextActionAt,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      };
                      setProspects((old) => [
                        item,
                        ...old.filter((p) => p.place_id !== item.place_id),
                      ]);
                      setNotice(
                        ar
                          ? "تم حفظ الفرصة للمتابعة"
                          : "Prospect saved for follow-up",
                      );
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Error");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  {ar ? "الخدمة التي تريد مناقشتها" : "Service to discuss"}
                  <select
                    className="field"
                    value={draft.service}
                    onChange={(e) =>
                      setDraft({ ...draft, service: e.target.value })
                    }
                  >
                    {Object.entries(serviceNames).map(([key, label]) => (
                      <option value={key} key={key}>
                        {ar ? label : key}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {ar ? "حالة المتابعة" : "Follow-up status"}
                  <select
                    className="field"
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value })
                    }
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option value={key} key={key}>
                        {ar ? label : key}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {ar
                    ? "ملاحظاتك وخطوتك التالية"
                    : "Your notes and next action"}
                  <textarea
                    className="field"
                    rows={5}
                    maxLength={3000}
                    value={draft.notes}
                    onChange={(e) =>
                      setDraft({ ...draft, notes: e.target.value })
                    }
                  />
                </label>
                <label>
                  {ar
                    ? "موعد المتابعة — بتوقيت جهازك"
                    : "Follow-up — device timezone"}
                  <input
                    className="field"
                    type="datetime-local"
                    value={draft.nextActionAt}
                    onChange={(e) =>
                      setDraft({ ...draft, nextActionAt: e.target.value })
                    }
                  />
                </label>
                <button
                  disabled={
                    busy ||
                    !storageReady ||
                    (active.businessStatus === "CLOSED_PERMANENTLY" &&
                      !savedActive)
                  }
                  className="btn primary"
                >
                  {savedActive
                    ? ar
                      ? "تحديث المتابعة"
                      : "Update follow-up"
                    : ar
                      ? "حفظ للمتابعة"
                      : "Save prospect"}
                </button>
              </form>
            </div>
          ) : (
            <div className="summaryCard">
              {ar
                ? "اختر شركة لمراجعتها وتحديد خطوة المتابعة."
                : "Select a business to review and plan your follow-up."}
            </div>
          )}
        </aside>
      </div>
      <div className="actions" style={{ marginTop: 24 }}>
        <Link href={`/${locale}/terms`}>
          {ar ? "شروط الاستخدام" : "Terms of use"}
        </Link>
        <Link href={`/${locale}/privacy`}>{ar ? "الخصوصية" : "Privacy"}</Link>
      </div>
    </div>
  );
}
