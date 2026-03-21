import { loadSpiritLibrary } from "@/lib/spiritLibrary";
import SpiritLibraryApp from "@/components/spirit/SpiritLibraryApp";

export const metadata = {
  title: "Spirit Library | Szarnyfeszito admin",
};

export default function SpiritLibraryPage() {
  const library = loadSpiritLibrary();

  return <SpiritLibraryApp library={library} />;
}
