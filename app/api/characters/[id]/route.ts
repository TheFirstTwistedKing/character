import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { characterRequest, type CharacterDatabase } from "@/lib/character-store";
export const dynamic = "force-dynamic";
async function handle(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  const { id } = await context.params;
  return characterRequest(request, user?.email ?? null, (env as unknown as { DB?: CharacterDatabase }).DB, id);
}
export const GET = handle;
export const PUT = handle;
export const DELETE = handle;
