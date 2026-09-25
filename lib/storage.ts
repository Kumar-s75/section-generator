import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { savedLayoutSchema, type UINode } from "./schema";

// Atomic replacement keeps readers from observing a partially written document.
// Inject the path in tests; production can point it at a persistent disk.
export function createFileStorage(filePath: string) {
  return {
    async save(layout: UINode, prompt?: string) {
      const saved = savedLayoutSchema.parse({
        schemaVersion: 1,
        ...(prompt !== undefined ? { prompt } : {}),
        layout,
        savedAt: new Date().toISOString(),
      });
      await mkdir(dirname(filePath), { recursive: true });
      const temporary = `${filePath}.${randomUUID()}.tmp`;
      try {
        const file = await open(temporary, "wx", 0o600);
        try {
          await file.writeFile(JSON.stringify(saved), "utf8");
          await file.sync();
        } finally {
          await file.close();
        }
        await rename(temporary, filePath);
      } finally {
        await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
      return saved;
    },
    async get() {
      let raw: string;
      try {
        raw = await readFile(filePath, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
      return savedLayoutSchema.parse(JSON.parse(raw));
    },
  };
}
function storage() {
  return createFileStorage(
    // Runtime documents belong on the deployment volume, not in the build bundle.
    resolve(
      /* turbopackIgnore: true */ process.env.LAYOUT_STORAGE_PATH ??
        ".data/layout.json",
    ),
  );
}
export const saveLayout = (layout: UINode, prompt?: string) =>
  storage().save(layout, prompt);
export const getSavedLayout = () => storage().get();
