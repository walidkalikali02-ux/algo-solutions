import { authorized } from "@/lib/sales/auth";
import { db } from "@/lib/sales/db";
import MapsProspector from "@/components/MapsProspector";
import SalesLogin from "@/components/SalesLogin";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Algo — Google Maps prospects",
  robots: { index: false, follow: false },
};
export default async function MapsPage({
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
  let prospects = [],
    storageReady = true;
  try {
    prospects = await db(
      "sales_maps_prospects?select=*&order=created_at.desc&limit=501",
    );
  } catch {
    storageReady = false;
  }
  return (
    <main className="container">
      <MapsProspector
        ar={ar}
        initial={prospects.slice(0, 500)}
        capped={prospects.length > 500}
        connected={!!process.env.GOOGLE_PLACES_API_KEY}
        storageReady={storageReady}
      />
    </main>
  );
}
