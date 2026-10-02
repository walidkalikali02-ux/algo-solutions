export const metadata = { title: "Algo — Terms of use" };
export default async function Terms({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ar = locale !== "en";
  return (
    <main className="container pageHero">
      <h1>{ar ? "شروط الاستخدام" : "Terms of use"}</h1>
      <p>
        {ar
          ? "يوفر الموقع معلومات خدمات Algo Solutions واستقبال طلبات المشاريع. تُحدد الأسعار النهائية والمخرجات والمواعيد في عرض مستقل بعد مراجعة المتطلبات."
          : "This website describes Algo Solutions services and accepts project briefs. Final prices, deliverables and schedules are set in a separate proposal after requirements are reviewed."}
      </p>
      <p>
        {ar
          ? "يتضمن قسم البحث عن الشركات ميزات ومحتوى Google Maps. استخدام هذه الميزات يخضع إلى"
          : "Business search includes Google Maps features and content. Their use is subject to the current"}{" "}
        <a
          href="https://maps.google.com/help/terms_maps/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {ar
            ? "شروط Google Maps الإضافية"
            : "Google Maps Additional Terms of Service"}
        </a>{" "}
        {ar ? "و" : "and"}{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          {ar ? "سياسة خصوصية Google" : "Google Privacy Policy"}
        </a>
        .
      </p>
      <p>
        {ar
          ? "نتائج البحث تساعد على مراجعة الشركات، ولا تثبت اهتمامها بالتعاقد أو ملكية رقم الهاتف لقناة واتساب. يجب التحقق من ملاءمة الخدمة ووسيلة التواصل قبل المتابعة."
          : "Search results support business research; they do not establish buying interest or whether a listed phone supports WhatsApp. Verify service fit and the contact channel before following up."}
      </p>
    </main>
  );
}
