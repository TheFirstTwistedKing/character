import { bodyReferenceRanges, skillDescription, BASE_CLASSES, SCENES, STAT_INFO, STAT_KEYS, describeBody, dialogueSignature, estimateBody, hexToRgb, type Character } from "./character";
import { weaponRecordSections } from "./weapon-rules";

export const SHEET_WIDTH = 3200;
export const SHEET_MIN_HEIGHT = 1800;
export const SHEET_FONT = '"Rasyancut Sheet", "Malgun Gothic", "Noto Sans CJK KR", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
const INK = "#161411", PAPER = "#F3E7D5", GOLD = "#C6A34F", MUTED = "#756957", RULE = "#8D806B";
type TextBlock = { key: string; title: string; text: string; x: number; y: number; width: number; size: number; leading: number; maxLines: number; weight?: number };
type LaidBlock = TextBlock & { lines: string[]; note?: number };
type Note = { title: string; lines: string[]; x: number; y: number; width: number; height: number; number: number };
export type SheetPlan = { width: number; height: number; blocks: LaidBlock[]; notes: Note[] };
export type SheetImage = { source: CanvasImageSource; width: number; height: number };
export type SheetAssets = { logo: SheetImage; portrait?: SheetImage | null };
function font(ctx: CanvasRenderingContext2D, size: number, weight = 400, serif = false) { ctx.font = `${weight} ${size}px ${serif ? '"Rasyancut Sheet", Georgia, "Times New Roman", serif' : SHEET_FONT}`; }

export function wrapSheetText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.trim().replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").split("\n")) {
    if (!paragraph.trim()) { lines.push(""); continue; }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/u)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ""; }
      const graphemes = typeof Intl.Segmenter === "function" ? Array.from(new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(word), part => part.segment) : Array.from(word);
      for (const character of graphemes) {
        if (line && ctx.measureText(line + character).width > width) { lines.push(line); line = ""; }
        line += character;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : ["미정"];
}

