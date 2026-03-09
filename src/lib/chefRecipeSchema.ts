import { z } from "zod";

export const chefIngredientSchemaV1 = z
  .object({
    name: z.string().trim().min(1).max(120),
    amount: z.number().finite().nonnegative().nullable(),
    unit: z.string().trim().min(1).max(32).nullable(),
    note: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();

export const chefRecipeSchemaV1 = z
  .object({
    schema_version: z.literal("v1"),
    language: z.literal("hu"),
    title: z.string().trim().min(1).max(120),
    short_description: z.string().trim().min(1).max(400),
    servings: z.number().int().min(1).max(20),
    cook_time_minutes: z.number().int().min(1).max(600),
    ingredients: z.array(chefIngredientSchemaV1).min(3).max(40),
    steps: z.array(z.string().trim().min(1).max(600)).min(3).max(30),
  })
  .strict();

export type ChefRecipeV1 = z.infer<typeof chefRecipeSchemaV1>;

