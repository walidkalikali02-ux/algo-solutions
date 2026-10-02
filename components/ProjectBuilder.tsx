"use client";
import { useMemo, useState } from "react";
type Locale = "ar" | "en";

const goals = [
  {
    id: "presence",
    ar: "أريد حضورًا رقميًا أقوى",
    en: "I want a stronger digital presence",
  },
  {
    id: "leads",
    ar: "أريد استفسارات وعملاء أكثر",
    en: "I want more leads and inquiries",
  },
  {
    id: "operations",
    ar: "أريد تنظيم وأتمتة العمل",
    en: "I want to organize and automate operations",
  },
  { id: "commerce", ar: "أريد البيع أونلاين", en: "I want to sell online" },
  {
    id: "full",
    ar: "أريد مشروعًا رقميًا متكاملًا",
    en: "I need a complete digital project",
  },
  { id: "unsure", ar: "لست متأكدًا بعد", en: "I am not sure yet" },
];

const services = [
  { id: "website", ar: "موقع إلكتروني", en: "Website" },
  { id: "system", ar: "نظام / برنامج", en: "System / Software" },
  { id: "store", ar: "متجر إلكتروني", en: "E-Commerce" },
  { id: "social", ar: "تصميم وهوية رقمية", en: "Creative / Digital Identity" },
  { id: "full", ar: "مشروع متكامل", en: "Full Digital Project" },
  { id: "unsure", ar: "أحتاج مساعدتكم في الاختيار", en: "Help me choose" },
];

