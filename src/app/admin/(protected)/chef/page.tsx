import Link from "next/link";
import { listApprovedChefRecipes } from "@/lib/chefRecipeService";
import { Card } from "@/ui/components/Card";

export const metadata = {
  title: "Chef recipes | Szárnyfeszítő admin",
};

export default async function ChefIndexPage() {
  const recipes = await listApprovedChefRecipes();

  return (
    <section className="admin-stack">
      <Card className="stack">
        <header className="admin-header-row">
          <div>
            <p className="admin-heading__label">Chef</p>
            <h1 className="admin-heading__title admin-heading__title--large">
              Recipes
            </h1>
            <p className="admin-heading__description">
              Generate a precise recipe from a freeform title + short description,
              then accept and refine with review notes.
            </p>
          </div>
          <Link className="admin-nav-link" href="/admin/chef/new">
            New recipe
          </Link>
        </header>

        <div className="space-y-3">
          {recipes.length === 0 ? (
            <p className="admin-stat-note">
              No approved recipes yet. Create one to start the list.
            </p>
          ) : (
            recipes.map((recipe) => {
              const ingredientNames = (recipe.recipe_json?.ingredients ?? [])
                .map((ingredient) => ingredient.name)
                .filter(Boolean)
                .slice(0, 5);

              return (
                <Link
                  key={recipe.id}
                  href={`/admin/chef/${recipe.id}`}
                  className="admin-list-link"
                >
                  <div className="admin-list-details">
                    <p className="admin-list-title">{recipe.title}</p>
                    <p className="admin-list-meta">{recipe.short_description}</p>
                    {ingredientNames.length ? (
                      <p className="admin-list-meta">
                        {ingredientNames.join(" • ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="admin-inline-actions">
                    <span className="status-pill">
                      {recipe.cook_time_minutes} MIN
                    </span>
                    <span className="admin-list-action">Open</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </section>
  );
}
