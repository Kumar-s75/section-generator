import { z } from "zod";

export const nodeTypes = [
  "section",
  "container",
  "heading",
  "paragraph",
  "button",
  "pricingGrid",
  "pricingCard",
  "price",
  "featureList",
  "featureItem",
] as const;
const propsSchema = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    href: z.url({ protocol: /^https?$/ }).optional(),
    text: z.string().max(10000).optional(),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    variant: z.enum(["primary", "secondary", "eyebrow", "muted"]).optional(),
    highlighted: z.boolean().optional(),
    planName: z.string().max(100).optional(),
    price: z.string().max(50).optional(),
    billingPeriod: z.string().max(50).optional(),
    theme: z.enum(["light", "dark"]).optional(),
    accent: z.enum(["sage", "indigo", "rose"]).optional(),
    arrangement: z.enum(["stack", "row"]).optional(),
  })
  .strict();
export type UINode = {
  id: string;
  type: (typeof nodeTypes)[number];
  props?: z.infer<typeof propsSchema>;
  children?: UINode[];
};
const nodeSchema: z.ZodType<UINode> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1).max(100),
      type: z.enum(nodeTypes),
      props: propsSchema.optional(),
      children: z.array(nodeSchema).max(100).optional(),
    })
    .strict(),
);
// Check complexity before recursive parsing to keep untrusted trees bounded.
export const layoutSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    const pending = [{ value, depth: 0 }];
    const ids = new Set<string>();
    let count = 0;
    while (pending.length) {
      const item = pending.pop()!;
      if (++count > 500 || item.depth > 20) {
        ctx.addIssue({
          code: "custom",
          message: "Layout is too large or deeply nested.",
        });
        return;
      }
      if (typeof item.value !== "object" || item.value === null) continue;
      const node = item.value as Record<string, unknown>;
      if (typeof node.id === "string") {
        if (ids.has(node.id)) {
          ctx.addIssue({ code: "custom", message: "Node IDs must be unique." });
          return;
        }
        ids.add(node.id);
      }
      if (Array.isArray(node.children))
        for (const child of node.children)
          pending.push({ value: child, depth: item.depth + 1 });
    }
  })
  .pipe(nodeSchema)
  .refine((node) => node.type === "section", "The root must be a section.");
export const generateSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, "Enter a prompt to get started.")
      .max(2000, "Keep your prompt under 2,000 characters."),
  })
  .strict();
export const saveSchema = z
  .object({ layout: layoutSchema, prompt: z.string().max(2000).optional() })
  .strict();

export const savedLayoutSchema = z
  .object({
    schemaVersion: z.literal(1),
    prompt: z.string().max(2000).optional(),
    layout: layoutSchema,
    savedAt: z.iso.datetime(),
  })
  .strict();
