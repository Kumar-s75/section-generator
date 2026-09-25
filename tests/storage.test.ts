import { expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { createFileStorage } from "@/lib/storage";
import { heroLayout, pricingLayout } from "@/lib/layouts";
it("survives a fresh storage instance and handles missing files", async () => {
  const path = process.env.LAYOUT_STORAGE_PATH!;
  expect(await createFileStorage(path).get()).toBeNull();
  const saved = await createFileStorage(path).save(heroLayout());
  expect(await createFileStorage(path).get()).toEqual(saved);
  expect(JSON.parse(await readFile(path, "utf8")).schemaVersion).toBe(1);
});
it("rejects corrupted and unsupported records without overwriting them", async () => {
  const path = process.env.LAYOUT_STORAGE_PATH!;
  for (const content of [
    "{broken",
    JSON.stringify({
      schemaVersion: 2,
      layout: heroLayout(),
      savedAt: new Date().toISOString(),
    }),
  ]) {
    await writeFile(path, content);
    await expect(createFileStorage(path).get()).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe(content);
  }
});
it("concurrent saves always leave one complete validated document", async () => {
  const store = createFileStorage(process.env.LAYOUT_STORAGE_PATH!);
  await Promise.all([store.save(heroLayout()), store.save(pricingLayout())]);
  const saved = await store.get();
  expect([heroLayout(), pricingLayout()]).toContainEqual(saved?.layout);
});
