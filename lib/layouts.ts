import type { UINode } from "./schema";
import { parsePromptOptions, type PromptOptions } from "./prompt-options";
import { updateNodeText } from "./tree";
const text = (
  id: string,
  type: UINode["type"],
  content: string,
  props: UINode["props"] = {},
): UINode => ({ id, type, props: { text: content, ...props } });
export function heroLayout(): UINode {
  return {
    id: "hero-section",
    type: "section",
    children: [
      {
        id: "hero-content",
        type: "container",
        children: [
          text("hero-eyebrow", "paragraph", "YOUR NEXT BIG IDEA STARTS HERE", {
            variant: "eyebrow",
          }),
          text(
            "hero-title",
            "heading",
            "Build something\nworth putting out there.",
            { level: 1 },
          ),
          text(
            "hero-description",
            "paragraph",
            "From the first spark to your next launch. Give your team the tools to turn ambitious ideas into extraordinary experiences.",
          ),
          {
            id: "hero-actions",
            type: "container",
            props: { arrangement: "row" },
            children: [
              text("hero-primary", "button", "Start building", {
                variant: "primary",
              }),
              text("hero-secondary", "button", "Explore the platform ↗", {
                variant: "secondary",
              }),
            ],
          },
          text(
            "hero-note",
            "paragraph",
            "Made for the way you work. Built for what comes next.",
            { variant: "muted" },
          ),
        ],
      },
    ],
  };
}
export function pricingLayout(options?: PromptOptions): UINode {
  const plans = [
    {
      name: "Starter",
      price: "$10",
      features: [
        "Most Features",
        "10 Descriptions",
        "Feature / Features",
        "Optimized",
        "Users evaluate",
      ],
      button: "Choose Plan",
    },
    {
      name: "Pro",
      price: "$29",
      features: [
        "Extend Features",
        "10 Projects",
        "Unlimited Projects",
        "Unlimitesated",
        "Unlimited Projects",
      ],
      button: "Choose Plan",
    },
    {
      name: "Enterprise",
      price: "$50",
      features: [
        "Extend Features",
        "2010 Projects",
        "Unlimited-Projects",
        "Pooloossionate",
        "Premipited Projects",
      ],
      button: "Contact Us",
    },
    {
      name: "Business",
      price: "$149",
      features: [
        "Everything in Enterprise",
        "Unlimited members",
        "Advanced permissions",
        "Dedicated onboarding",
        "Priority support",
      ],
      button: "Contact Us",
    },
  ].slice(0, options?.tiers ?? 3);
  return {
    id: "pricing-section",
    type: "section",
    children: [
      {
        id: "pricing-grid",
        type: "pricingGrid",
        children: plans.map((plan, index) => ({
          id: `plan-${index}`,
          type: "pricingCard",
          props: { highlighted: index === 1 },
          children: [
            text(`plan-name-${index}`, "heading", plan.name, { level: 2 }),
            {
              id: `price-${index}`,
              type: "price",
              props: {
                price: options
                  ? `${options.currency}${Number(plan.price.slice(1)) * (options.annual ? 10 : 1)}`
                  : plan.price,
                billingPeriod: options?.annual ? "/yr" : "/mo",
              },
            },
            {
              id: `features-${index}`,
              type: "featureList",
              children: plan.features.map((feature, featureIndex) =>
                text(
                  `feature-${index}-${featureIndex}`,
                  "featureItem",
                  feature,
                ),
              ),
            },
            text(`cta-${index}`, "button", plan.button, {
              variant: "secondary",
            }),
          ],
        })),
      },
    ],
  };
}
export function generateLayout(prompt: string): UINode | null {
  const normalized = prompt.toLowerCase();
  const kind = normalized.includes("pricing")
    ? "pricing"
    : normalized.includes("hero")
      ? "hero"
      : null;
  if (!kind) return null;
  const options = parsePromptOptions(prompt);
  let layout = kind === "pricing" ? pricingLayout(options) : heroLayout();
  if (kind === "pricing" && (options.brand || options.headline)) {
    layout = {
      ...layout,
      children: [
        text("pricing-title", "heading", "Find your perfect plan.", {
          level: 1,
        }),
        ...(layout.children ?? []),
      ],
    };
  }
  if (options.brand) {
    layout = updateNodeText(
      layout,
      `${kind}-eyebrow`,
      options.brand.toUpperCase(),
    );
    layout = updateNodeText(
      layout,
      `${kind}-title`,
      kind === "hero"
        ? `Your next chapter starts with ${options.brand}.`
        : `Find your fit with ${options.brand}.`,
    );
  }
  if (options.headline)
    layout = updateNodeText(layout, `${kind}-title`, options.headline);
  if (options.cta) {
    if (kind === "hero")
      layout = updateNodeText(layout, "hero-primary", options.cta);
    else
      for (let index = 0; index < options.tiers; index++)
        layout = updateNodeText(layout, `cta-${index}`, options.cta);
  }
  if (options.theme || options.accent)
    layout = {
      ...layout,
      props: {
        ...(options.theme ? { theme: options.theme } : {}),
        ...(options.accent ? { accent: options.accent } : {}),
      },
    };
  return layout;
}
