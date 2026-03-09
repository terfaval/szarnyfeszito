import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { acceptChefRecipe } from "@/lib/chefRecipeService";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminUser = await getAdminUserFromCookies();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  try {
    const recipe = await acceptChefRecipe(params.id);
    return NextResponse.json({ data: { recipe } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to accept recipe." },
      { status: 400 }
    );
  }
}

