import { expect, it } from "vitest";
import { generateLayout } from "@/lib/layouts";
import { layoutSchema } from "@/lib/schema";
it("composes four branded yearly euro plans with an allowlisted theme", () => {
  const layout = generateLayout(
    'Pricing for "Orbit" with four tiers, annual billing in EUR, dark theme and indigo accent',
  )!;
  expect(layoutSchema.safeParse(layout).success).toBe(true);
  expect(layout.props).toEqual({ theme: "dark", accent: "indigo" });
  const plans = layout.children!.find(
    (node) => node.type === "pricingGrid",
  )!.children!;
  expect(plans).toHaveLength(4);
  expect(
    plans[1].children?.find((node) => node.type === "price")?.props,
  ).toMatchObject({
    price: "€290",
    billingPeriod: "/yr",
  });
  expect(JSON.stringify(layout)).toContain("Find your fit with Orbit.");
});
it("supports one/two tiers and explicit hero copy without interpreting HTML", () => {
  for (const [word, number] of [
    ["one", 1],
    ["two", 2],
  ] as const) {
    const layout = generateLayout(`pricing with ${word} tiers in GBP`)!;
    expect(
      layout.children!.find((node) => node.type === "pricingGrid")!.children,
    ).toHaveLength(number);
  }
  const hero = generateLayout(
    'hero headline "<b>My title</b>" button "Join now" with rose accent',
  )!;
  expect(JSON.stringify(hero)).toContain("<b>My title</b>");
  expect(JSON.stringify(hero)).toContain("Join now");
  expect(layoutSchema.safeParse(hero).success).toBe(true);
});
it("rejects unsupported tier counts rather than silently returning three", () => {
  expect(() => generateLayout("pricing with 9 tiers")).toThrow("1 and 4");
  expect(() => generateLayout("pricing with 0 tiers")).toThrow("1 and 4");
});
