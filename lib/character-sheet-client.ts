import type { Character } from "./character";
import { SHEET_FONT, SHEET_WIDTH, SHEET_MIN_HEIGHT, planCharacterSheet, paintCharacterSheet, type SheetImage } from "./character-sheet";
export type SheetFormat = "png" | "jpg";
let fontReady: Promise<void> | undefined;
async function loadSheetFont() {
  if (!fontReady) fontReady = (async () => {
    const response = await fetch("/fonts/NanumMyeongjo-Regular.ttf", { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("시트 글꼴을 불러오지 못했어요. 다시 시도해주세요.");
    const face = await new FontFace("Rasyancut Sheet", await response.arrayBuffer()).load();
    document.fonts.add(face);
  })().catch(error => { fontReady = undefined; throw error; });
  return fontReady;
}
function loadImage(src: string): Promise<SheetImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ""; reject(new Error("시트 이미지를 준비하는 데 시간이 걸리고 있어요. 다시 시도해주세요.")); }, 15000);
    image.onload = () => { clearTimeout(timer); resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { clearTimeout(timer); reject(new Error("시트에 넣을 이미지를 읽지 못했어요. 다시 시도해주세요.")); };
    image.src = src;
  });
}
export function sheetFilename(name: string, format: SheetFormat) {
  return `${(name || "캐릭터").replace(/[^\p{L}\p{N}_-]+/gu, "_")}_라시안컷_캐릭터_시트지.${format}`;
}
export async function exportCharacterSheet(character: Character, format: SheetFormat, portrait: Blob | null): Promise<Blob> {
  const portraitUrl = portrait ? URL.createObjectURL(portrait) : null;
  const canvas = document.createElement("canvas");
  try {
    const [logo, picture] = await Promise.all([loadImage("/rasyancut-logo.png"), portraitUrl ? loadImage(portraitUrl) : null, loadSheetFont()]);
    await document.fonts.load(`25px ${SHEET_FONT}`, "라시안컷 캐릭터 시트지");
    canvas.width = SHEET_WIDTH; canvas.height = SHEET_MIN_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("이 브라우저에서 이미지 시트를 만들 수 없어요.");
    const plan = planCharacterSheet(ctx, character);
    // Bound large exports for browsers with a 16 MP canvas limit.
    const scale = Math.min(1, Math.sqrt(15_000_000 / (plan.width * plan.height)), 8192 / plan.height);
    canvas.width = Math.floor(plan.width * scale); canvas.height = Math.floor(plan.height * scale);
    ctx.scale(scale, scale); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    paintCharacterSheet(ctx, plan, character, { logo, portrait: picture });
    const mime = format === "png" ? "image/png" : "image/jpeg";
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => {
      if (!blob || blob.type !== mime) reject(new Error("이미지 파일을 만들지 못했어요. 다른 형식으로 다시 시도해주세요."));
      else resolve(blob);
    }, mime, .95));
  } finally {
    if (portraitUrl) URL.revokeObjectURL(portraitUrl);
    canvas.width = 1; canvas.height = 1;
  }
}
