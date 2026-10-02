import { authorized } from "@/lib/sales/auth";
import { db } from "@/lib/sales/db";
import SalesLogin from "@/components/SalesLogin";
import SalesDashboard from "@/components/SalesDashboard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Algo Sales",
  robots: { index: false, follow: false },
};
export default async function SalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ar = locale !== "en";
  if (!(await authorized()))
    return (
      <main className="container">
        <SalesLogin ar={ar} />
      </main>
    );
  try {
    const leads = await db(
      "sales_leads?select=*&order=created_at.desc&limit=5001",
    );
    const capped = leads.length > 5000;
    return (
      <main className="container">
        <SalesDashboard
          initial={leads.slice(0, 5000)}
          ar={ar}
          capped={capped}
        />
      </main>
    );
  } catch {
    return (
      <main className="container sales">
        <h1>{ar ? "إدارة المبيعات" : "Sales management"}</h1>
        <p role="alert">
          {ar
            ? "تعذر تحميل العملاء. تأكد من اتصال قاعدة البيانات وتطبيق ملف إعداد المبيعات."
            : "Unable to load leads. Check the database connection and sales migration."}
        </p>
        <a className="btn" href={`/${ar ? "ar" : "en"}/sales`}>
          {ar ? "إعادة المحاولة" : "Retry"}
        </a>
      </main>
    );
  }
}
