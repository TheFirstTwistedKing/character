import { normalizeCharacter, PORTRAIT_PATH } from "./character";
export type Statement = { bind(...values: unknown[]): Statement; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }>; run(): Promise<{ meta: { changes?: number } }> };
export type CharacterDatabase = { prepare(query: string): Statement };
type Row = { id: string; name: string; data: string; revision: number; updated_at: string };
const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
export async function characterRequest(request: Request, email: string | null, db: CharacterDatabase | undefined, id?: string) {
  if (!email) return json({ error: "저장 기능을 이용하려면 ChatGPT로 로그인해주세요.", code: "AUTH_REQUIRED" }, 401);
  if (!db) return json({ error: "저장 공간을 준비 중이에요. 잠시 후 다시 시도해주세요." }, 503);
  if (id && !validId.test(id)) return json({ error: "올바른 슬롯을 선택해주세요." }, 400);
  const owner = email.trim().toLowerCase();
  const method = request.method;
  if (method !== "GET" && (request.headers.get("Sec-Fetch-Site") === "cross-site" || request.headers.get("X-Persona-Write") !== "1")) return json({ error: "요청을 확인할 수 없어요." }, 403);
  try {
    if (method === "GET") {
      if (id) {
        const row = await db.prepare("SELECT id, name, data, revision, updated_at FROM character_slots WHERE owner = ? AND id = ?").bind(owner, id).first<Row>();
        return row ? json({ slot: { id: row.id, name: row.name, revision: row.revision, updatedAt: row.updated_at }, character: normalizeCharacter(JSON.parse(row.data)) }) : json({ error: "삭제되었거나 찾을 수 없는 슬롯이에요." }, 404);
      }
      const rows = await db.prepare("SELECT id, name, revision, updated_at FROM character_slots WHERE owner = ? ORDER BY updated_at DESC, id").bind(owner).all<Row>();
      return json({ slots: rows.results.map(r => ({ id: r.id, name: r.name, revision: r.revision, updatedAt: r.updated_at })) });
    }
    if (method === "DELETE" && id) {
      const revision = Number(new URL(request.url).searchParams.get("revision"));
      if (!Number.isInteger(revision) || revision < 1) return json({ error: "슬롯을 다시 불러와주세요." }, 400);
      const result = await db.prepare("DELETE FROM character_slots WHERE owner = ? AND id = ? AND revision = ?").bind(owner, id, revision).run();
      return result.meta.changes ? json({ deleted: true }) : json({ error: "슬롯이 변경되었어요. 목록을 새로고침해주세요." }, 409);
    }
    if (method !== "POST" && method !== "PUT") return json({ error: "지원하지 않는 요청이에요." }, 405);
    if (!request.headers.get("Content-Type")?.includes("application/json")) return json({ error: "JSON 형식으로 저장해주세요." }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "저장할 캐릭터가 없어요." }, 400);
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 65536) { await reader.cancel(); return json({ error: "캐릭터 설정이 너무 커요." }, 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let body;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json({ error: "캐릭터 데이터를 읽지 못했어요." }, 400); }
    let character;
    try { character = normalizeCharacter(body.character); } catch (e) { return json({ error: e instanceof Error ? e.message : "올바르지 않은 캐릭터예요." }, 400); }
    if (character.portrait && !PORTRAIT_PATH.test(character.portrait.url)) return json({ error: "사진을 먼저 업로드해주세요." }, 400);
    const name = character.name || "이름 없는 캐릭터", now = new Date().toISOString();
    if (method === "POST" && !id) {
      const newId = body.id;
      if (typeof newId !== "string" || !validId.test(newId)) return json({ error: "슬롯 번호가 올바르지 않아요." }, 400);
      await db.prepare("INSERT INTO character_slots (id, owner, name, data, revision, updated_at) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(owner, id) DO NOTHING").bind(newId, owner, name, JSON.stringify(character), now).run();
      const row = await db.prepare("SELECT id, name, revision, updated_at FROM character_slots WHERE owner = ? AND id = ?").bind(owner, newId).first<Row>();
      return json({ slot: { id: row!.id, name: row!.name, revision: row!.revision, updatedAt: row!.updated_at } }, 201);
    }
    if (method === "PUT" && id && Number.isInteger(body.revision) && body.revision >= 1) {
      const result = await db.prepare("UPDATE character_slots SET name = ?, data = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND id = ? AND revision = ?").bind(name, JSON.stringify(character), now, owner, id, body.revision).run();
      return result.meta.changes ? json({ slot: { id, name, revision: body.revision + 1, updatedAt: now } }) : json({ error: "다른 화면에서 슬롯이 변경됐어요. 새 슬롯에 저장하거나 다시 불러와주세요." }, 409);
    }
    return json({ error: "저장 요청이 올바르지 않아요." }, 400);
  } catch { return json({ error: "저장 공간에 연결하지 못했어요. 잠시 후 다시 시도해주세요." }, 500); }
}
