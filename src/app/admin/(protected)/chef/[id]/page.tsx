import { notFound } from "next/navigation";
import ChefRecipeEditor from "@/components/admin/ChefRecipeEditor";
import { getChefRecipeById } from "@/lib/chefRecipeService";

export default async function ChefRecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getChefRecipeById(id);

  if (!recipe) {
    notFound();
  }

  return (
    <section className="admin-stack">
      <ChefRecipeEditor mode="edit" initialRecipe={recipe} />
    </section>
  );
}

