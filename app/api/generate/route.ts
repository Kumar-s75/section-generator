import { generateSchema } from "@/lib/schema";
import { generateLayout } from "@/lib/layouts";
import { badRequest, parseBody } from "@/lib/api";
export async function POST(request: Request) {
  try {
    const { prompt } = await parseBody(request, generateSchema);
    const layout = generateLayout(prompt);
    if (!layout)
      return Response.json(
        { error: "Try a prompt containing “hero” or “pricing”." },
        { status: 400 },
      );
    await new Promise((resolve) => setTimeout(resolve, 500));
    return Response.json({ layout });
  } catch (error) {
    return badRequest(error);
  }
}
