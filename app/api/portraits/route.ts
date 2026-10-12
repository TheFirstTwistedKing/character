import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { putPortrait, type PortraitBucket } from "@/lib/portrait-store";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  return putPortrait(request, user?.email ?? null, (env as unknown as { BUCKET?: PortraitBucket }).BUCKET);
}
