import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("saved edits survive a complete production server restart", async ({
  page,
  request,
}) => {
  test.setTimeout(45000);
  const directory = await mkdtemp(join(tmpdir(), "forma-restart-"));
  const baseURL = "http://localhost:3101";
  let server: ChildProcess | undefined;
  let logs = "";
  async function start() {
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "--port", "3101"],
      {
        env: {
          ...process.env,
          LAYOUT_STORAGE_PATH: join(directory, "layout.json"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    server.stdout?.on("data", (chunk) => {
      logs += String(chunk);
    });
    server.stderr?.on("data", (chunk) => {
      logs += String(chunk);
    });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(`Server exited: ${logs}`);
      try {
        if ((await request.get(`${baseURL}/api/save`)).ok()) return;
      } catch {
        /* Wait for the listener. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Server did not start: ${logs}`);
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    const stopped = new Promise<void>((resolve) =>
      server!.once("exit", () => resolve()),
    );
    server.kill("SIGTERM");
    await stopped;
  }
  try {
    await start();
    const response = await request.post(`${baseURL}/api/generate`, {
      data: { prompt: 'hero headline "Survives a restart"' },
    });
    const { layout } = await response.json();
    expect(
      (await request.post(`${baseURL}/api/save`, { data: { layout } })).ok(),
    ).toBe(true);
    await stop();
    await start();
    const saved = await (await request.get(`${baseURL}/api/save`)).json();
    expect(saved.layout).toEqual(layout);
    await page.goto(baseURL);
    await expect(
      page.getByRole("textbox", { name: "Edit hero-title", exact: true }),
    ).toHaveText("Survives a restart");
    await expect(page.getByRole("status")).toContainText("restored");
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
