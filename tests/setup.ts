import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "forma-unit-"));
  vi.stubEnv("LAYOUT_STORAGE_PATH", join(directory, "layout.json"));
});
afterEach(async () => {
  cleanup();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});