export function planCharacterSheet(ctx: CanvasRenderingContext2D, c: Character): SheetPlan {
  const ranges = bodyReferenceRanges(c.height);
  const entries: TextBlock[] = [
    { key: "affiliation", title: "소속", text: c.affiliation || "미정", x:268, y:722, width:294, size:21, leading:26, maxLines:1 },
    { key: "body-ranges", title: "키에 따른 적당한 범위 (창작용)", text: `근육 ${ranges.muscle.min.toFixed(1)}–${ranges.muscle.max.toFixed(1)} kg / 지방 ${ranges.fat.min.toFixed(1)}–${ranges.fat.max.toFixed(1)} kg (상한 미만, 반올림 표시)`, x:108, y:1064, width:454, size:18, leading:23, maxLines:2 },
    { key: "skills", title: "전투 스킬", text: "스킬 · " + (c.combatSkills.map(skill => skillDescription(c, skill)).join("\n\n") || "추가한 스킬 없음"), x:1570, y:1220, width:1520, size:20, leading:25, maxLines:2 },
    { key: "name", title: "캐릭터 이름", text: c.name || "이름 없는 캐릭터", x: 108, y: 356, width: 454, size: 40, leading: 51, maxLines: 2, weight: 700 },
    { key: "concept", title: "한 줄 소개", text: c.concept || "아직 기록되지 않은 이야기", x: 108, y: 472, width: 454, size: 24, leading: 32, maxLines: 3 },
    { key: "keywords", title: "성격 키워드", text: c.keywords.join(" · ") || "미정", x: 108, y: 1252, width: 454, size: 25, leading: 34, maxLines: 3 },
    { key: "likes", title: "좋아하는 것", text: c.likes || "미정", x: 108, y: 1484, width: 454, size: 24, leading: 33, maxLines: 2 },
    { key: "dislikes", title: "싫어하는 것", text: c.dislikes || "미정", x: 108, y: 1610, width: 454, size: 24, leading: 33, maxLines: 2 },
    { key: "tags", title: "전투 특성", text: c.combatTags.join(" · ") || "미정", x: 1570, y: 1035, width: 1520, size: 24, leading: 32, maxLines: 2 },
    { key: "style", title: "전투 스타일", text: c.combatStyle || "미정", x: 1570, y: 1150, width: 1520, size: 24, leading: 30, maxLines: 2 },
    ...SCENES.map((scene, i) => ({ key: `dialogue-${i}`, title: `${scene.name} 대사`, text: c.dialogue[i] || "아직 작성한 대사가 없어요.", x: 1570 + i * 517, y: 1450, width: 460, size: 25, leading: 34, maxLines: 6 })),
  ];
  const notes: Note[] = [], columns = [1830, 1830];
  const blocks = entries.map(entry => {
    font(ctx, entry.size, entry.weight);
    const lines = wrapSheetText(ctx, entry.text, entry.width);
    if (lines.length <= entry.maxLines) return { ...entry, lines };
    const number = notes.length + 1, column = columns[0] <= columns[1] ? 0 : 1;
    font(ctx, 25);
    const fullLines = wrapSheetText(ctx, entry.text, 1424);
    const height = 92 + fullLines.length * 36;
    notes.push({ title: entry.title, lines: fullLines, x: 80 + column * 1540, y: columns[column], width: 1500, height, number });
    columns[column] += height + 24;
    return { ...entry, lines: [...lines.slice(0, entry.maxLines - 1), `… [상세 기록 ${String(number).padStart(2, "0")}]`], note: number };
  });
  const profileRecords = c.profileTraits.length ? [{ title: "프로필 특성 · NPC 유형", text: c.profileTraits.join(" · ") }] : [];
  for (const record of [...profileRecords, ...weaponRecordSections(c)]) {
    const number = notes.length + 1, column = columns[0] <= columns[1] ? 0 : 1;
    font(ctx, 25);
    const lines = wrapSheetText(ctx, record.text, 1424), height = 92 + lines.length * 36;
    notes.push({ title: record.title, lines, x: 80 + column * 1540, y: columns[column], width: 1500, height, number });
    columns[column] += height + 24;
  }
  return { width: SHEET_WIDTH, height: notes.length ? Math.max(...columns) + 70 : SHEET_MIN_HEIGHT, blocks, notes };
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size = 24, color = INK, weight = 400, serif = false, align: CanvasTextAlign = "left") {
  font(ctx, size, weight, serif); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic"; ctx.fillText(value, x, y + ctx.measureText(value).actualBoundingBoxAscent);
}
function line(ctx: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number, color = RULE, width = 1.5) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function polygon(ctx: CanvasRenderingContext2D, points: number[][], fill?: string, stroke?: string, width = 2) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function chamfer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cut: number, fill?: string, stroke?: string, width = 2) {
  polygon(ctx, [[x + cut, y], [x + w - cut, y], [x + w, y + cut], [x + w, y + h - cut], [x + w - cut, y + h], [x + cut, y + h], [x, y + h - cut], [x, y + cut]], fill, stroke, width);
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color = INK) {
  polygon(ctx, [[x, y - radius], [x + radius * .22, y - radius * .22], [x + radius, y], [x + radius * .22, y + radius * .22], [x, y + radius], [x - radius * .22, y + radius * .22], [x - radius, y], [x - radius * .22, y - radius * .22]], color);
}
function frame(ctx: CanvasRenderingContext2D, h: number) {
  ctx.fillStyle = "#080807"; ctx.fillRect(0, 0, SHEET_WIDTH, h);
  chamfer(ctx, 13, 13, SHEET_WIDTH - 26, h - 26, 74, undefined, GOLD, 2);
  chamfer(ctx, 28, 28, SHEET_WIDTH - 56, h - 56, 69, PAPER, GOLD, 2);
  polygon(ctx, [[1280, 26], [1320, 58], [1510, 58], [1540, 80], [1600, 114], [1660, 80], [1690, 58], [1880, 58], [1920, 26]], "#080807", GOLD, 2);
  star(ctx, 1600, 55, 26, GOLD);
  for (const [x, y, sx, sy] of [[10, 10, 1, 1], [3190, 10, -1, 1], [10, h - 10, 1, -1], [3190, h - 10, -1, -1]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    for (let i = 0; i < 3; i++) { line(ctx, 0, 15 + i * 16, 60 - i * 14, 0, GOLD); line(ctx, i * 14 + 10, 0, i * 14 + 10, 48 - i * 12, GOLD, 1); }
    star(ctx, 16, 16, 7, GOLD); ctx.restore();
  }
}
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, caption?: string) {
  chamfer(ctx, x, y, w, h, 12, undefined, RULE, 1.7);
  star(ctx, x + 28, y + 34, 12);
  text(ctx, title, x + 51, y + 22, 25, INK, 600, true);
  if (caption) text(ctx, caption, x + w - 24, y + 27, 18, MUTED, 400, false, "right");
  line(ctx, x + 24, y + 65, x + w - 24, y + 65, RULE, 1);
}
export function containedImageRect(imageWidth: number, imageHeight: number, x: number, y: number, width: number, height: number) {
  const ratio = Math.min(width / imageWidth, height / imageHeight);
  const w = imageWidth * ratio, h = imageHeight * ratio;
  return { x: x + (width - w) / 2, y: y + (height - h) / 2, width: w, height: h };
}
function image(ctx: CanvasRenderingContext2D, source: SheetImage, x: number, y: number, w: number, h: number) {
  const rect = containedImageRect(source.width, source.height, x, y, w, h);
  ctx.drawImage(source.source, rect.x, rect.y, rect.width, rect.height);
}
function radar(ctx: CanvasRenderingContext2D, c: Character) {
  const cx = 1830, cy = 518, radius = 124;
  const point = (i: number, r: number) => [cx + Math.sin(i * Math.PI / 3) * r, cy - Math.cos(i * Math.PI / 3) * r];
  for (const scale of [.2, .4, .6, .8, 1]) polygon(ctx, STAT_KEYS.map((_, i) => point(i, radius * scale)), undefined, RULE, 1.2);
  STAT_KEYS.forEach((key, i) => {
    const end = point(i, radius), label = point(i, radius + 43);
    line(ctx, cx, cy, end[0], end[1], RULE, 1);
    text(ctx, STAT_INFO[key].name, label[0], label[1] - 13, 23, INK, 500, false, "center");
  });
  const data = STAT_KEYS.map((key, i) => point(i, Math.min(100, Math.max(0, c.stats[key])) / 100 * radius));
  ctx.save(); ctx.globalAlpha = .3; polygon(ctx, data, c.color); ctx.restore(); polygon(ctx, data, undefined, INK, 3);
  for (const [x, y] of data) { ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill(); }
  STAT_KEYS.forEach((key, i) => {
    const y = 372 + i * 49;
    text(ctx, STAT_INFO[key].name, 2078, y, 25, INK, 500);
    ctx.fillStyle = "#DDD0BB"; ctx.fillRect(2180, y + 7, 680, 18);
    ctx.fillStyle = c.color; ctx.fillRect(2180, y + 7, c.stats[key] / 100 * 680, 18);
    ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.strokeRect(2180, y + 7, 680, 18);
    text(ctx, String(c.stats[key]), 2940, y - 1, 29, INK, 600, false, "right");
    text(ctx, "/ 100", 2954, y + 5, 20, MUTED);
  });
}

