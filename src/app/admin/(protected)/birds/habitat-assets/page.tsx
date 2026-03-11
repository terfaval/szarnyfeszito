import HabitatStockAssetsTool from "@/components/admin/HabitatStockAssetsTool";

export const metadata = {
  title: "Habitat assets — Szarnyfeszito Admin",
};

export default async function HabitatAssetsPage() {
  return (
    <section className="space-y-10">
      <HabitatStockAssetsTool />
    </section>
  );
}

