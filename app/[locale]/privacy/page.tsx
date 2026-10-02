import Link from "next/link";
export const metadata = { title: "Algo — Privacy" };
export default async function Privacy({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ar = locale !== "en";
  return (
    <main className="container pageHero">
      <h1>{ar ? "الخصوصية" : "Privacy"}</h1>
      <p>
        {ar
          ? "يستخدم Algo Solutions بيانات نموذج المشروع للتواصل بشأن الطلب ومتابعة فرص البيع. يمكن لفريق المبيعات المصرح له الوصول إلى بيانات العملاء وملاحظات المتابعة."
          : "Algo Solutions uses project brief information to respond to requests and manage sales opportunities. Authorized sales staff can access client details and follow-up notes."}
      </p>
      <p>
        {ar
          ? "عند استخدام البحث عن الشركات، تُرسل عبارة البحث والمدينة إلى Google Maps لعرض النتائج. يُحفظ معرّف المكان وملاحظات العمل، وتُجلب تفاصيل المكان عند الطلب. لا تُرسل ملاحظات المتابعة أو بيانات نموذج المشروع إلى Google Places."
          : "Business searches send the query and city to Google Maps to retrieve results. Place references and workflow notes are stored; listing details are retrieved on request. Follow-up notes and project brief details are not sent to Google Places."}
      </p>
      <p>
        {ar
          ? "تخضع معالجة Google للبيانات إلى"
          : "Google’s handling of data is subject to its"}{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          {ar ? "سياسة خصوصية Google" : "Privacy Policy"}
        </a>
        .
      </p>
      <p>
        {ar
          ? "لطلب مراجعة بياناتك أو للاستفسار، تواصل مع Algo Solutions من خلال"
          : "For data inquiries or review requests, contact Algo Solutions through the"}{" "}
        <Link href={`/${ar ? "ar" : "en"}/start-project`}>
          {ar ? "نموذج التواصل" : "contact form"}
        </Link>
        .
      </p>
    </main>
  );
}
