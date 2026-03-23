import { z } from "zod";
import { SpiritBookSchema } from "./spiritSchema";

export const SpiritDraftSchema = SpiritBookSchema.extend({
  status: SpiritBookSchema.shape.status.default("olvasatlan"),
  summary_long: z.string().min(1),
  cautions: z.string().min(1),
  prerequisites: z.array(z.string().min(1)).optional(),
  related: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
  year: z.string().nullable().optional(),
});

export const SpiritDraftResponseSchema = z.object({
  draft: SpiritDraftSchema,
  confidence: z.record(z.string(), z.number().or(z.string())).optional().default({}),
  warnings: z.array(z.string()).default([]),
  uncertain_fields: z.array(z.string()).default([]),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
  })).default([]),
});

export type SpiritDraft = z.infer<typeof SpiritDraftSchema>;
export type SpiritDraftResponse = z.infer<typeof SpiritDraftResponseSchema>;
