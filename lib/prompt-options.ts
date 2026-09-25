export type PromptOptions = {
  tiers: number;
  annual: boolean;
  currency: "$" | "€" | "£" | "₹";
  brand?: string;
  headline?: string;
  cta?: string;
  theme?: "dark" | "light";
  accent?: "sage" | "indigo" | "rose";
};
export function parsePromptOptions(prompt: string): PromptOptions {
  const tierMatch = prompt.match(
    /\b(\d+|one|two|three|four)\s*[- ]?\s*(?:tiers?|plans?|columns?)\b/i,
  );
  const numbers: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
  const tiers = tierMatch
    ? (numbers[tierMatch[1].toLowerCase()] ?? Number(tierMatch[1]))
    : 3;
  if (tiers < 1 || tiers > 4)
    throw new Error("Choose between 1 and 4 pricing tiers.");
  const quoted = (labels: string) =>
    prompt
      .match(new RegExp(`\\b(?:${labels})\\s*:?\\s*["“]([^"”]+)["”]`, "i"))?.[1]
      .trim();
  const brand = quoted("for|brand");
  if (brand && brand.length > 100)
    throw new Error("Keep the brand name under 100 characters.");
  return {
    tiers,
    annual: /\b(annual|annually|yearly|year)\b/i.test(prompt),
    currency: /\b(EUR|euros?)\b|€/i.test(prompt)
      ? "€"
      : /\b(GBP|pounds?)\b|£/i.test(prompt)
        ? "£"
        : /\b(INR|rupees?)\b|₹/i.test(prompt)
          ? "₹"
          : "$",
    brand,
    headline: quoted("headline|heading|title"),
    cta: quoted("cta|button"),
    theme: /\bdark\b/i.test(prompt)
      ? "dark"
      : /\blight\b/i.test(prompt)
        ? "light"
        : undefined,
    accent: /\b(indigo|purple)\b/i.test(prompt)
      ? "indigo"
      : /\b(rose|pink)\b/i.test(prompt)
        ? "rose"
        : /\bsage\b/i.test(prompt)
          ? "sage"
          : undefined,
  };
}
