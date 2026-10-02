export const stages = [
  "new",
  "qualified",
  "meeting",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
export type Stage = (typeof stages)[number];
export type Brief = {
  requestId: string;
  locale: "ar" | "en";
  goal: string;
  service: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  sector: string;
  role: string;
  website: string;
  note: string;
  budget: string;
  timeline: string;
  type: string;
  source: string;
};
export type Lead = Brief & {
  id: string;
  score: number;
  reasons: string[];
  stage: Stage;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
  value: number | null;
  cost: number | null;
  loss_reason: string;
  sales_note: string;
  version: number;
};
const text = (x: unknown, max = 250) =>
  typeof x === "string" ? x.trim().slice(0, max) : "";
export function parseBrief(raw: Record<string, unknown>): Brief {
  const b: Brief = {
    requestId: text(raw.requestId),
    locale: raw.locale === "en" ? "en" : "ar",
    goal: text(raw.goal),
    service: text(raw.service),
    name: text(raw.name, 120),
    company: text(raw.company, 160),
    email: text(raw.email).toLowerCase(),
    phone: text(raw.phone, 40),
    sector: text(raw.sector, 120),
    role: text(raw.role, 60),
    website: text(raw.website, 500),
    note: text(raw.note, 5000),
    budget: text(raw.budget, 80),
    timeline: text(raw.timeline, 80),
    type: text(raw.type, 120),
    source: text(raw.source, 500),
  };
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      b.requestId,
    )
  )
    throw Error("requestId");
  if (
    !b.name ||
    !["presence", "leads", "operations", "commerce", "full", "unsure"].includes(
      b.goal,
    )
  )
    throw Error("name/goal");
  if (
    b.service &&
    !["website", "system", "store", "social", "full", "unsure"].includes(
      b.service,
    )
  )
    throw Error("service");
  if (b.role && !["decision_maker", "team", "research"].includes(b.role))
    throw Error("role");
  if (
    b.budget &&
    ![
      "2,500–5,000 QAR",
      "5,000–10,000 QAR",
      "10,000–20,000 QAR",
      "20,000–50,000 QAR",
      "50,000+ QAR",
    ].includes(b.budget)
  )
    throw Error("budget");
  if (
    b.timeline &&
    ![
      "Within 2 weeks",
      "Within 30 days",
      "1–2 months",
      "2–3 months",
      "Flexible",
    ].includes(b.timeline)
  )
    throw Error("timeline");
  if (!b.email && !b.phone) throw Error("contact");
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))
    throw Error("email");
  if (b.phone && !/^\+?[\d\s()-]{7,40}$/.test(b.phone)) throw Error("phone");
  if (b.website && !/^https?:\/\//i.test(b.website)) throw Error("website");
  return b;
}
// These are transparent triage rules, not probabilities or pricing commitments.
export function qualify(b: Brief) {
  let score = 0;
  const reasons: string[] = [];
  const add = (n: number, s: string) => {
    score += n;
    reasons.push(s);
  };
  if (b.company) add(10, "اسم الشركة متوفر");
  if (b.service && b.service !== "unsure") add(15, "الخدمة المطلوبة محددة");
  if (b.note.length >= 40) add(20, "وصف الاحتياج متوفر");
  if (b.budget) add(15, "نطاق الميزانية متوفر");
  if (b.role === "decision_maker") add(20, "جهة الاتصال صاحب القرار");
  if (b.timeline && b.timeline !== "Flexible") add(10, "موعد الإطلاق محدد");
  if (b.email && b.phone) add(10, "البريد ورقم التواصل متوفران");
  return { score, reasons };
}
export const serviceNames: Record<string, string> = {
  website: "موقع إلكتروني",
  system: "نظام أعمال",
  store: "متجر إلكتروني",
  social: "تصميم رقمي",
  full: "مشروع متكامل",
  unsure: "جلسة اكتشاف",
};
export function prep(b: Brief) {
  const specific: Record<string, string[]> = {
    website: [
      "ما الإجراء الذي تريد من زائر الموقع اتخاذه؟",
      "هل المحتوى والهوية جاهزان؟",
    ],
    system: [
      "ما أكثر عملية يدوية تستهلك وقت الفريق؟",
      "ما الأنظمة والبيانات التي تحتاج إلى ربطها؟",
    ],
    store: [
      "كم عدد المنتجات وما خيارات الدفع والتوصيل؟",
      "كيف تدير المخزون والطلبات حاليًا؟",
    ],
    social: ["ما المنصات والجمهور المستهدف؟", "ما المواد والهوية المتوفرة؟"],
  };
  return {
    summary: `${b.company || b.name} — ${serviceNames[b.service] || "جلسة اكتشاف"} — ${b.note || "يحتاج تحديد الاحتياج في الاجتماع"}`,
    questions: [
      ...(specific[b.service] || [
        "ما النتيجة الأهم من المشروع؟",
        "كيف تنفذ العمل حاليًا؟",
      ]),
      "من يشارك في قرار التعاقد؟",
      "ما معايير نجاح المشروع؟",
    ],
    scope: [
      serviceNames[b.service] || "تحديد الحل المناسب",
      b.type || "تحديد المخرجات بعد الاجتماع",
      "تأكيد النطاق والجدول والتكلفة قبل التعاقد",
    ],
  };
}
export function draft(b: Brief, stage: Stage) {
  if (b.locale === "en")
    return `Hello ${b.name}, following up on your ${b.service || "digital project"} request${b.company ? ` for ${b.company}` : ""}. ${stage === "proposal" || stage === "negotiation" ? "Do you have any questions about the proposal or project scope?" : "Would you be available for a short call to discuss your requirements?"} Best regards, Algo Solutions`;
  return `مرحبًا ${b.name}، نتابع معك طلب ${serviceNames[b.service] || "مشروعك الرقمي"}${b.company ? ` لشركة ${b.company}` : ""}. ${stage === "proposal" || stage === "negotiation" ? "هل لديك أسئلة بخصوص عرض السعر أو نطاق العمل؟" : "هل يناسبك تحديد مكالمة قصيرة لفهم المتطلبات؟"} تحياتنا، Algo Solutions`;
}
export function metrics(leads: Lead[]) {
  const won = leads.filter((l) => l.stage === "won"),
    lost = leads.filter((l) => l.stage === "lost");
  const priced = won.filter((l) => l.value !== null),
    costed = priced.filter((l) => l.cost !== null);
  return {
    total: leads.length,
    open: leads.filter((l) => !["won", "lost"].includes(l.stage)).length,
    won: won.length,
    lost: lost.length,
    winRate:
      won.length + lost.length
        ? Math.round((won.length / (won.length + lost.length)) * 100)
        : null,
    revenue: priced.reduce((s, l) => s + (l.value || 0), 0),
    profit: costed.length
      ? costed.reduce((s, l) => s + (l.value || 0) - (l.cost || 0), 0)
      : null,
    unpriced: won.length - priced.length,
    uncosted: won.length - costed.length,
  };
}
