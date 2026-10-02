import Link from "next/link";
export default function Footer({ locale }: { locale: "ar" | "en" }) {
  const ar = locale === "ar";
  return (
    <footer className="footer">
      <div className="container footerGrid">
        <div>
          <div className="footerLogo">
            <span className="brandDot" />
            Algo Solutions
          </div>
          <p>
            {ar
              ? "نصمم مواقع وأنظمة وتجارب رقمية للشركات في قطر والعالم العربي."
              : "We design websites, systems and digital experiences for businesses in Qatar and the Arab world."}
          </p>
        </div>
        <div className="footerLinks">
          <Link href={`/${locale}/services`}>
            {ar ? "الخدمات" : "Services"}
          </Link>
          <Link href={`/${locale}/work`}>{ar ? "الأعمال" : "Work"}</Link>
          <Link href={`/${locale}/pricing`}>{ar ? "الأسعار" : "Pricing"}</Link>
          <Link href={`/${locale}/start-project`}>
            {ar ? "ابدأ مشروعك" : "Start a project"}
          </Link>
          <Link href={`/${locale}/privacy`}>{ar ? "الخصوصية" : "Privacy"}</Link>
          <Link href={`/${locale}/terms`}>{ar ? "الشروط" : "Terms"}</Link>
        </div>
      </div>
      <div className="container footerBottom">
        <span>© 2026 Algo Solutions</span>
        <span>Doha, Qatar</span>
      </div>
    </footer>
  );
}
