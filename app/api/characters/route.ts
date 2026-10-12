import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { characterRequest, type CharacterDatabase } from "@/lib/character-store";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  const user = await getChatGPTUser();
  return characterRequest(request, user?.email ?? null, (env as unknown as { DB?: CharacterDatabase }).DB);
}
export const GET = handle;
export const POST = handle;
