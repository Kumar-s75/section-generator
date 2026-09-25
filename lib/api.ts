import { z } from "zod";
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const raw = await request.text();
  if (raw.length > 250000) throw new Error("Request is too large.");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error("Send a valid JSON request.");
  }
  const result = schema.safeParse(body);
  if (!result.success)
    throw new Error(result.error.issues[0]?.message ?? "Invalid request.");
  return result.data;
}
export function badRequest(error: unknown) {
  return Response.json(
    { error: error instanceof Error ? error.message : "Invalid request." },
    { status: 400 },
  );
}
