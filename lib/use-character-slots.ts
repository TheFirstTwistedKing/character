"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { normalizeCharacter, type Character } from "./character";
import { AuthRequiredError } from "./auth-required";
export type Slot = { id: string; name: string; revision: number; updatedAt: string };
const LEGACY_KEY = "persona-studio-character-v1";
async function api(path = "", options: RequestInit = {}) {
  const response = await fetch(`/api/characters${path}`, { ...options, headers: { "Content-Type": "application/json", "X-Persona-Write": "1" }, signal: AbortSignal.timeout(20000) });
  if (response.status === 401) throw new AuthRequiredError();
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "저장 공간에 연결할 수 없어요.");
  return result;
}
export function useCharacterSlots(character: Character, setCharacter: (c: Character) => void, signedIn = true) {
  const [slots, setSlots] = useState<Slot[]>([]), [current, setCurrent] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(signedIn), [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(!signedIn);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const initialized = useRef(false), lock = useRef(false);
  const pendingCreate = useRef<{ snapshot: string; id: string } | null>(null);
  const serialized = JSON.stringify(character), saved = serialized === savedSnapshot;
  const requireSignIn = () => { setAuthRequired(true); setError(""); };
  const report = (e: unknown) => {
    if (e instanceof AuthRequiredError) { requireSignIn(); return; }
    const message = e instanceof Error ? e.message : "저장 작업을 완료하지 못했어요."; setError(message); toast.error(message);
  };
  async function refresh() { const result = await api(); setSlots(result.slots); return result.slots as Slot[]; }
  useEffect(() => {
    if (initialized.current) return; initialized.current = true;
    if (!signedIn) return;
    void (async () => {
      try {
        const list = await refresh();
        let legacy: string | null = null;
        try { if (!localStorage.getItem(`${LEGACY_KEY}-migrated`)) legacy = localStorage.getItem(LEGACY_KEY); } catch { /* Browser storage may be unavailable. */ }
        if (legacy) {
          const restored = normalizeCharacter(JSON.parse(legacy));
          setCharacter(restored);
          const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(legacy)))].map(b => b.toString(16).padStart(2, "0")).join("");
          const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
          const result = await api("", { method: "POST", body: JSON.stringify({ id, character: restored }) });
          const canonical = await api(`/${result.slot.id}`);
          const migrated = normalizeCharacter(canonical.character);
          setCharacter(migrated); setCurrent(canonical.slot); setSavedSnapshot(JSON.stringify(migrated));
          try { localStorage.setItem(`${LEGACY_KEY}-migrated`, "1"); } catch { /* Original backup remains intact. */ }
          await refresh(); toast.success("기존 브라우저 저장본을 첫 슬롯으로 옮겼어요.");
        } else if (list.length) {
          const result = await api(`/${list[0].id}`); const restored = normalizeCharacter(result.character);
          setCharacter(restored); setCurrent(result.slot); setSavedSnapshot(JSON.stringify(restored));
        }
      } catch (e) { report(e); }
      finally { setBusy(false); }
    })();
  }, []);
  async function save(asNew = false) {
    if (authRequired) return;
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    const snapshot = serialized;
    try {
      const existing = asNew ? null : current;
      if (!pendingCreate.current || pendingCreate.current.snapshot !== snapshot) pendingCreate.current = { snapshot, id: crypto.randomUUID() };
      const result = await api(existing ? `/${existing.id}` : "", { method: existing ? "PUT" : "POST", body: JSON.stringify({ character, revision: existing?.revision, id: pendingCreate.current.id }) });
      setCurrent(result.slot); setSavedSnapshot(snapshot); pendingCreate.current = null;
      setSlots(prev => [result.slot, ...prev.filter(s => s.id !== result.slot.id)]);
      toast.success(existing ? "현재 슬롯에 저장했어요." : "새 슬롯에 캐릭터를 저장했어요.");
    } catch (e) { report(e); }
    finally { lock.current = false; setBusy(false); }
  }
  async function load(slot: Slot) {
    if (authRequired) return;
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { const result = await api(`/${slot.id}`); const restored = normalizeCharacter(result.character); setCharacter(restored); setCurrent(result.slot); setSavedSnapshot(JSON.stringify(restored)); toast.success("캐릭터를 불러왔어요."); }
    catch (e) { report(e); } finally { lock.current = false; setBusy(false); }
  }
  async function remove(slot: Slot) {
    if (authRequired) return;
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { await api(`/${slot.id}?revision=${slot.revision}`, { method: "DELETE" }); setSlots(prev => prev.filter(s => s.id !== slot.id)); if (current?.id === slot.id) { setCurrent(null); setSavedSnapshot(""); } toast.success("슬롯을 삭제했어요. 현재 편집 화면은 유지돼요."); }
    catch (e) { report(e); } finally { lock.current = false; setBusy(false); }
  }
  async function reloadList() { if (lock.current || authRequired) return; lock.current = true; setBusy(true); try { await refresh(); setError(""); } catch (e) { report(e); } finally { lock.current = false; setBusy(false); } }
  function detach() { setCurrent(null); setSavedSnapshot(""); pendingCreate.current = null; }
  return { slots, current, busy, error, saved, save, load, remove, reloadList, detach, authRequired, requireSignIn };
}
