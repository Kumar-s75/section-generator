import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { generateLayout, heroLayout, pricingLayout } from "@/lib/layouts";
import { updateNodeText } from "@/lib/tree";
import { layoutSchema, type UINode } from "@/lib/schema";
import { RecursiveRenderer } from "@/components/recursive-renderer";
import { saveLayout, getSavedLayout } from "@/lib/storage";

describe("keyword generation", () => {
  it("returns distinct valid hero and pricing trees, case insensitively", () => {
    expect(generateLayout("Create a HERO")).toEqual(heroLayout());
    expect(generateLayout("Build PRICING with 3 tiers")).toEqual(
      pricingLayout(),
    );
    expect(layoutSchema.safeParse(heroLayout()).success).toBe(true);
    expect(layoutSchema.safeParse(pricingLayout()).success).toBe(true);
    expect(
      pricingLayout().children?.find((node) => node.type === "pricingGrid")
        ?.children,
    ).toHaveLength(3);
  });
  it("rejects unsupported prompts and gives pricing precedence", () => {
    expect(generateLayout("footer")).toBeNull();
    expect(generateLayout("hero and pricing")?.id).toBe("pricing-section");
  });
});
describe("immutable tree updates", () => {
  it("updates only the node with matching ID and shares unchanged branches", () => {
    const original = pricingLayout();
    const updated = updateNodeText(original, "feature-1-2", "New feature");
    expect(updated).not.toBe(original);
    expect(updated.children?.[0].children?.[0]).toBe(
      original.children?.[0].children?.[0],
    );
    expect(JSON.stringify(updated)).toContain("New feature");
    expect(JSON.stringify(original)).not.toContain("New feature");
    expect(updateNodeText(updated, "missing", "ignored")).toBe(updated);
    expect(
      JSON.stringify(updated).replace("New feature", "Unlimited Projects"),
    ).toBe(JSON.stringify(original));
  });
});
describe("layout validation and storage", () => {
  it("rejects duplicate IDs, unknown types, invalid roots, extra properties and excessive depth", () => {
    expect(
      layoutSchema.safeParse({
        id: "root",
        type: "section",
        children: [{ id: "root", type: "heading" }],
      }).success,
    ).toBe(false);
    expect(layoutSchema.safeParse({ id: "root", type: "script" }).success).toBe(
      false,
    );
    expect(
      layoutSchema.safeParse({ id: "root", type: "heading" }).success,
    ).toBe(false);
    expect(
      layoutSchema.safeParse({ ...heroLayout(), html: "<script />" }).success,
    ).toBe(false);
    let deep: UINode = { id: "leaf", type: "paragraph" };
    for (let i = 0; i < 22; i++)
      deep = { id: String(i), type: "section", children: [deep] };
    expect(layoutSchema.safeParse(deep).success).toBe(false);
  });
  it("stores an isolated copy with a timestamp", async () => {
    const layout = heroLayout();
    const saved = await saveLayout(layout);
    layout.id = "changed";
    saved.layout.id = "also-changed";
    expect((await getSavedLayout())?.layout.id).toBe("hero-section");
    expect(Number.isNaN(Date.parse(saved.savedAt))).toBe(false);
  });
});
describe("recursive renderer", () => {
  it("renders deeply nested features and sends the correct ID when edited", () => {
    const onTextChange = vi.fn();
    render(
      <RecursiveRenderer node={pricingLayout()} onTextChange={onTextChange} />,
    );
    expect(screen.getByText("Premipited Projects")).toBeInTheDocument();
    const editable = screen.getByRole("textbox", { name: "Edit feature-1-2" });
    editable.textContent = "Updated support";
    fireEvent.input(editable);
    expect(onTextChange).toHaveBeenCalledWith("feature-1-2", "Updated support");
  });
  it("preserves edited content across a rerender", () => {
    const original = heroLayout();
    const { rerender } = render(
      <RecursiveRenderer node={original} onTextChange={() => {}} />,
    );
    const title = screen.getByRole("textbox", { name: "Edit hero-title" });
    title.textContent = "A new title";
    fireEvent.input(title);
    rerender(
      <RecursiveRenderer
        node={updateNodeText(original, "hero-title", "A new title")}
        onTextChange={() => {}}
      />,
    );
    expect(title).toHaveTextContent("A new title");
  });
  it("handles unknown node types without dropping children", () => {
    const node = {
      id: "unknown",
      type: "future",
      children: [
        { id: "nested", type: "paragraph", props: { text: "Still visible" } },
      ],
    } as unknown as UINode;
    render(<RecursiveRenderer node={node} onTextChange={() => {}} />);
    expect(screen.getByRole("note")).toHaveTextContent("Unsupported element");
    expect(screen.getByText("Still visible")).toBeInTheDocument();
  });
});
