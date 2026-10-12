import { MAX_PORTRAIT_BYTES } from "./character";

export interface PortraitBucket {
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

export function imageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 16) return null;
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return "image/png";
  if (new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}
async function userPrefix(email: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  return "portraits/" + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
export async function putPortrait(request: Request, email: string | null, bucket?: PortraitBucket) {
  if (!email) return error("사진을 올리려면 사이트에 다시 로그인해주세요.", 401);
  if (!bucket) return error("사진을 저장하지 못했어요. 잠시 후 다시 시도해주세요.", 503);
  if (request.headers.get("Sec-Fetch-Site") === "cross-site" || request.headers.get("X-Persona-Upload") !== "1") return error("사진 업로드 요청을 확인할 수 없어요.", 403);
  const contentType = request.headers.get("Content-Type")?.split(";")[0];
  if (!contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) return error("JPG, PNG, WEBP 사진만 올릴 수 있어요.", 415);
  if (Number(request.headers.get("Content-Length") || 0) > MAX_PORTRAIT_BYTES) return error("사진은 5MB 이하로 올려주세요.", 413);
  const reader = request.body?.getReader();
  if (!reader) return error("사진 파일이 비어 있어요.", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_PORTRAIT_BYTES) { await reader.cancel(); return error("사진은 5MB 이하로 올려주세요.", 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let position = 0;
    for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; }
    const mime = imageMime(bytes);
    if (!mime || mime !== contentType) return error("읽을 수 있는 JPG, PNG, WEBP 사진을 선택해주세요.", 415);
    const id = crypto.randomUUID();
    await bucket.put(`${await userPrefix(email)}/${id}`, bytes.buffer, { httpMetadata: { contentType: mime } });
    return Response.json({ url: `/api/portraits/${id}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return error("사진을 저장하지 못했어요. 다시 시도해주세요.", 500); }
}
export async function getPortrait(id: string, email: string | null, bucket?: PortraitBucket) {
  if (!email) return error("사이트에 다시 로그인해주세요.", 401);
  if (!UUID.test(id)) return error("사진을 찾을 수 없어요.", 404);
  if (!bucket) return error("사진을 불러오지 못했어요. 잠시 후 다시 시도해주세요.", 503);
  try {
    const object = await bucket.get(`${await userPrefix(email)}/${id}`);
    if (!object) return error("사진을 찾을 수 없어요.", 404);
    return new Response(object.body, { headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600", "Vary": "Cookie, Authorization, oai-authenticated-user-email",
      "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline",
    } });
  } catch { return error("사진을 불러오지 못했어요. 다시 시도해주세요.", 500); }
}
