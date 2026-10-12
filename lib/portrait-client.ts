import { MAX_PORTRAIT_BYTES, PORTRAIT_PATH, type Portrait } from "./character";
import { AuthRequiredError } from "./auth-required";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function portraitFilename(name: string, mime: string) {
  return `${(name || "캐릭터").replace(/[^\p{L}\p{N}_-]+/gu, "_")}_portrait.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`;
}
async function validateImage(blob: Blob) {
  if (!IMAGE_TYPES.includes(blob.type)) throw new Error("JPG, PNG, WEBP 사진을 선택해주세요.");
  if (blob.size > MAX_PORTRAIT_BYTES) throw new Error("사진은 5MB 이하로 올려주세요.");
  if (!blob.size) throw new Error("사진 파일이 비어 있어요.");
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth * image.naturalHeight <= 50_000_000 ? resolve() : reject(new Error("사진 해상도를 줄인 뒤 다시 올려주세요."));
      image.onerror = () => reject(new Error("사진을 읽지 못했어요. 다른 이미지 파일을 선택해주세요."));
      image.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}
export async function uploadPortrait(blob: Blob, name: string): Promise<Portrait> {
  await validateImage(blob);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("/api/portraits", { method: "POST", headers: { "Content-Type": blob.type, "X-Persona-Upload": "1" }, body: blob, signal: controller.signal });
    if (response.status === 401) throw new AuthRequiredError();
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.url || !PORTRAIT_PATH.test(result.url)) throw new Error(result?.error || "사진을 올리지 못했어요. 다시 시도해주세요.");
    return { url: result.url, name: name.slice(0, 160), fit: "contain" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("사진 업로드가 지연되고 있어요. 다시 시도해주세요.");
    throw error;
  } finally { clearTimeout(timer); }
}
export async function portraitBlob(photo: Portrait): Promise<Blob> {
  const response = await fetch(photo.url, { signal: AbortSignal.timeout(30_000) });
  if (response.status === 401) throw new AuthRequiredError();
  if (!response.ok) throw new Error("캐릭터 사진을 불러오지 못했어요. 사진을 다시 넣은 뒤 내보내주세요.");
  const blob = await response.blob();
  if (!IMAGE_TYPES.includes(blob.type) || blob.size > MAX_PORTRAIT_BYTES) throw new Error("사진 파일을 확인할 수 없어요. 사진을 다시 선택해주세요.");
  return blob;
}
export function blobDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("사진 백업을 만들지 못했어요."));
    reader.onerror = () => reject(new Error("사진 백업을 만들지 못했어요."));
    reader.readAsDataURL(blob);
  });
}
