import { loadSpiritLibrary } from "@/lib/spiritLibrary";
import SpiritLibraryApp from "@/components/spirit/SpiritLibraryApp";

export const metadata = {
  title: "Spirit Library | Szarnyfeszito admin",
};

export default async function SpiritLibraryPage() {
  const library = await loadSpiritLibrary();

  return <SpiritLibraryApp library={library} />;
}
