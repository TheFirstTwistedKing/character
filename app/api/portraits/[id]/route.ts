import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getPortrait, type PortraitBucket } from "@/lib/portrait-store";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  const { id } = await context.params;
  return getPortrait(id, user?.email ?? null, (env as unknown as { BUCKET?: PortraitBucket }).BUCKET);
}
