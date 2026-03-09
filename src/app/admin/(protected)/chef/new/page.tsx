import { Card } from "@/ui/components/Card";
import ChefRecipeEditor from "@/components/admin/ChefRecipeEditor";

export const metadata = {
  title: "New recipe | Chef | Szárnyfeszítő admin",
};

export default function ChefNewRecipePage() {
  return (
    <section className="admin-stack">
      <Card className="stack">
        <header className="admin-heading">
          <p className="admin-heading__label">Chef</p>
          <h1 className="admin-heading__title admin-heading__title--large">
            New recipe
          </h1>
          <p className="admin-heading__description">
            Provide a title and a short description, then generate a precise
            recipe. Base servings are 2.
          </p>
        </header>
        <ChefRecipeEditor mode="create" />
      </Card>
    </section>
  );
}

