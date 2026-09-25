import { saveSchema, type UINode } from "@/lib/schema";
import { saveLayout, getSavedLayout } from "@/lib/storage";
import { badRequest, parseBody } from "@/lib/api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let layout: UINode;
  let prompt: string | undefined;
  try {
    ({ layout, prompt } = await parseBody(request, saveSchema));
  } catch (error) {
    return badRequest(error);
  }
  try {
    const saved = await saveLayout(layout, prompt);
    return Response.json({ success: true, savedAt: saved.savedAt });
  } catch {
    return Response.json(
      {
        error:
          "Could not write your section to storage. Please try saving again.",
      },
      { status: 500 },
    );
  }
}
export async function GET() {
  try {
    return Response.json(
      (await getSavedLayout()) ?? { layout: null, savedAt: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "Could not restore the saved section. Your stored file has not been changed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