export function paintCharacterSheet(ctx: CanvasRenderingContext2D, plan: SheetPlan, c: Character, assets: SheetAssets) {
  frame(ctx, plan.height);
  image(ctx, assets.logo, 80, 65, 160, 160);
  text(ctx, "CHARACTER SHEET", 270, 77, 62, INK, 700, true);
  text(ctx, "RASYANCUT : VANGUARD", 273, 152, 26, INK, 600, true);
  text(ctx, "라시안컷 캐릭터 시트지", 274, 192, 24, MUTED);
  text(ctx, "PROFILE  /  PERSONALITY  /  COMBAT", 3118, 161, 23, INK, 400, true, "right");
  text(ctx, "당신의 이야기를 기록하다", 3118, 197, 21, MUTED, 400, false, "right");
  line(ctx, 80, 240, 3120, 240, INK, 2); star(ctx, 1496, 240, 9, GOLD);
  panel(ctx, 80, 270, 510, 875, "PROFILE", "프로필");
  panel(ctx, 80, 1173, 510, 537, "PERSONALITY", "성격과 취향");
  panel(ctx, 620, 270, 890, 1120, "CHARACTER ART", "캐릭터 사진");
  panel(ctx, 620, 1418, 890, 292, "SIGNATURE COLOR", "대표 색상");
  panel(ctx, 1540, 270, 1580, 435, "ABILITY TRAITS", "능력 수치 · 각 최대 100");
  panel(ctx, 1540, 733, 1580, 553, "COMBAT CLASS & EQUIPMENT", "계열 · 무기 · 전투 스타일");
  panel(ctx, 1540, 1314, 1580, 396, "CHARACTER VOICE", "세 가지 상황의 대사");
  const body = estimateBody(c.height, c.muscle, c.fat), labels = describeBody(c.height, c.muscle, c.fat);
  const rows = [["나이 · 성별", `${c.age}세 · ${c.gender || "미정"}`], ["종족", c.race || "미정"], ["출신 국가", c.country || "미정"], ["소속", ""], ["키", `${c.height} cm`], ["추정 몸무게", `${body.weight.toFixed(1)} kg`], ["골격근량", `${c.muscle} kg`], ["체지방률", `${c.fat}%`], ["지방량", `${body.fatMass.toFixed(1)} kg`], ["근육 상태", labels.muscle], ["지방 상태", labels.fat]];
  rows.forEach(([label, value], i) => {
    const y = 593 + i * 42;
    ctx.fillStyle = INK; ctx.fillRect(108, y, 144, 32);
    text(ctx, label, 180, y + 5, 19, PAPER, 500, false, "center");
    text(ctx, value, 268, y + 3, 21, INK, 500);
  });
  line(ctx, 108, 1054, 562, 1054);
  text(ctx, "모든 종족 공통 · 창작용 추정", 108, 1120, 17, MUTED);
  text(ctx, `IQ  ${c.iq}`, 108, 1372, 27, INK, 600);
  text(ctx, `말투 · ${c.register === "polite" ? "존댓말" : c.register === "casual" ? "반말" : "성격에 맞춤"}`, 108, 1410, 22, MUTED);
  text(ctx, "좋아하는 것", 108, 1452, 21, INK, 600); text(ctx, "싫어하는 것", 108, 1578, 21, INK, 600);
  line(ctx, 108, 1554, 562, 1554, RULE, 1);
  const art = { x: 650, y: 357, w: 830, h: 984 };
  if (assets.portrait) image(ctx, assets.portrait, art.x, art.y, art.w, art.h);
  else {
    ctx.save(); ctx.setLineDash([6, 10]); ctx.strokeStyle = "#C6B99F"; ctx.lineWidth = 2; ctx.strokeRect(art.x + 30, art.y + 20, art.w - 60, art.h - 40); ctx.restore();
    star(ctx, 1065, 773, 25, "#B4A68E");
    text(ctx, "CHARACTER PORTRAIT", 1065, 835, 30, MUTED, 400, true, "center");
    text(ctx, "캐릭터 사진을 넣으면 여기에 표시돼요", 1065, 884, 22, MUTED, 400, false, "center");
  }
  text(ctx, "RASYANCUT  /  CHARACTER MAKER", 1065, 1354, 18, MUTED, 400, true, "center");
  ctx.fillStyle = c.color; ctx.fillRect(650, 1513, 162, 155); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(650, 1513, 162, 155);
  text(ctx, c.color, 852, 1515, 39, INK, 600);
  text(ctx, `RGB  ${hexToRgb(c.color).join("  ·  ")}`, 852, 1579, 26, INK);
  text(ctx, "캐릭터를 대표하는 하나의 색", 852, 1631, 22, MUTED);
  radar(ctx, c);
  const triplet = (items: string[][], y: number) => items.forEach(([label, value], i) => {
    text(ctx, label, 1570 + i * 507, y, 20, MUTED); text(ctx, value, 1570 + i * 507, y + 32, 28, INK, 600);
  });
  triplet([["주무기", c.primaryWeapon || "미정"], ["보조무기", c.secondaryWeapon || "미정"], ["장 등급", c.stageRank || "미정"]], 817);
  triplet([["베이스 계열 · base class", c.baseClass || "선택 사항 없음"], ["나이트 계열 · knight class", "선택 사항 없음"], ["초월자 · Transcendent class", "선택 사항 없음"]], 911);
  text(ctx, BASE_CLASSES.find(entry => entry.name === c.baseClass)?.description || "베이스 계열을 선택하면 직업 설명이 표시돼요.", 1570, 984, 23, MUTED);
  line(ctx, 1570, 1020, 3090, 1020, RULE, 1);
  text(ctx, "전투 스타일", 1570, 1119, 21, INK, 600);
  SCENES.forEach((scene, i) => {
    const x = 1570 + i * 517;
    if (i) line(ctx, x - 17, 1405, x - 17, 1650, RULE, 1);
    text(ctx, `0${i + 1}  ${scene.name}`, x, 1406, 22, INK, 600);
  });
  const stale = c.dialogue.length > 0 && c.dialogueSignature !== dialogueSignature(c.keywords, c.register, c.iq);
  text(ctx, stale ? "※ 현재 성격·말투·IQ로 다시 생성하지 않은 대사입니다." : "성격·IQ를 바탕으로 작성한 창작용 대사", 1570, 1680, 18, MUTED);
  for (const block of plan.blocks) block.lines.forEach((value, i) => text(ctx, value, block.x, block.y + i * block.leading, block.note && i === block.lines.length - 1 ? Math.min(21, block.size) : block.size, block.note && i === block.lines.length - 1 ? MUTED : INK, block.weight));
  if (plan.notes.length) {
    star(ctx, 96, 1773, 12); text(ctx, "EXTENDED RECORD", 124, 1759, 28, INK, 600, true);
    text(ctx, "상세 기록 · 본문에 담지 못한 내용을 이어서 기록합니다", 465, 1764, 22, MUTED);
    line(ctx, 1110, 1775, 3120, 1775, RULE, 1.5);
    for (const note of plan.notes) {
      chamfer(ctx, note.x, note.y, note.width, note.height, 12, undefined, RULE, 1.4);
      text(ctx, `${String(note.number).padStart(2, "0")}  ${note.title}`, note.x + 30, note.y + 23, 25, INK, 600);
      line(ctx, note.x + 30, note.y + 61, note.x + note.width - 30, note.y + 61, RULE, 1);
      note.lines.forEach((value, i) => text(ctx, value, note.x + 30, note.y + 78 + i * 36, 25));
    }
  }
  text(ctx, "Rasyancut : Vanguard  ·  Character Maker", 1600, plan.height - 64, 18, MUTED, 400, true, "center");
}
