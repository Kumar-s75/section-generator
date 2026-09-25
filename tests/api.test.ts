import { describe, expect, it, vi } from "vitest";
import { POST as generate } from "@/app/api/generate/route";
import { GET, POST as save } from "@/app/api/save/route";
import { heroLayout } from "@/lib/layouts";
const request = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    body: JSON.stringify(body),
  });
describe("API handlers", () => {
  it("generates both layouts through the route", async () => {
    for (const keyword of ["hero", "pricing"]) {
      const result = await generate(request({ prompt: keyword.toUpperCase() }));
      expect(result.status).toBe(200);
      expect((await result.json()).layout.id).toBe(`${keyword}-section`);
    }
  });
  it("returns useful 400 responses for empty, unsupported, and malformed prompts", async () => {
    for (const body of [
      { prompt: " " },
      { prompt: "footer" },
      { prompt: 7 },
      {},
    ])
      expect((await generate(request(body))).status).toBe(400);
    const result = await generate(
      new Request("http://localhost/api", { method: "POST", body: "{" }),
    );
    expect(result.status).toBe(400);
    expect((await result.json()).error).toMatch(/valid JSON/);
  });
  it("round-trips edited layout and rejects malformed trees", async () => {
    const layout = heroLayout();
    layout.children![0].children![1].props!.text = "Saved from API";
    const result = await save(request({ layout }));
    expect(result.status).toBe(200);
    expect((await result.json()).success).toBe(true);
    expect((await (await GET()).json()).layout).toEqual(layout);
    expect(
      (await save(request({ layout: { id: "bad", type: "html" } }))).status,
    ).toBe(400);
  });
});

it("reports storage read/write errors as 500 without exposing filesystem paths", async () => {
  // A regular file cannot serve as the directory of another file.
  const { writeFile } = await import("node:fs/promises");
  const path = process.env.LAYOUT_STORAGE_PATH!;
  await writeFile(path, "not a directory");
  vi.stubEnv("LAYOUT_STORAGE_PATH", `${path}/layout.json`);
  expect((await save(request({ layout: heroLayout() }))).status).toBe(500);
  const result = await GET();
  expect(result.status).toBe(500);
  expect(JSON.stringify(await result.json())).not.toContain(path);
});
