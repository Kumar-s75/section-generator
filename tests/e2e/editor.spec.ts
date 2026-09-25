import { test, expect } from "@playwright/test";
import { unlink } from "node:fs/promises";
test.beforeEach(async () => {
  await unlink(".data/e2e-layout.json").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    },
  );
});
test("generate both layouts, edit, inspect, save, and render on mobile", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("What would you like to build?")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Generate section", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Describe a hero or pricing",
  );
  await page.screenshot({
    path: "test-results/empty-desktop.png",
    fullPage: true,
  });
  for (const kind of ["hero", "pricing"]) {
    await page
      .getByLabel("Describe your section")
      .fill(`Build a ${kind} section`);
    await page
      .getByRole("button", { name: "Generate section", exact: true })
      .click();
    const title = page.getByRole("textbox", {
      name: kind === "pricing" ? "Edit plan-name-1" : "Edit hero-title",
      exact: true,
    });
    await expect(title).toBeVisible();
    await title.fill(`Edited ${kind} title`);
    await page.getByLabel("View options").click();
    await page
      .getByRole("button", { name: "Mobile preview", exact: true })
      .click();
    await expect(title).toHaveText(`Edited ${kind} title`);
    await page.getByRole("tab", { name: "JSON" }).click();
    await expect(page.locator("pre")).toContainText(`Edited ${kind} title`);
    await page.getByRole("tab", { name: "Preview", exact: true }).click();
    await expect(title).toHaveText(`Edited ${kind} title`);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Changes saved");
    const saved = await (await request.get("/api/save")).json();
    expect(JSON.stringify(saved.layout)).toContain(`Edited ${kind} title`);
    await page.reload();
    await expect(page.getByRole("status")).toContainText("restored");
    await expect(title).toHaveText(`Edited ${kind} title`);

    await page.getByLabel("View options").click();
    await page
      .getByRole("button", { name: "Desktop preview", exact: true })
      .click();
    await page.getByLabel("View options").click();
    await page.screenshot({
      path: `test-results/${kind}-desktop.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("textbox", { name: "Edit plan-name-1", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/pricing-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("shows API errors, preserves edits, and confirms replacement", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Describe your section").fill("footer");
  await page
    .getByRole("button", { name: "Generate section", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("hero");
  await page.getByLabel("Describe your section").fill("hero");
  await page
    .getByRole("button", { name: "Generate section", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Edit hero-title", exact: true }),
  ).toBeVisible();
  await page.route("/api/save", (route) =>
    route.fulfill({
      status: 500,
      json: { error: "Temporary storage failure" },
    }),
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Temporary storage failure",
  );
  await page.getByLabel("Describe your section").fill("pricing");
  await page
    .getByRole("button", { name: "Generate section", exact: true })
    .click();
  await expect(
    page.getByText("Generating a new section will replace"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Replace section", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Edit plan-name-1", exact: true }),
  ).toBeVisible();
});

test("customizes pricing and restores design options after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Describe your section")
    .fill(
      'Pricing for "Orbit" with 4 tiers, annual billing in EUR, dark theme and indigo accent',
    );
  await page
    .getByRole("button", { name: "Generate section", exact: true })
    .click();
  await expect(page.locator(".pricing-card")).toHaveCount(4);
  await expect(page.getByText("€290", { exact: false })).toBeVisible();
  await expect(page.locator(".generated-section")).toHaveClass(
    /theme-dark accent-indigo/,
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await page.reload();
  await expect(page.getByRole("status")).toContainText("restored");
  await expect(page.locator(".pricing-card")).toHaveCount(4);
  await expect(page.locator(".generated-section")).toHaveClass(
    /theme-dark accent-indigo/,
  );
  await page.screenshot({
    path: "test-results/custom-pricing.png",
    fullPage: true,
  });
});

test("matches the reference geometry and saves inline formatting", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1184, height: 596 });
  await page.goto("/");
  await page
    .getByLabel("Describe your section")
    .fill("Build a pricing section with 3 tiers");
  await page
    .getByRole("button", { name: "Generate section", exact: true })
    .click();
  const pro = page.getByRole("textbox", {
    name: "Edit plan-name-1",
    exact: true,
  });
  await expect(pro).toBeFocused();
  await expect(
    page.getByRole("toolbar", { name: "Text formatting" }),
  ).toBeVisible();
  await expect(page.locator(".pricing-card")).toHaveCount(3);
  const header = await page.locator(".builder-toolbar").boundingBox();
  const grid = await page.locator(".pricing-grid").boundingBox();
  const first = await page.locator(".pricing-card").first().boundingBox();
  expect(header?.height).toBe(41);
  expect(first?.width).toBe(168);
  expect(Math.abs(grid!.x + grid!.width / 2 - 592)).toBeLessThanOrEqual(1);
  await page.getByLabel("Describe your section").fill("");
  await pro.focus();
  await pro.evaluate((element) =>
    window.getSelection()?.selectAllChildren(element),
  );
  await expect
    .poll(
      () =>
        page
          .getByRole("status")
          .evaluate((element) => getComputedStyle(element).opacity),
      { timeout: 10000 },
    )
    .toBe("0");
  await page.screenshot({ path: "test-results/reference-match.png" });
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  await expect(pro).toHaveCSS("font-style", "italic");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(pro).toHaveCSS("font-weight", "400");
  await page.getByRole("button", { name: "Edit link", exact: true }).click();
  await page.getByLabel("Link URL").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.locator(".link-popover").getByRole("alert")).toContainText(
    "http or https",
  );
  await page.getByLabel("Link URL").fill("https://example.com");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  expect(
    JSON.stringify((await (await request.get("/api/save")).json()).layout),
  ).toContain('"italic":true');
  await page.reload();
  await expect(pro).toHaveCSS("font-style", "italic");
  await expect(pro).toHaveCSS("font-weight", "400");
});