export default function ProjectBuilder({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState("");
  const [service, setService] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [requestId, setRequestId] = useState("");
  const [requestSignature, setRequestSignature] = useState("");
  const total = 3;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const source =
      new URLSearchParams(location.search).get("utm_source") || "website";
    const payload = { locale, goal, service, ...details, source };
    const signature = JSON.stringify(payload);
    const id =
      requestId && signature === requestSignature
        ? requestId
        : crypto.randomUUID();
    setRequestId(id);
    setRequestSignature(signature);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) throw Error();
      setReceipt(result.id);
    } catch {
      setError(
        ar
          ? "تعذر حفظ الطلب. تحقق من بيانات التواصل أو حاول لاحقًا؛ لم يتم تأكيد استلامه."
          : "Unable to save your request. Check your contact details or try later; receipt has not been confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }

  const types = useMemo(() => {
    if (service === "system")
      return [
        "ERP",
        "CRM",
        "POS",
        "Inventory",
        "HR",
        "Booking",
        "Accounting",
        "Customer Portal",
        "Custom System",
      ];
    if (service === "store")
      return [
        "Online Store",
        "Product Catalog",
        "Subscriptions",
        "Marketplace",
        "Custom Commerce",
      ];
    if (service === "social")
      return [
        "Brand Identity",
        "Social Media Design",
        "Campaign",
        "Product Launch",
        "Monthly Creative",
      ];
    if (service === "website")
      return [
        "Company Website",
        "Landing Page",
        "Booking Website",
        "Portfolio",
        "Multilingual Website",
        "Other",
      ];
    return [];
  }, [service]);

  const upd = (k: string, v: string) => setDetails({ ...details, [k]: v });
  const goalLabel = goals.find((x) => x.id === goal);
  const serviceLabel = services.find((x) => x.id === service);

  if (receipt)
    return (
      <div className="formWrap" role="status">
        <h2>{ar ? "تم استلام طلبك" : "Your request has been received"}</h2>
        <p>
          {ar
            ? "نراجع التفاصيل ونرجع لك خلال يوم عمل."
            : "We will review your brief and reply within one business day."}
        </p>
        <p>
          {ar ? "رقم الطلب" : "Request reference"}: <b dir="ltr">{receipt}</b>
        </p>
        <a href={`/${locale}`} className="btn">
          {ar ? "الرئيسية" : "Home"}
        </a>
      </div>
    );
  return (
    <div className="formWrap">
      <div className="progress">
        <div style={{ width: `${(step / total) * 100}%` }} />
      </div>

      {step === 1 && (
        <>
          <div className="tag">01 — {ar ? "الهدف" : "Goal"}</div>
          <h2>
            {ar
              ? "ما الذي تريد أن يتحسن في عملك؟"
              : "What do you want to improve in your business?"}
          </h2>
          <p className="mini" style={{ marginBottom: 22 }}>
            {ar
              ? "لا تحتاج تعرف اسم الخدمة الآن. ابدأ بالنتيجة التي تريدها."
              : "You do not need to know the service name yet. Start with the outcome."}
          </p>
          <div className="optionGrid">
            {goals.map((x) => (
              <button
                key={x.id}
                onClick={() => setGoal(x.id)}
                className={`option ${goal === x.id ? "active" : ""}`}
              >
                <h3>{ar ? x.ar : x.en}</h3>
              </button>
            ))}
          </div>
          <div className="actions" style={{ marginTop: 24 }}>
            <button
              className="btn primary"
              disabled={!goal}
              onClick={() => setStep(2)}
            >
              {ar ? "التالي" : "Next"}
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="tag">
            02 — {ar ? "تفاصيل المشروع" : "Project details"}
          </div>
          <h2>
            {ar
              ? "أعطنا صورة سريعة عن المشروع."
              : "Give us a quick picture of the project."}
          </h2>

          <label>
            {ar ? "الحل الأقرب لما تحتاجه" : "Closest solution"}
            <select
              className="field"
              value={service}
              onChange={(e) => {
                setService(e.target.value);
                upd("type", "");
              }}
            >
              <option value="">
                {ar ? "اختر أو اتركه غير محدد" : "Choose or leave undecided"}
              </option>
              {services.map((x) => (
                <option key={x.id} value={x.id}>
                  {ar ? x.ar : x.en}
                </option>
              ))}
            </select>
          </label>

          {types.length > 0 && (
            <label>
              {ar ? "نوع المشروع — اختياري" : "Project type — optional"}
              <select
                className="field"
                value={details.type || ""}
                onChange={(e) => upd("type", e.target.value)}
              >
                <option value="">{ar ? "غير محدد بعد" : "Not sure yet"}</option>
                {types.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            {ar
              ? "الميزانية التقريبية — اختياري"
              : "Estimated budget — optional"}
            <select
              className="field"
              value={details.budget || ""}
              onChange={(e) => upd("budget", e.target.value)}
            >
              <option value="">{ar ? "غير محددة بعد" : "Not sure yet"}</option>
              <option>2,500–5,000 QAR</option>
              <option>5,000–10,000 QAR</option>
              <option>10,000–20,000 QAR</option>
              <option>20,000–50,000 QAR</option>
              <option>50,000+ QAR</option>
            </select>
          </label>

          <label>
            {ar ? "موعد الإطلاق — اختياري" : "Target launch — optional"}
            <select
              className="field"
              value={details.timeline || ""}
              onChange={(e) => upd("timeline", e.target.value)}
            >
              <option value="">
                {ar ? "مرن / غير محدد" : "Flexible / Not sure yet"}
              </option>
              <option>Within 2 weeks</option>
              <option>Within 30 days</option>
              <option>1–2 months</option>
              <option>2–3 months</option>
              <option>Flexible</option>
            </select>
          </label>

          <label>
            {ar
              ? "ما المشكلة أو النتيجة التي تريد الوصول إليها؟"
              : "What problem or outcome are you trying to solve?"}
            <textarea
              className="field"
              rows={5}
              maxLength={5000}
              value={details.note || ""}
              onChange={(e) => upd("note", e.target.value)}
              placeholder={
                ar
                  ? "مثال: أريد موقعًا يجيب طلبات أكثر ويكون أسهل في الإدارة..."
                  : "Example: I want a website that generates more inquiries and is easier to manage..."
              }
            />
          </label>

          <div className="actions" style={{ marginTop: 24 }}>
            <button className="btn" onClick={() => setStep(1)}>
              {ar ? "رجوع" : "Back"}
            </button>
            <button className="btn primary" onClick={() => setStep(3)}>
              {ar ? "التالي" : "Next"}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <form onSubmit={submit}>
          <div className="tag">03 — {ar ? "التواصل" : "Contact"}</div>
          <h2>
            {ar ? "باقي بيانات التواصل فقط." : "Just your contact details."}
          </h2>
          <p className="mini" style={{ marginBottom: 18 }}>
            {ar
              ? "نراجع الطلب ونرجع لك خلال يوم عمل."
              : "We review the brief and reply within one business day."}
          </p>

          <label>
            {ar ? "الاسم" : "Name"}
            <input
              className="field"
              required
              maxLength={120}
              autoComplete="name"
              value={details.name || ""}
              onChange={(e) => upd("name", e.target.value)}
            />
          </label>
          <label>
            {ar ? "اسم الشركة — اختياري" : "Company — optional"}
            <input
              className="field"
              maxLength={160}
              autoComplete="organization"
              value={details.company || ""}
              onChange={(e) => upd("company", e.target.value)}
            />
          </label>
          <label>
            {ar ? "البريد الإلكتروني" : "Email"}
            <input
              type="email"
              className="field"
              required={!details.phone}
              maxLength={250}
              autoComplete="email"
              value={details.email || ""}
              onChange={(e) => upd("email", e.target.value)}
            />
          </label>
          <label>
            {ar ? "رقم الجوال / واتساب" : "Phone / WhatsApp"}
            <input
              type="tel"
              className="field"
              required={!details.email}
              maxLength={40}
              autoComplete="tel"
              value={details.phone || ""}
              onChange={(e) => upd("phone", e.target.value)}
            />
          </label>
          <label>
            {ar ? "قطاع الشركة — اختياري" : "Business sector — optional"}
            <input
              className="field"
              maxLength={120}
              value={details.sector || ""}
              onChange={(e) => upd("sector", e.target.value)}
            />
          </label>
          <label>
            {ar ? "دورك في المشروع — اختياري" : "Your role — optional"}
            <select
              className="field"
              value={details.role || ""}
              onChange={(e) => upd("role", e.target.value)}
            >
              <option value="">{ar ? "اختر" : "Choose"}</option>
              <option value="decision_maker">
                {ar ? "صاحب القرار" : "Decision maker"}
              </option>
              <option value="team">
                {ar ? "عضو في الفريق" : "Team member"}
              </option>
              <option value="research">
                {ar ? "أجمع معلومات" : "Researching"}
              </option>
            </select>
          </label>
          <label>
            {ar ? "رابط موقع الشركة — اختياري" : "Company website — optional"}
            <input
              type="url"
              className="field"
              maxLength={500}
              placeholder="https://"
              value={details.website || ""}
              onChange={(e) => upd("website", e.target.value)}
            />
          </label>
          <div className="trap" aria-hidden="true">
            <input
              tabIndex={-1}
              autoComplete="off"
              value={details.companyFax || ""}
              onChange={(e) => upd("companyFax", e.target.value)}
              aria-label="Leave empty"
            />
          </div>
          <p className="mini">
            {ar
              ? "نستخدم بياناتك للتواصل بشأن طلب المشروع. أدخل البريد أو رقم الهاتف على الأقل."
              : "We use your details to contact you about this project. Provide at least an email or phone number."}
          </p>
          <p className="formError" role="alert">
            {error}
          </p>

          <div className="summaryCard">
            <div className="mini">{ar ? "ملخص سريع" : "Quick summary"}</div>
            <p>
              <b>{ar ? "الهدف" : "Goal"}:</b>{" "}
              {goalLabel
                ? ar
                  ? goalLabel.ar
                  : goalLabel.en
                : ar
                  ? "غير محدد"
                  : "Not decided"}
              <br />
              <b>{ar ? "الحل" : "Solution"}:</b>{" "}
              {serviceLabel
                ? ar
                  ? serviceLabel.ar
                  : serviceLabel.en
                : ar
                  ? "غير محدد"
                  : "Not decided"}
              {details.type ? <> — {details.type}</> : null}
              <br />
              {details.budget
                ? details.budget
                : ar
                  ? "الميزانية غير محددة"
                  : "Budget not decided"}{" "}
              •{" "}
              {details.timeline
                ? details.timeline
                : ar
                  ? "الموعد مرن"
                  : "Flexible timeline"}
            </p>
          </div>

          <div className="actions" style={{ marginTop: 24 }}>
            <button
              type="button"
              disabled={busy}
              className="btn"
              onClick={() => setStep(2)}
            >
              {ar ? "رجوع" : "Back"}
            </button>
            <button type="submit" disabled={busy} className="btn primary">
              {busy
                ? ar
                  ? "جارٍ الإرسال…"
                  : "Sending…"
                : ar
                  ? "طلب عرض سعر"
                  : "Request Proposal"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
