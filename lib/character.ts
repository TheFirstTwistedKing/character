import { PERSONALITY_CATALOG } from "./personality-catalog.ts";
import { catalogDialogueLines, catalogIqLine } from "./personality-dialogues.ts";
import { DEFAULT_WEAPON_SETUP, normalizeWeaponSetup, weaponRecordSections, type WeaponSetup } from "./weapon-rules.ts";
import { normalizeDebuffs, debuffDescription, type SkillDebuff } from "./combat-catalog.ts";
import { normalizeTrainer, normalizeProfileTraits, type TrainerId, type ProfileTrait } from "./trainers.ts";
export { COMBAT_TAGS } from "./combat-catalog.ts";

export const STAT_KEYS = ["str", "con", "energy", "dex", "cha", "wis"] as const;
export type StatKey = typeof STAT_KEYS[number];
export const STAT_INFO: Record<StatKey, { name: string; en: string; detail: string; color: string }> = {
  str: { name: "근력", en: "STR", detail: "힘 · 신체의 출력", color: "#ed9e92" },
  con: { name: "맷집", en: "RES", detail: "충격을 견디는 힘", color: "#9ccda4" },
  energy: { name: "기력", en: "ENG", detail: "활동을 이어가는 에너지", color: "#92bce6" },
  dex: { name: "순발력", en: "AGI", detail: "빠른 반응 · 순간 움직임", color: "#e0be79" },
  cha: { name: "매력", en: "CHA", detail: "표현 · 사람을 끄는 힘", color: "#e49fc1" },
  wis: { name: "통찰", en: "INS", detail: "관찰 · 본질을 읽는 눈", color: "#bd9bea" },
};
// Countries are maintained here by the site administrator, never by character writers.
export const COUNTRIES = ["레스렉시온", "버믹쿠루시아", "은월", "아스트랄리스", "엘라렌", "코르닉시아", "추풍", "스텔마레", "스텔루비아", "글라시카에룰리아", "백월", "리바이어던"] as const;
export type Country = typeof COUNTRIES[number] | "";
export const RACES = ["인간", "반암형인", "암형체"] as const;
export type Race = typeof RACES[number] | "";
export const GENERAL_AFFILIATIONS = ["기업", "사무소", "국가 친위대", "범죄 조직", "방랑자"] as const;
export const LEVIATHAN_AFFILIATIONS = ["Stage Management", "R.S.S.", "Leviathan's Register", "Memorial Extraction", "Sovereign's hand", "Unbreakable Shield", "Judgement Operation"] as const;
export type Affiliation = typeof GENERAL_AFFILIATIONS[number] | typeof LEVIATHAN_AFFILIATIONS[number] | "";
export function affiliationOptions(country: Country): readonly Affiliation[] {
  return !country ? [] : country === "리바이어던" ? LEVIATHAN_AFFILIATIONS : GENERAL_AFFILIATIONS;
}
export function selectCountry(country: Country, affiliation: Affiliation) {
  return { country, affiliation: affiliationOptions(country).includes(affiliation) ? affiliation : "" as Affiliation };
}
export type CombatSkill = { stat: StatKey; multiplier: number; name?: string; debuffs?: SkillDebuff[] };
export function skillName(skill: CombatSkill) { return skill.name?.trim() || `${STAT_INFO[skill.stat].name} 스킬`; }
export function skillDescription(c: Character, skill: CombatSkill) {
  return `${skillName(skill)} · ${STAT_INFO[skill.stat].name} ${c.stats[skill.stat]} × ${skill.multiplier}배 = ${skillValue(c.stats, skill)}` + (skill.debuffs?.length ? `\n디버프: ${skill.debuffs.map(d => `${d.type} — ${debuffDescription(d)}`).join(" / ")}\n지속 시간·중첩 규칙 미정. 디버프 피해는 기본 결과에 합산하지 않음.` : "");
}
export function skillValue(stats: Character["stats"], skill: CombatSkill) {
  return Math.round(stats[skill.stat] * clamp(skill.multiplier, 1, 3) * 10) / 10;
}
export type Gender = "남" | "여" | "";
export const BASE_CLASSES = [
  { name: "블레이드", description: "검을 쓰는 직업" },
  { name: "레인저", description: "가벼운 무기를 쓰는 직업" },
  { name: "가디언", description: "무거운 무기를 쓰는 직업" },
  { name: "슈터", description: "원거리 무기를 쓰는 직업" },
  { name: "랜서", description: "창과 방패에 대응하는 직업" },
  { name: "메딕", description: "가벼운 무기를 쓰는 의료 전문 직업" },
  { name: "크러셔", description: "무기 파괴 전문 직업" },
  { name: "터렛", description: "쉴드건 무기만 쓰는 직업" },
  { name: "테이머", description: "채찍이 무기인 조련 전문 직업" },
  { name: "인더스트리얼", description: "쉴드건을 제외한 모든 무기에 대응하지만 전문성이 낮은 직업" },
] as const;
export type BaseClass = typeof BASE_CLASSES[number]["name"] | "";
export const WEAPONS = ["단검", "쇼트소드", "롱소드", "그레이트소드", "건틀렛", "한손 둔기", "양손 둔기", "한손 도끼", "양손 도끼", "창", "월도", "새총", "활", "석궁", "권총", "기관총", "저격총", "중화기", "쉴드건", "채찍", "방패", "투척무기"] as const;
export type Weapon = typeof WEAPONS[number] | "";
export function weaponsForSlot(slot: "primaryWeapon" | "secondaryWeapon") {
  return WEAPONS.filter(weapon => slot === "secondaryWeapon" || weapon !== "방패");
}
export const STAGE_RANKS = ["10장", "9장", "8장", "7장", "6장", "5장", "4장", "준3장", "3장", "준2장", "2장", "준1장", "1장", "신장"] as const;
export type StageRank = typeof STAGE_RANKS[number] | "";
export type Portrait = { url: string; name: string; fit: "contain" | "cover" };
export const MAX_PORTRAIT_BYTES = 5 * 1024 * 1024;
export const MAX_PORTRAIT_DATA_LENGTH = Math.ceil(MAX_PORTRAIT_BYTES / 3) * 4 + 64;
export const PORTRAIT_PATH = /^\/api\/portraits\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function normalizePortrait(raw: unknown): Portrait | null {
  if (!raw || typeof raw !== "object") return null;
  const photo = raw as Record<string, unknown>;
  if (typeof photo.url !== "string") return null;
  const valid = PORTRAIT_PATH.test(photo.url) || (photo.url.length <= MAX_PORTRAIT_DATA_LENGTH && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.url));
  if (!valid) throw new Error("사진은 JPG, PNG, WEBP 파일로 넣어주세요.");
  return { url: photo.url, name: typeof photo.name === "string" ? photo.name.slice(0, 160) : "캐릭터 사진", fit: photo.fit === "cover" ? "cover" : "contain" };
}
export type Character = {
  schemaVersion: 7; age: number; country: Country; iq: number; gender: Gender;
  trainerId: TrainerId; profileTraits: ProfileTrait[];
  weaponSetup: WeaponSetup;
  race: Race; affiliation: Affiliation; combatSkills: CombatSkill[];
  baseClass: BaseClass; knightClass: ""; transcendentClass: "";
  name: string; concept: string; height: number; muscle: number; fat: number;
  keywords: string[]; register: "auto" | "casual" | "polite";
  color: string; stats: Record<StatKey, number>;
  dialogue: string[]; dialogueSignature: string;
  portrait: Portrait | null; likes: string; dislikes: string;
  primaryWeapon: Weapon; secondaryWeapon: Weapon; combatStyle: string; combatTags: string[]; stageRank: StageRank;
};
export const DEFAULT_CHARACTER: Character = {
  schemaVersion: 7, age: 25, country: "", iq: 110, gender: "",
  trainerId: "", profileTraits: [],
  weaponSetup: structuredClone(DEFAULT_WEAPON_SETUP),
  race: "", affiliation: "", combatSkills: [],
  baseClass: "", knightClass: "", transcendentClass: "",
  name: "아린", concept: "새벽을 기록하는 방랑자", height: 178, muscle: 32, fat: 18,
  keywords: ["차분함", "다정함", "신중함"], register: "auto", color: "#A78BFA",
  stats: { str: 10, con: 10, energy: 10, dex: 14, cha: 12, wis: 14 },
  dialogue: [], dialogueSignature: "",
  portrait: null, likes: "", dislikes: "", primaryWeapon: "", secondaryWeapon: "", combatStyle: "", combatTags: [], stageRank: "",
};
export const SCENES = [
  { name: "일상에서", hint: "동료와 길을 나설 때", en: "EVERYDAY" },
  { name: "갈등 앞에서", hint: "뜻밖의 위험과 마주할 때", en: "CONFLICT" },
  { name: "진심을 꺼낼 때", hint: "소중한 사람에게 속마음을 전할 때", en: "INNER VOICE" },
];
export function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)); }
export function estimateBody(height: number, muscle: number, fat: number) {
  const h = clamp(height, 80, 260), m = clamp(muscle, 5, 100), f = clamp(fat, 3, 60);
  // An explicitly fictional adult-humanoid design heuristic, not a medical model.
  const otherLean = 9 * (h / 100) ** 2;
  const weight = (m + otherLean) / (1 - f / 100);
  return { weight, otherLean, fatMass: weight * f / 100, muscleShare: m / weight * 100, otherShare: otherLean / weight * 100 };
}
export function bodyReferenceRanges(height: number) {
  const squaredHeight = (clamp(height, 80, 260) / 100) ** 2;
  return { muscle: { min: 8.5 * squaredHeight, max: 12 * squaredHeight }, fat: { min: 3 * squaredHeight, max: 7 * squaredHeight } };
}
export function describeBody(height: number, muscle: number, fat: number) {
  const ranges = bodyReferenceRanges(height), mass = estimateBody(height, muscle, fat).fatMass;
  const muscleLevel = muscle < ranges.muscle.min ? 0 : muscle < ranges.muscle.max ? 1 : 2;
  const fatLevel = mass < ranges.fat.min ? 0 : mass < ranges.fat.max ? 1 : 2;
  // Creative labels only; these thresholds are not clinical reference ranges.
  return {
    muscle: ["부실한 근육", "적당한 근육", "많은 근육"][muscleLevel],
    fat: ["적은 지방량", "적당한 지방량", "많은 지방량"][fatLevel],
    muscleLevel, fatLevel,
  };
}
export function selectWeapon(c: Pick<Character, "primaryWeapon" | "secondaryWeapon">, slot: "primaryWeapon" | "secondaryWeapon", weapon: Weapon) {
  if (weapon && !WEAPONS.includes(weapon)) throw new Error("목록에서 무기를 선택해주세요.");
  if (slot === "primaryWeapon" && weapon === "방패") throw new Error("방패는 보조무기로만 선택할 수 있어요.");
  const other = slot === "primaryWeapon" ? c.secondaryWeapon : c.primaryWeapon;
  if (weapon && weapon === other) throw new Error("주무기와 보조무기는 같을 수 없어요. 다른 무기를 선택해주세요.");
  return { primaryWeapon: c.primaryWeapon, secondaryWeapon: c.secondaryWeapon, [slot]: weapon };
}
export function updateStat(stats: Character["stats"], key: StatKey, requested: number) {
  return { ...stats, [key]: Math.round(clamp(requested, 0, 100)) };
}
export function iqStyle(iq: number) { return iq < 100 ? "단순하고 직관적인 말투" : iq < 120 ? "일상적이고 균형 잡힌 말투" : "근거와 맥락을 짚는 분석적인 말투"; }
export function hexToRgb(hex: string) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
export function rgbToHex(rgb: number[]) { return "#" + rgb.map(n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase(); }
export function rgbToHsv(rgb: number[]) {
  const [r, g, b] = rgb.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta) h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max ? delta / max * 100 : 0, v: max * 100 };
}
export function hsvToHex(h: number, s: number, v: number) {
  const c = v / 100 * s / 100, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v / 100 - c;
  const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex(rgb.map(n => (n + m) * 255));
}
export function readableInk(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(n => { const v = n / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b > .179 ? "#151419" : "#FFFFFF";
}

type Pair = [string, string];
type Voice = { id: string; words: string[]; style: string; polite?: boolean; lines: [Pair[], Pair[], Pair[]]; catalogKey?: string };
const VOICES: Voice[] = [
  { id: "차분함", words: ["차분", "침착", "냉정", "평온", "담담", "무덤덤"], style: "서두르지 않는 문장과 담백한 표현", lines: [
    [["서두를 것 없어. 아직 아침 공기가 좋네.", "서두를 것 없어요. 아직 아침 공기가 좋네요."], ["길은 길어. 오늘은 우리 속도로 걷자.", "길은 길어요. 오늘은 우리 속도로 걸어요."], ["차가 조금 식었어. 마시기엔 지금이 좋겠다.", "차가 조금 식었어요. 마시기엔 지금이 좋겠네요."]],
    [["잠깐, 숨부터 고르자. 무슨 일이 있었는지 순서대로 말해줘.", "잠깐, 숨부터 골라요. 무슨 일이 있었는지 순서대로 말해줘요."], ["아직 끝난 건 아니야. 출구부터 확인하자.", "아직 끝난 건 아니에요. 출구부터 확인해요."], ["목소리를 높여도 달라질 건 없어. 하나씩 풀어보자.", "목소리를 높여도 달라질 건 없어요. 하나씩 풀어봐요."]],
    [["별말 없이 곁에 있어줘서, 그게 참 고마웠어.", "별말 없이 곁에 있어줘서, 그게 참 고마웠어요."], ["표현을 잘 못했지. 네가 오는 날은 늘 기다렸어.", "표현을 잘 못했죠. 당신이 오는 날은 늘 기다렸어요."], ["함께 걷는 시간이 생각보다 오래 기억에 남더라.", "함께 걷는 시간이 생각보다 오래 기억에 남더라고요."]],
  ] },
  { id: "다정함", words: ["다정", "친절", "따뜻", "배려", "온화", "상냥", "공감", "착한", "착함"], style: "상대를 먼저 살피는 부드러운 말", lines: [
    [["추우면 말해. 내 겉옷을 같이 덮으면 되니까.", "추우면 말해줘요. 제 겉옷을 같이 덮으면 되니까요."], ["네 몫도 챙겨뒀어. 같이 먹고 출발할까?", "당신 몫도 챙겨뒀어요. 같이 먹고 출발할까요?"], ["오늘은 좀 피곤해 보이네. 잠깐 쉬어 가도 괜찮아.", "오늘은 좀 피곤해 보이네요. 잠깐 쉬어 가도 괜찮아요."]],
    [["다친 데는 없어? 괜찮아, 네 잘못이 아니야. 같이 방법을 찾자.", "다친 데는 없어요? 괜찮아요, 당신 잘못이 아니에요. 같이 방법을 찾아요."], ["혼자 감당하려고 하지 마. 내 손 잡아.", "혼자 감당하려고 하지 마요. 제 손 잡아요."], ["무서워도 괜찮아. 여기서 너를 두고 가지 않을게.", "무서워도 괜찮아요. 여기서 당신을 두고 가지 않을게요."]],
    [["네가 웃으면, 오늘 하루는 그걸로 충분하더라.", "당신이 웃으면, 오늘 하루는 그걸로 충분하더라고요."], ["잘하지 않아도 돼. 나는 그냥 네 편이고 싶어.", "잘하지 않아도 돼요. 저는 그냥 당신 편이고 싶어요."], ["기댈 곳이 필요하면 나한테 와. 이유는 묻지 않을게.", "기댈 곳이 필요하면 제게 와요. 이유는 묻지 않을게요."]],
  ] },
  { id: "신중함", words: ["신중", "조심", "걱정", "불안", "경계", "보수"], style: "가능성을 살피고 한 번 더 확인하는 말", lines: [
    [["지도는 챙겼지? 돌아오는 길도 미리 알아두자.", "지도는 챙겼죠? 돌아오는 길도 미리 알아둬요."], ["날이 흐리네. 우산 하나는 더 가져가자.", "날이 흐리네요. 우산 하나는 더 가져가요."], ["문단속만 한 번 더 확인할게. 금방 끝나.", "문단속만 한 번 더 확인할게요. 금방 끝나요."]],
    [["움직이기 전에 주변부터 살펴. 함정일 수도 있어.", "움직이기 전에 주변부터 살펴요. 함정일 수도 있어요."], ["확실한 건 아직 없어. 눈으로 확인한 것만 말해줘.", "확실한 건 아직 없어요. 눈으로 확인한 것만 말해줘요."], ["가장 안전한 길을 찾자. 돌아가더라도 괜찮아.", "가장 안전한 길을 찾아요. 돌아가더라도 괜찮아요."]],
    [["몇 번이나 망설였어. 그래도 이 말은 꼭 전하고 싶었어.", "몇 번이나 망설였어요. 그래도 이 말은 꼭 전하고 싶었어요."], ["약속은 쉽게 못 하겠어. 대신 지킬 수 있는 만큼 오래 곁에 있을게.", "약속은 쉽게 못 하겠어요. 대신 지킬 수 있는 만큼 오래 곁에 있을게요."], ["겁이 나서 늦었어. 너를 소중하게 생각한다는 말이.", "겁이 나서 늦었어요. 당신을 소중하게 생각한다는 말이요."]],
  ] },
  { id: "과묵함", words: ["과묵", "무뚝뚝", "말수", "무심", "무표정", "내성", "조용", "차가", "냉담"], style: "짧은 문장과 절제된 감정", lines: [
    [["준비됐어. 가자.", "준비됐어요. 가요."], ["여기. 네 몫.", "여기요. 당신 몫이에요."], ["날이 좋네. 걷자.", "날이 좋네요. 걸어요."]],
    [["내 뒤에 있어. 움직이지 마.", "제 뒤에 있어요. 움직이지 마요."], ["괜찮아. 아직 버틸 수 있어.", "괜찮아요. 아직 버틸 수 있어요."], ["말은 나중에. 손 줘.", "말은 나중에 해요. 손 줘요."]],
    [["...기다렸어.", "...기다렸어요."], ["네가 있어서 다행이야.", "당신이 있어서 다행이에요."], ["가지 마. 조금만 더.", "가지 마요. 조금만 더요."]],
  ] },
  { id: "자신감", words: ["자신", "당당", "오만", "거만", "자존심", "도도", "대담", "용감"], style: "주저 없는 단정과 주도적인 표현", lines: [
    [["오늘도 꽤 근사한 날이 되겠는데. 내가 앞장설게.", "오늘도 꽤 근사한 날이 되겠네요. 제가 앞장설게요."], ["길을 잃을 걱정은 마. 내가 있잖아.", "길을 잃을 걱정은 마요. 제가 있잖아요."], ["준비됐지? 오늘의 주인공은 우리야.", "준비됐죠? 오늘의 주인공은 우리예요."]],
    [["물러서지 마. 이 정도로 우리를 막을 순 없어.", "물러서지 마요. 이 정도로 우리를 막을 순 없어요."], ["불가능하다고? 그럼 내가 먼저 해볼게.", "불가능하다고요? 그럼 제가 먼저 해볼게요."], ["고개 들어. 아직 내 차례가 남았어.", "고개 들어요. 아직 제 차례가 남았어요."]],
    [["누구든 대신할 수 있다고 생각했는데, 너는 아니더라.", "누구든 대신할 수 있다고 생각했는데, 당신은 아니더라고요."], ["인정할게. 네 앞에서는 멋진 말이 잘 안 떠올라.", "인정할게요. 당신 앞에서는 멋진 말이 잘 안 떠올라요."], ["내 선택을 믿어. 나는 너와 함께 가기로 했어.", "제 선택을 믿어요. 저는 당신과 함께 가기로 했어요."]],
  ] },
  { id: "장난기", words: ["장난", "유쾌", "쾌활", "능글", "명랑", "활발", "외향", "유머", "밝음", "밝은"], style: "가벼운 농담과 생기 있는 질문", lines: [
    [["늦잠 아니거든? 꿈에서 먼저 정찰하고 온 거야.", "늦잠 아니거든요? 꿈에서 먼저 정찰하고 온 거예요."], ["오늘은 누가 간식 담당이야? 아주 중요한 문제인데.", "오늘은 누가 간식 담당이에요? 아주 중요한 문제인데요."], ["또 모험이야? 좋아, 심심할 틈은 없겠네!", "또 모험이에요? 좋아요, 심심할 틈은 없겠네요!"]],
    [["좋아, 이건 계획에 없었네. 즉흥 연기에 자신 있는 사람?", "좋아요, 이건 계획에 없었네요. 즉흥 연기에 자신 있는 분?"], ["이런, 환영 인사가 좀 과격한데? 일단 뛰자!", "이런, 환영 인사가 좀 과격한데요? 일단 뛰어요!"], ["농담은 여기까지. 이번엔 정말 내 손 놓지 마.", "농담은 여기까지예요. 이번엔 정말 제 손 놓지 마요."]],
    [["이번엔 농담 아니야. 네가 없으면, 좀 많이 심심할 것 같아.", "이번엔 농담 아니에요. 당신이 없으면, 좀 많이 심심할 것 같아요."], ["이상하지. 네 앞에선 웃기는 말보다 솔직한 말을 하고 싶어.", "이상하죠. 당신 앞에선 웃기는 말보다 솔직한 말을 하고 싶어요."], ["내 농담에 제일 먼저 웃어주는 사람이 너라서 좋아.", "제 농담에 제일 먼저 웃어주는 사람이 당신이라서 좋아요."]],
  ] },
  { id: "냉소", words: ["냉소", "시니컬", "비꼬", "까칠", "독설", "까다", "비관", "염세", "허무", "츤데레"], style: "건조한 농담과 쉽게 믿지 않는 표현", lines: [
    [["평화로운 아침이네. 얼마나 갈지는 모르겠지만.", "평화로운 아침이네요. 얼마나 갈지는 모르겠지만요."], ["또 대단한 계획이야? 이번엔 점심시간도 넣어줘.", "또 대단한 계획이에요? 이번엔 점심시간도 넣어줘요."], ["좋은 예감이라니. 지난번에도 그 말 했잖아.", "좋은 예감이라니요. 지난번에도 그 말 했잖아요."]],
    [["놀라워라. 일이 이렇게 잘못될 줄은 정말 몰랐네.", "놀라워라. 일이 이렇게 잘못될 줄은 정말 몰랐네요."], ["영웅 놀이는 나중에 해. 살아서 돌아가는 게 먼저야.", "영웅 놀이는 나중에 해요. 살아서 돌아가는 게 먼저예요."], ["역시 쉬운 일은 없네. 불평은 나가서 할게.", "역시 쉬운 일은 없네요. 불평은 나가서 할게요."]],
    [["세상에 믿을 게 없다고 생각했는데. 너는 좀 예외인가 봐.", "세상에 믿을 게 없다고 생각했는데요. 당신은 좀 예외인가 봐요."], ["귀찮게 하지 말라곤 했지만, 정말 안 오라는 뜻은 아니었어.", "귀찮게 하지 말라곤 했지만, 정말 안 오라는 뜻은 아니었어요."], ["고맙다는 말, 두 번은 안 할 거야. 잘 들어둬.", "고맙다는 말, 두 번은 안 할 거예요. 잘 들어둬요."]],
  ] },
  { id: "수줍음", words: ["소심", "수줍", "부끄", "낯가림", "겁쟁", "겁이", "겁많"], style: "머뭇거림과 조심스러운 부탁", polite: true, lines: [
    [["저기... 괜찮으면 같이 걸어도 될까?", "저기... 괜찮으면 같이 걸어도 될까요?"], ["이거, 네가 좋아한다고 해서... 하나 더 샀어.", "이거, 좋아한다고 해서... 하나 더 샀어요."], ["오늘 날씨 좋다. 아, 그냥... 그렇다고.", "오늘 날씨 좋네요. 아, 그냥... 그렇다고요."]],
    [["나도 무섭지만... 혼자 두고 갈 수는 없어.", "저도 무섭지만... 혼자 두고 갈 수는 없어요."], ["잠깐만... 내 말도 한 번만 들어줄래?", "잠깐만요... 제 말도 한 번만 들어줄래요?"], ["손, 잡아도 돼? 조금만 그러고 있자.", "손, 잡아도 돼요? 조금만 그러고 있어요."]],
    [["연습할 땐 잘됐는데... 얼굴 보니까 하나도 생각이 안 나.", "연습할 땐 잘됐는데... 얼굴 보니까 하나도 생각이 안 나요."], ["별것 아닐 수도 있지만, 나한텐 정말 소중한 시간이었어.", "별것 아닐 수도 있지만, 저한텐 정말 소중한 시간이었어요."], ["나, 사실은... 내일도 만나고 싶어.", "저, 사실은... 내일도 만나고 싶어요."]],
  ] },
  { id: "호기심", words: ["호기심", "탐구", "학구", "영리", "똑똑", "분석", "논리", "이성", "합리", "계산", "지적"], style: "관찰을 바탕으로 이유를 묻는 말", lines: [
    [["저 문양 봤어? 어제 본 지도에도 같은 게 있었는데.", "저 문양 봤어요? 어제 본 지도에도 같은 게 있었는데요."], ["잠깐만, 저건 처음 보는데. 가까이 가서 확인해볼래?", "잠깐만요, 저건 처음 보는데요. 가까이 가서 확인해볼래요?"], ["궁금하지 않아? 왜 이 길에만 꽃이 피는지.", "궁금하지 않아요? 왜 이 길에만 꽃이 피는지요."]],
    [["이상해. 소리가 일정한 간격으로 반복돼. 규칙이 있을 거야.", "이상해요. 소리가 일정한 간격으로 반복돼요. 규칙이 있을 거예요."], ["힘으로 해결하기 전에, 원인이 뭔지부터 알아보자.", "힘으로 해결하기 전에, 원인이 뭔지부터 알아봐요."], ["방금 뭘 건드렸지? 시작점을 알면 되돌릴 수 있어.", "방금 뭘 건드렸죠? 시작점을 알면 되돌릴 수 있어요."]],
    [["이유를 설명하려고 해봤는데, 그냥 네가 궁금한 거였어.", "이유를 설명하려고 해봤는데, 그냥 당신이 궁금한 거였어요."], ["함께 있으면 익숙한 것도 새로워 보여. 그게 참 신기해.", "함께 있으면 익숙한 것도 새로워 보여요. 그게 참 신기해요."], ["모든 걸 이해하고 싶었는데. 네 마음만큼은 오래 알아가고 싶어.", "모든 걸 이해하고 싶었는데요. 당신 마음만큼은 오래 알아가고 싶어요."]],
  ] },
  { id: "충동적", words: ["충동", "다혈", "성급", "불같", "급한", "급함", "열정", "저돌", "단순"], style: "감정을 곧바로 드러내는 힘 있는 말", lines: [
    [["생각은 가면서 해! 일단 출발하자!", "생각은 가면서 해요! 일단 출발해요!"], ["좋아 보이는데? 해보면 알겠지!", "좋아 보이는데요? 해보면 알겠죠!"], ["가만히 있으려니 못 참겠어. 뭐라도 하러 가자!", "가만히 있으려니 못 참겠어요. 뭐라도 하러 가요!"]],
    [["그 말 취소해. 내 동료한테 그럴 자격 없어!", "그 말 취소해요. 제 동료한테 그럴 자격 없어요!"], ["기다릴 시간 없어! 내가 먼저 갈게!", "기다릴 시간 없어요! 제가 먼저 갈게요!"], ["안 된다고 하지 마! 아직 해보지도 않았잖아!", "안 된다고 하지 마요! 아직 해보지도 않았잖아요!"]],
    [["돌려 말하는 거 못 해. 네가 좋아. 그게 전부야.", "돌려 말하는 거 못 해요. 당신이 좋아요. 그게 전부예요."], ["지금 말할래. 나중에 후회하는 건 질색이니까.", "지금 말할래요. 나중에 후회하는 건 질색이니까요."], ["나도 왜 이런지 몰라. 그냥 네 곁에 있고 싶어!", "저도 왜 이런지 몰라요. 그냥 당신 곁에 있고 싶어요!"]],
  ] },
  { id: "원칙적", words: ["원칙", "정의", "정직", "고지식", "성실", "책임", "진지", "엄격"], style: "기준과 책임을 분명히 밝히는 말", polite: true, lines: [
    [["정한 시간은 지키자. 기다리는 사람도 있으니까.", "정한 시간은 지켜요. 기다리는 사람도 있으니까요."], ["맡은 일은 마쳤어. 다음 일을 알려줘.", "맡은 일은 마쳤어요. 다음 일을 알려줘요."], ["작은 약속이라고 가볍게 넘길 순 없어.", "작은 약속이라고 가볍게 넘길 순 없어요."]],
    [["편한 길이라고 해서 옳은 길은 아니야. 이건 막아야 해.", "편한 길이라고 해서 옳은 길은 아니에요. 이건 막아야 해요."], ["내가 결정한 일이야. 책임도 내가 질게.", "제가 결정한 일이에요. 책임도 제가 질게요."], ["모르는 척하고 지나갈 수는 없어. 적어도 나는 그래.", "모르는 척하고 지나갈 수는 없어요. 적어도 저는 그래요."]],
    [["말보다 행동으로 보여줄게. 이 약속은 지킬 거야.", "말보다 행동으로 보여줄게요. 이 약속은 지킬 거예요."], ["너에게만큼은 거짓말하고 싶지 않아. 그래서 말하는 거야.", "당신에게만큼은 거짓말하고 싶지 않아요. 그래서 말하는 거예요."], ["늘 옳은 선택은 못 해도, 네 신뢰를 저버리지는 않을게.", "늘 옳은 선택은 못 해도, 당신 신뢰를 저버리지는 않을게요."]],
  ] },
  { id: "감성적", words: ["감성", "낭만", "시적", "몽상", "감정", "섬세", "예민", "우울", "외로"], style: "감각과 비유로 감정을 전하는 말", lines: [
    [["이 시간의 하늘은 꼭 다 읽지 못한 편지 같아.", "이 시간의 하늘은 꼭 다 읽지 못한 편지 같아요."], ["바람 냄새가 달라졌네. 계절이 먼저 길을 떠났나 봐.", "바람 냄새가 달라졌네요. 계절이 먼저 길을 떠났나 봐요."], ["이 순간을 기억하고 싶어. 별일 없는 오늘까지도.", "이 순간을 기억하고 싶어요. 별일 없는 오늘까지도요."]],
    [["어둡다고 길이 사라진 건 아니야. 조금만 더 찾아보자.", "어둡다고 길이 사라진 건 아니에요. 조금만 더 찾아봐요."], ["마음에 상처를 남기는 말은, 칼보다 오래 남더라.", "마음에 상처를 남기는 말은, 칼보다 오래 남더라고요."], ["끝이라고 말하지 마. 아직 우리 이야기는 남아 있어.", "끝이라고 말하지 마요. 아직 우리 이야기는 남아 있어요."]],
    [["너는 내가 돌아가고 싶은 풍경이 됐어.", "당신은 제가 돌아가고 싶은 풍경이 됐어요."], ["이름 하나가 이렇게 따뜻해질 수도 있다는 걸, 네가 알려줬어.", "이름 하나가 이렇게 따뜻해질 수도 있다는 걸, 당신이 알려줬어요."], ["다 잊는 날이 와도, 오늘의 빛만큼은 남아 있었으면 해.", "다 잊는 날이 와도, 오늘의 빛만큼은 남아 있었으면 해요."]],
  ] },
  { id: "야심", words: ["야심", "야망", "승부", "욕심", "권력", "야망", "성취", "지배"], style: "목표와 의지를 선명하게 드러내는 말", lines: [
    [["오늘은 어제보다 한 걸음 더 갈 거야. 그걸로는 부족하겠지만.", "오늘은 어제보다 한 걸음 더 갈 거예요. 그걸로는 부족하겠지만요."], ["목표가 보이는데 쉬고 있을 수는 없지.", "목표가 보이는데 쉬고 있을 수는 없죠."], ["작은 기회도 놓치지 마. 어디로 이어질지 모르니까.", "작은 기회도 놓치지 마요. 어디로 이어질지 모르니까요."]],
    [["여기까지 와서 포기하라고? 내가 뭘 걸었는지 알아?", "여기까지 와서 포기하라고요? 제가 뭘 걸었는지 알아요?"], ["이번 실패로 끝내지는 않을 거야. 다음 수를 찾겠어.", "이번 실패로 끝내지는 않을 거예요. 다음 수를 찾겠어요."], ["막아봐. 다른 길을 만들어서라도 갈 테니까.", "막아봐요. 다른 길을 만들어서라도 갈 테니까요."]],
    [["맨 위에 서면 다 괜찮을 줄 알았어. 네가 없을 거란 생각은 못 했네.", "맨 위에 서면 다 괜찮을 줄 알았어요. 당신이 없을 거란 생각은 못 했네요."], ["이기고 싶은 건 많지만, 너를 잃으면서까지는 아니야.", "이기고 싶은 건 많지만, 당신을 잃으면서까지는 아니에요."], ["꿈을 말할 때, 어느새 네 자리도 함께 생각하게 돼.", "꿈을 말할 때, 어느새 당신 자리도 함께 생각하게 돼요."]],
  ] },
  { id: "낙관적", words: ["낙관", "긍정", "희망", "천진", "순수", "순진", "해맑"], style: "가능성을 발견하고 용기를 주는 말", lines: [
    [["오늘은 좋은 일이 생길 것 같아. 이유? 그냥 그런 기분이야!", "오늘은 좋은 일이 생길 것 같아요. 이유요? 그냥 그런 기분이에요!"], ["길을 잘못 들었네. 그래도 이런 풍경은 처음이지?", "길을 잘못 들었네요. 그래도 이런 풍경은 처음이죠?"], ["비가 그치면 더 맑아질 거야. 조금만 기다려보자.", "비가 그치면 더 맑아질 거예요. 조금만 기다려봐요."]],
    [["괜찮아, 방법은 있을 거야. 우리 아직 함께 있잖아.", "괜찮아요, 방법은 있을 거예요. 우리 아직 함께 있잖아요."], ["한 번 실패한 거지, 끝난 건 아니야. 다시 해보자!", "한 번 실패한 거죠, 끝난 건 아니에요. 다시 해봐요!"], ["이번엔 내가 먼저 웃을게. 그러면 덜 무서울지도 몰라.", "이번엔 제가 먼저 웃을게요. 그러면 덜 무서울지도 몰라요."]],
    [["너랑 있으면 내일이 자꾸 기대돼. 그거면 좋은 이유 아닐까?", "당신이랑 있으면 내일이 자꾸 기대돼요. 그거면 좋은 이유 아닐까요?"], ["잘될 거라는 말, 빈말 아니야. 너를 믿으니까 하는 말이야.", "잘될 거라는 말, 빈말 아니에요. 당신을 믿으니까 하는 말이에요."], ["다음 봄에도 같이 걷자. 나는 그날을 기다릴래.", "다음 봄에도 같이 걸어요. 저는 그날을 기다릴래요."]],
  ] },
  { id: "헌신적", words: ["충성", "헌신", "의리", "보호", "희생", "충직", "믿음"], style: "곁을 지키겠다는 확고한 약속", lines: [
    [["짐은 내가 들게. 너는 길만 봐줘.", "짐은 제가 들게요. 당신은 길만 봐줘요."], ["네가 가는 곳이면 어디든 같이 갈게.", "당신이 가는 곳이면 어디든 같이 갈게요."], ["다 준비했어. 네가 말하면 출발할게.", "다 준비했어요. 당신이 말하면 출발할게요."]],
    [["돌아갈 때도 함께야. 한 사람도 두고 가지 않아.", "돌아갈 때도 함께예요. 한 사람도 두고 가지 않아요."], ["이번엔 내게 맡겨. 네가 쉬어도 될 만큼 버텨볼게.", "이번엔 제게 맡겨요. 당신이 쉬어도 될 만큼 버텨볼게요."], ["약속했잖아. 무슨 일이 있어도 곁에 있겠다고.", "약속했잖아요. 무슨 일이 있어도 곁에 있겠다고요."]],
    [["네가 강해서 곁에 있는 게 아니야. 너니까 있는 거야.", "당신이 강해서 곁에 있는 게 아니에요. 당신이니까 있는 거예요."], ["돌아올 곳 하나쯤은 있어야지. 그게 나였으면 해.", "돌아올 곳 하나쯤은 있어야죠. 그게 저였으면 해요."], ["내가 해준 것들을 갚으려고 하지 마. 함께 있다는 걸로 충분해.", "제가 해준 것들을 갚으려고 하지 마요. 함께 있다는 걸로 충분해요."]],
  ] },
  { id: "냉혹함", words: ["냉혹", "잔혹", "잔인", "무자비", "무정", "이기적", "사악", "악독"], style: "정서적 거리를 두는 단호한 표현", lines: [
    [["내 시간을 낭비하지 마. 용건만 말해.", "제 시간을 낭비하지 마요. 용건만 말해요."], ["필요한 것만 챙겨. 나머지는 짐일 뿐이야.", "필요한 것만 챙겨요. 나머지는 짐일 뿐이에요."], ["호의로 착각하지 마. 서로 이득이 맞았을 뿐이야.", "호의로 착각하지 마요. 서로 이득이 맞았을 뿐이에요."]],
    [["기회는 줬어. 다음 선택은 네 책임이야.", "기회는 줬어요. 다음 선택은 당신 책임이에요."], ["감정에 휘둘리지 마. 해야 할 일은 달라지지 않아.", "감정에 휘둘리지 마요. 해야 할 일은 달라지지 않아요."], ["협상은 끝났어. 더 들을 말은 없어.", "협상은 끝났어요. 더 들을 말은 없어요."]],
    [["이런 약점이 생길 줄은 몰랐어. 네가 신경 쓰인다는 게.", "이런 약점이 생길 줄은 몰랐어요. 당신이 신경 쓰인다는 게요."], ["너를 예외로 두고 있다는 걸, 모르는 척하지 마.", "당신을 예외로 두고 있다는 걸, 모르는 척하지 마요."], ["익숙하지 않아. 아무 대가 없이 곁에 있는 사람은.", "익숙하지 않아요. 아무 대가 없이 곁에 있는 사람은요."]],
  ] },
];
const normalizeKeyword = (word: string) => word.replace(/\s/g, "").toLowerCase();
const CATALOG_VOICES: Voice[] = PERSONALITY_CATALOG.map(trait => ({
  id: trait.name, words: [normalizeKeyword(trait.name)], style: `${trait.name} 성향을 반영한 표현`,
  polite: ["p016", "p022", "p039", "p047", "p073", "p083", "n090"].includes(trait.key),
  catalogKey: trait.key, lines: catalogDialogueLines(trait.key),
}));
const CATALOG_BY_NAME = new Map(CATALOG_VOICES.map(v => [normalizeKeyword(v.id), v]));
// Preserve legacy aliases. New aliases are exact-only and must be unambiguous;
// source labels such as Persistent / Proactive occur on more than one row.
const CATALOG_ALIASES = new Map<string, Voice[]>();
PERSONALITY_CATALOG.forEach((trait, i) => {
  for (const alias of new Set([trait.english, ...trait.synonyms.split(",")].map(normalizeKeyword).filter(a => a && a !== "-"))) {
    CATALOG_ALIASES.set(alias, [...(CATALOG_ALIASES.get(alias) ?? []), CATALOG_VOICES[i]]);
  }
});
export function matchVoices(keywords: string[]) {
  const found: Voice[] = [], unknown: string[] = [];
  for (const raw of keywords) {
    const keyword = normalizeKeyword(raw);
    const aliases = CATALOG_ALIASES.get(keyword);
    const voice = CATALOG_BY_NAME.get(keyword)
      ?? VOICES.find(v => v.words.some(word => keyword.includes(word)))
      ?? (aliases?.length === 1 ? aliases[0] : undefined);
    if (voice) { if (!found.some(v => v.id === voice.id)) found.push(voice); } else unknown.push(raw);
  }
  return { found, unknown };
}
export function dialogueSignature(keywords: string[], register: Character["register"], iq = 110) {
  return JSON.stringify([keywords, register, iq]);
}
function originalDialogue(keywords: string[], register: Character["register"], variants: number[] = [0, 0, 0], iq = 110) {
  const { found } = matchVoices(keywords);
  const voices = found.length ? found : [VOICES[0]];
  const polite = register === "polite" || (register === "auto" && Boolean(voices[0].polite));
  return SCENES.map((_, i) => {
    const group = voices.filter((_, j) => j % 3 === i);
    const selected = group.length ? group : [voices[i % voices.length]];
    const variant = Math.abs(variants[i] ?? 0) % 3;
    const base = selected.map(voice => voice.lines[i][variant][polite ? 1 : 0]).join(" ");
    if (iq < 100) {
      const simple: Pair[][] = [
        [["어, 그런데 어디로 가는 거였지?", "어, 그런데 어디로 가는 거였죠?"], ["복잡한 건 잘 모르겠어. 같이 가면 되지?", "복잡한 건 잘 모르겠어요. 같이 가면 되죠?"], ["일단 눈앞의 길로 가보자.", "일단 눈앞의 길로 가봐요."]],
        [["잠깐, 한 번에 하나씩 말해줘.", "잠깐, 한 번에 하나씩 말해줘요."], ["왜 이렇게 된 거지? 잘 모르겠어.", "왜 이렇게 된 거죠? 잘 모르겠어요."], ["설명은 나중에 듣자. 지금은 뛰면 돼?", "설명은 나중에 들어요. 지금은 뛰면 돼요?"]],
        [["이유는 잘 모르겠어. 그냥 네가 좋아.", "이유는 잘 모르겠어요. 그냥 당신이 좋아요."], ["어려운 말은 못 하겠어. 곁에 있어줘.", "어려운 말은 못 하겠어요. 곁에 있어줘요."], ["말이 잘 안 나오네. 그래도 진심이야.", "말이 잘 안 나오네요. 그래도 진심이에요."]],
      ];
      const first = base.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || base;
      return `${first} ${simple[i][variant][polite ? 1 : 0]}`;
    }
    if (iq >= 120) {
      const analytical: Pair[][] = [
        [["해가 기울기 전에 도착하려면 이동 시간을 역산해야겠어.", "해가 기울기 전에 도착하려면 이동 시간을 역산해야겠어요."], ["어제의 흔적과 비교하면 사람들이 주로 쓰는 길을 알 수 있어.", "어제의 흔적과 비교하면 사람들이 주로 쓰는 길을 알 수 있어요."], ["가까운 길보다 변수가 적은 길이 결국 빠를 수도 있지.", "가까운 길보다 변수가 적은 길이 결국 빠를 수도 있죠."]],
        [["우선 확인된 사실과 추측을 분리하자. 잘못된 전제로 움직이면 위험해.", "우선 확인된 사실과 추측을 분리해요. 잘못된 전제로 움직이면 위험해요."], ["같은 현상이 반복된다면 우연보다는 조건을 의심해야 해.", "같은 현상이 반복된다면 우연보다는 조건을 의심해야 해요."], ["상대의 목적을 알면 다음 행동도 좁힐 수 있어. 우리 반응을 유도하는 건 아닐까?", "상대의 목적을 알면 다음 행동도 좁힐 수 있어요. 우리 반응을 유도하는 건 아닐까요?"]],
        [["처음엔 익숙함이라고 생각했는데, 떨어져 있을 때도 네 선택이 궁금하더라.", "처음엔 익숙함이라고 생각했는데, 떨어져 있을 때도 당신 선택이 궁금하더라고요."], ["감정을 설명하는 것과 인정하는 건 다르지. 이제는 후자를 택하고 싶어.", "감정을 설명하는 것과 인정하는 건 다르죠. 이제는 후자를 택하고 싶어요."], ["모든 가능성을 따져도 함께하고 싶다는 결론은 바뀌지 않았어.", "모든 가능성을 따져도 함께하고 싶다는 결론은 바뀌지 않았어요."]],
      ];
      return `${base} ${analytical[i][variant][polite ? 1 : 0]}`;
    }
    return base;
  });
}
// Ten additional scene beats, in addition to the three original variants.
// Explicit register pairs avoid mechanically changing Korean sentence endings.
const EXTRA_SCENES: [Pair[], Pair[], Pair[]] = [
  [
    ["갈림길에서 흩어지면 저 표지판 앞에서 만나자.", "갈림길에서 흩어지면 저 표지판 앞에서 만나요."],
    ["오늘 본 것 중 하나만 기억한다면 뭘 고를래?", "오늘 본 것 중 하나만 기억한다면 뭘 고를래요?"],
    ["돌아오면 오늘 걸은 길을 지도에 그려두자.", "돌아오면 오늘 걸은 길을 지도에 그려둬요."],
    ["장터를 지나면 물부터 채우자. 빈 수통은 도움이 안 되니까.", "장터를 지나면 물부터 채워요. 빈 수통은 도움이 안 되니까요."],
    ["오늘 목적지에 도착하면 가장 먼저 뭘 하고 싶어?", "오늘 목적지에 도착하면 가장 먼저 뭘 하고 싶어요?"],
    ["다음번 길은 네가 골라. 이번엔 네가 보던 풍경이 궁금해.", "다음번 길은 당신이 골라요. 이번엔 당신이 보던 풍경이 궁금해요."],
    ["신발 끈이 풀렸네. 잠깐만, 묶고 따라갈게.", "신발 끈이 풀렸네요. 잠깐만요, 묶고 따라갈게요."],
    ["어제 들은 노래가 계속 생각나. 너도 기억해?", "어제 들은 노래가 계속 생각나요. 당신도 기억해요?"],
    ["늘 지나치던 길인데, 오늘은 낯선 발자국이 보이네.", "늘 지나치던 길인데, 오늘은 낯선 발자국이 보이네요."],
    ["마지막으로 돌아본 풍경은 나중에도 오래 남겠지.", "마지막으로 돌아본 풍경은 나중에도 오래 남겠죠."],
  ],
  [
    ["서로 다른 걸 봤을 수도 있어. 각자 본 것부터 말해보자.", "서로 다른 걸 봤을 수도 있어요. 각자 본 것부터 말해봐요."],
    ["등 뒤의 문이 닫혔어. 다른 출구가 있는지 봐줘.", "등 뒤의 문이 닫혔어요. 다른 출구가 있는지 봐줘요."],
    ["누가 틀렸는지는 나가서 따지자. 지금은 손발부터 맞춰.", "누가 틀렸는지는 나가서 따져요. 지금은 손발부터 맞춰요."],
    ["저쪽에서 우리 이름을 불렀어. 아는 목소리인지 확인해줘.", "저쪽에서 우리 이름을 불렀어요. 아는 목소리인지 확인해줘요."],
    ["넘어진 사람부터 일으키자. 뒤처진 사람이 있는지도 보고.", "넘어진 사람부터 일으켜요. 뒤처진 사람이 있는지도 보고요."],
    ["내가 신호하면 같이 움직여. 서로 놓치지 않게.", "제가 신호하면 같이 움직여요. 서로 놓치지 않게요."],
    ["지금 들은 말은 여기서 확인하자. 소문만 믿고 싸울 순 없어.", "지금 들은 말은 여기서 확인해요. 소문만 믿고 싸울 순 없어요."],
    ["바닥이 흔들려. 발밑부터 봐!", "바닥이 흔들려요. 발밑부터 봐요!"],
    ["방금 그 소리, 아까와 같은 쪽에서 났어.", "방금 그 소리, 아까와 같은 쪽에서 났어요."],
    ["해가 지기 전에 여기서 빠져나가야 해.", "해가 지기 전에 여기서 빠져나가야 해요."],
  ],
  [
    ["네가 건넸던 짧은 인사를 아직 기억해.", "당신이 건넸던 짧은 인사를 아직 기억해요."],
    ["내 얘기를 끝까지 들어준 건 네가 처음이었어.", "제 얘기를 끝까지 들어준 건 당신이 처음이었어요."],
    ["그날 전하지 못한 말이 있어. 돌아와 줘서 고마워.", "그날 전하지 못한 말이 있어요. 돌아와 줘서 고마워요."],
    ["오늘이 특별한 날은 아니어도, 이 말은 미루고 싶지 않았어.", "오늘이 특별한 날은 아니어도, 이 말은 미루고 싶지 않았어요."],
    ["너에게 받은 작은 물건을 아직 가지고 있어.", "당신에게 받은 작은 물건을 아직 가지고 있어요."],
    ["서로 다른 길을 가게 돼도 이 시간까지 지워지진 않겠지.", "서로 다른 길을 가게 돼도 이 시간까지 지워지진 않겠죠."],
    ["말하지 못한 날들이 많았어. 오늘은 끝까지 들어줄래?", "말하지 못한 날들이 많았어요. 오늘은 끝까지 들어줄래요?"],
    ["가끔은 네가 내 이름을 불러주던 순간이 떠올라.", "가끔은 당신이 제 이름을 불러주던 순간이 떠올라요."],
    ["너를 만나기 전의 나와 지금의 나는 조금 달라.", "당신을 만나기 전의 저와 지금의 저는 조금 달라요."],
    ["이런 이야기를 꺼내는 건, 네가 알아줬으면 해서야.", "이런 이야기를 꺼내는 건, 당신이 알아줬으면 해서예요."],
  ],
];
type SpecialTone = "reserved" | "warm" | "bold" | "dry";
// Special lines depend jointly on the leading personality for a scene and IQ.
// These are fictional performance directions, not real-world IQ predictions.
const SPECIAL_LINES: Record<SpecialTone, { low: [Pair, Pair, Pair]; high: [Pair, Pair, Pair] }> = {
  reserved: {
    low: [["음, 길 이름은 헷갈려. 표시를 해두면 되겠지.", "음, 길 이름은 헷갈려요. 표시를 해두면 되겠죠."], ["잠깐. 어려운 설명 말고, 지금 할 일 하나만 알려줘.", "잠깐만요. 어려운 설명 말고, 지금 할 일 하나만 알려줘요."], ["말을 고르다 또 늦었네. 그냥, 보고 싶었어.", "말을 고르다 또 늦었네요. 그냥, 보고 싶었어요."]],
    high: [["서두를 이유는 없어. 이 길은 돌아갈 경로까지 확인했어.", "서두를 이유는 없어요. 이 길은 돌아갈 경로까지 확인했어요."], ["조건이 달라졌어. 아까의 판단은 잠시 보류하자.", "조건이 달라졌어요. 아까의 판단은 잠시 보류해요."], ["오래 생각했어. 침묵으로는 내 마음이 전해지지 않는다는 걸.", "오래 생각했어요. 침묵으로는 제 마음이 전해지지 않는다는 걸요."]],
  },
  warm: {
    low: [["어려운 준비는 잘 모르지만, 네 간식은 안 잊었어.", "어려운 준비는 잘 모르지만, 당신 간식은 안 잊었어요."], ["누구 말이 맞는지는 모르겠어. 먼저 안 다쳤는지 보자.", "누구 말이 맞는지는 모르겠어요. 먼저 안 다쳤는지 봐요."], ["멋있게 말하려다 다 까먹었어. 그래도 네가 좋아.", "멋있게 말하려다 다 까먹었어요. 그래도 당신이 좋아요."]],
    high: [["모두에게 같은 속도를 요구하면 누군가는 지쳐. 쉬는 시간도 일정에 넣자.", "모두에게 같은 속도를 요구하면 누군가는 지쳐요. 쉬는 시간도 일정에 넣어요."], ["말이 앞뒤가 안 맞는다고 거짓말은 아니야. 놀란 마음부터 진정시키자.", "말이 앞뒤가 안 맞는다고 거짓말은 아니에요. 놀란 마음부터 진정시켜요."], ["내가 이해한 모습만 사랑하고 싶지는 않아. 아직 모르는 네 이야기도 듣고 싶어.", "제가 이해한 모습만 사랑하고 싶지는 않아요. 아직 모르는 당신 이야기도 듣고 싶어요."]],
  },
  bold: {
    low: [["지도는 잘 못 읽어도 표지판은 보이잖아! 일단 저기까지 가자.", "지도는 잘 못 읽어도 표지판은 보이잖아요! 일단 저기까지 가요."], ["작전이 너무 길어! 내가 뭘 하면 되는지만 말해!", "작전이 너무 길어요! 제가 뭘 하면 되는지만 말해요!"], ["빙빙 돌려 말하면 나도 헷갈려. 너랑 계속 함께할 거야!", "빙빙 돌려 말하면 저도 헷갈려요. 당신이랑 계속 함께할 거예요!"]],
    high: [["목적지는 같아도 선택지는 여러 개야. 내가 먼저 길을 확인해올게.", "목적지는 같아도 선택지는 여러 개예요. 제가 먼저 길을 확인해올게요."], ["상대가 원하는 반응을 해줄 필요는 없지. 우리가 움직일 때를 정하자.", "상대가 원하는 반응을 해줄 필요는 없죠. 우리가 움직일 때를 정해요."], ["확신과 고집은 다르다는 걸 너한테 배웠어. 이번엔 네 대답도 기다릴게.", "확신과 고집은 다르다는 걸 당신한테 배웠어요. 이번엔 당신 대답도 기다릴게요."]],
  },
  dry: {
    low: [["복잡한 일정표는 됐어. 밥 먹는 시간이 언제야?", "복잡한 일정표는 됐어요. 밥 먹는 시간이 언제예요?"], ["알아듣게 말해. 잘난 설명보다 나가는 길이 필요하니까.", "알아듣게 말해요. 잘난 설명보다 나가는 길이 필요하니까요."], ["왜 신경 쓰이는지는 모르겠어. 자꾸 묻지 마. 그냥 옆에 있어.", "왜 신경 쓰이는지는 모르겠어요. 자꾸 묻지 마요. 그냥 옆에 있어요."]],
    high: [["계획이 완벽하다는 말은 변수를 아직 못 찾았다는 뜻일 수도 있지.", "계획이 완벽하다는 말은 변수를 아직 못 찾았다는 뜻일 수도 있죠."], ["저렇게 확신하는데 근거는 하나도 없네. 주장과 증거를 따로 보자.", "저렇게 확신하는데 근거는 하나도 없네요. 주장과 증거를 따로 봐요."], ["사람을 믿지 않는 게 합리적이라 생각했는데, 너까지 예외 없이 밀어낸 건 내 고집이었어.", "사람을 믿지 않는 게 합리적이라 생각했는데, 당신까지 예외 없이 밀어낸 건 제 고집이었어요."]],
  },
};
function specialTone(id: string): SpecialTone {
  if (["냉소", "냉혹함"].includes(id)) return "dry";
  if (["자신감", "충동적", "야심"].includes(id)) return "bold";
  if (["다정함", "장난기", "감성적", "낙관적", "헌신적"].includes(id)) return "warm";
  return "reserved";
}
export const DIALOGUE_VARIANT_COUNT = 13;
function legacyDialogueCandidates(keywords: string[], register: Character["register"], iq = 110): string[][] {
  const { found } = matchVoices(keywords);
  const voices = found.length ? found : [VOICES[0]];
  const form = register === "polite" || (register === "auto" && Boolean(voices[0].polite)) ? 1 : 0;
  const originals = [0, 1, 2].map(v => originalDialogue(keywords, register, [v, v, v], iq));
  return SCENES.map((_, scene) => {
    const group = voices.filter((_, j) => j % 3 === scene);
    const lead = group[0] ?? voices[scene % voices.length];
    return [
      ...originals.map(lines => lines[scene]),
      ...EXTRA_SCENES[scene].map((pair, i) => {
        // Last three new variants unlock joint IQ/personality special speech.
        const band = iq < 100 ? "low" : iq >= 120 ? "high" : null;
        if (i >= 7 && band) {
          const personality = lead.lines[scene][i % 3][form];
          return `${personality} ${pair[form]} ${SPECIAL_LINES[specialTone(lead.id)][band][scene][form]}`;
        }
        return `${originals[i % 3][scene]} ${pair[form]}`;
      }),
    ];
  });
}
export function dialogueCandidates(keywords: string[], register: Character["register"], iq = 110): string[][] {
  const { found } = matchVoices(keywords);
  if (!found.some(voice => voice.catalogKey)) return legacyDialogueCandidates(keywords, register, iq);
  // Mix candidate pools, never overwrite edited/saved dialogue when keywords change.
  const polite = register === "polite" || (register === "auto" && Boolean(found[0].polite));
  return SCENES.map((_, scene) => {
    const group = found.filter((_, i) => i % 3 === scene);
    const selected = group.length ? group : [found[scene % found.length]];
    return [...new Set(selected.flatMap(voice => voice.catalogKey
      ? voice.lines[scene].map((pair, variant) => catalogIqLine(pair[polite ? 1 : 0], scene, variant, iq, polite))
      : legacyDialogueCandidates([voice.id], polite ? "polite" : "casual", iq)[scene]))];
  });
}
// Deterministic initial render/import callers; randomness is only used on clicks.
export function generateDialogue(keywords: string[], register: Character["register"], variants: number[] = [0, 0, 0], iq = 110) {
  return dialogueCandidates(keywords, register, iq).map((pool, i) => pool[Math.abs(Math.trunc(variants[i] || 0)) % pool.length]);
}
export function randomizeDialogue(keywords: string[], register: Character["register"], iq = 110, previous: string[] = [], sceneIndex?: number, random: () => number = Math.random) {
  return dialogueCandidates(keywords, register, iq).map((pool, i) => {
    if (sceneIndex !== undefined && sceneIndex !== i) return previous[i] ?? "";
    const choices = pool.filter(line => line !== previous[i]);
    const index = Math.min(choices.length - 1, Math.floor(clamp(random(), 0, 1) * choices.length));
    return choices[index];
  });
}
export function normalizeCharacter(raw: unknown): Character {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("캐릭터 데이터가 올바르지 않아요.");
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || !r.stats || typeof r.stats !== "object" || !Array.isArray(r.keywords)) throw new Error("Rasyancut 캐릭터 백업 파일을 선택해주세요.");
  const number = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;
  const stats = Object.fromEntries(STAT_KEYS.map(k => [k, Math.round(number((r.stats as Record<string, unknown>)[k], 10, 0, 100))])) as Character["stats"];
  const text = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";
  const keywords = [...new Set(r.keywords.filter((v): v is string => typeof v === "string").map(v => v.trim().slice(0, 24)).filter(Boolean))].slice(0, 8);
  const weapon = (v: unknown): Weapon => v === "폴암" ? "월도" : v === "롱스드" ? "롱소드" : v === "그레이트 소드" ? "그레이트소드" : v === "두손 도끼" ? "양손 도끼" : WEAPONS.includes(v as typeof WEAPONS[number]) ? v as Weapon : "";
  const primaryWeapon = weapon(r.primaryWeapon), secondaryWeapon = weapon(r.secondaryWeapon);
  if (primaryWeapon === "방패") throw new Error("방패는 보조무기로만 선택할 수 있어요.");
  if (primaryWeapon && primaryWeapon === secondaryWeapon) throw new Error("주무기와 보조무기가 중복된 파일이에요. 서로 다른 무기로 수정해주세요.");
  const country = r.country === "추풀" ? "추풍" : COUNTRIES.includes(r.country as typeof COUNTRIES[number]) ? r.country as Country : "";
  const baseClass: BaseClass = BASE_CLASSES.some(entry => entry.name === r.baseClass) ? r.baseClass as BaseClass : "";
  const combatSkills: CombatSkill[] = [];
  if (Array.isArray(r.combatSkills)) for (const entry of r.combatSkills) {
    if (!entry || typeof entry !== "object" || !STAT_KEYS.includes(entry.stat) || combatSkills.some(skill => skill.stat === entry.stat)) continue;
    combatSkills.push({ stat: entry.stat, multiplier: Math.round(number(entry.multiplier, 1, 1, 3) * 10) / 10,
      ...(typeof entry.name === "string" ? { name: entry.name.replace(/[\r\n\t]/g, " ").slice(0, 60) } : {}),
      ...(Array.isArray(entry.debuffs) ? { debuffs: normalizeDebuffs(entry.debuffs) } : {}),
    });
  }
  return {
    schemaVersion: 7, age: Math.round(number(r.age, 25, 0, 99999)),
    trainerId: normalizeTrainer(baseClass, r.trainerId), profileTraits: normalizeProfileTraits(r.profileTraits),
    weaponSetup: normalizeWeaponSetup(r.weaponSetup, primaryWeapon, secondaryWeapon),
    race: r.race === "안형체" ? "암형체" : RACES.includes(r.race as typeof RACES[number]) ? r.race as Race : "",
    ...selectCountry(country, r.affiliation as Affiliation), combatSkills,
    gender: r.gender === "남" || r.gender === "여" ? r.gender : "",
    baseClass,
    knightClass: "", transcendentClass: "",
    iq: Math.round(number(r.iq, 110, 90, 130)),
    name: text(r.name, 30), concept: text(r.concept, 100),
    height: number(r.height, 178, 80, 260), muscle: number(r.muscle, 32, 5, 100), fat: number(r.fat, 18, 3, 60),
    keywords, register: r.register === "casual" || r.register === "polite" ? r.register : "auto",
    color: typeof r.color === "string" && /^#[0-9a-f]{6}$/i.test(r.color) ? r.color.toUpperCase() : "#A78BFA",
    stats,
    dialogue: Array.isArray(r.dialogue) && r.dialogue.length === 3 && r.dialogue.every(v => typeof v === "string") ? r.dialogue.map(v => v.slice(0, 600)) : [],
    dialogueSignature: text(r.dialogueSignature, 6000),
    portrait: normalizePortrait(r.portrait), likes: text(r.likes, 800), dislikes: text(r.dislikes, 800),
    primaryWeapon, secondaryWeapon, combatStyle: text(r.combatStyle, 1200),
    combatTags: Array.isArray(r.combatTags) ? [...new Set(r.combatTags.filter((v): v is string => typeof v === "string").map(v => v.trim().slice(0, 24)).filter(Boolean))].slice(0, 16) : [],
    stageRank: STAGE_RANKS.includes(r.stageRank as typeof STAGE_RANKS[number]) ? r.stageRank as StageRank : "",
  };
}
export function characterMarkdown(c: Character, photoAttachment?: string) {
  const body = estimateBody(c.height, c.muscle, c.fat);
  const description = describeBody(c.height, c.muscle, c.fat);
  const ranges = bodyReferenceRanges(c.height);
  return [
    `# ${c.name || "이름 없는 캐릭터"}`,
    c.concept,
    c.portrait && photoAttachment ? `![캐릭터 사진](${photoAttachment})` : "",
    "## 프로필",
    `- 프로필 특성: ${c.profileTraits.join(", ") || "선택 없음"}`,
    `- 나이: ${c.age}세\n- 성별: ${c.gender || "미정"}\n- 종족: ${c.race || "미정"}\n- 출신 국가: ${c.country || "미정"}\n- 소속: ${c.affiliation || "미정"}`,
    `- 키: ${c.height} cm\n- 골격근량: ${c.muscle} kg\n- 근육 상태: ${description.muscle}\n- 체지방률: ${c.fat}%\n- 지방 상태: ${description.fat}\n- 추정 몸무게: ${body.weight.toFixed(1)} kg\n- 지방량: ${body.fatMass.toFixed(1)} kg`,
    "> 인간형 성인 캐릭터를 위한 창작용 가정입니다. 기타 제지방량 = 9 × 키(m)², 체중 = (골격근량 + 기타 제지방량) ÷ (1 − 체지방률/100). 근육 단계는 골격근량/키(m)² 8.5 미만·8.5 이상 12 미만·12 이상, 지방 단계는 지방량/키(m)² 3 미만·3 이상 7 미만·7 이상입니다. 모든 종족에 같은 창작용 가정을 적용합니다. 실제 신체 측정이나 건강 판단 기준이 아닙니다.",
    `- 현재 키 기준 적당한 근육: ${ranges.muscle.min.toFixed(1)} kg 이상 ~ ${ranges.muscle.max.toFixed(1)} kg 미만\n- 현재 키 기준 적당한 지방량: ${ranges.fat.min.toFixed(1)} kg 이상 ~ ${ranges.fat.max.toFixed(1)} kg 미만 (표시값 반올림)`,
    "## 성격과 대사",
    `- IQ: ${c.iq} (${iqStyle(c.iq)})\n- 성격: ${c.keywords.join(", ")}\n- 말투: ${c.register === "polite" ? "존댓말" : c.register === "casual" ? "반말" : "성격에 맞춤"}`,
    "### 좋아하는 것", c.likes || "미정",
    "### 싫어하는 것", c.dislikes || "미정",
    ...c.dialogue.map((line, i) => `### ${SCENES[i].name}\n\n> ${line.replace(/\n/g, "\n> ")}`),
    `> 성격 키워드를 말투 규칙에 연결한 창작용 대사 초안입니다.${c.dialogueSignature !== dialogueSignature(c.keywords, c.register, c.iq) && c.dialogue.length ? " 현재 성격·말투·IQ 기준으로 다시 생성하지 않은 대사입니다." : ""}`,
    "## 대표 색상",
    `- HEX: ${c.color}\n- RGB: ${hexToRgb(c.color).join(", ")}`,
    "## 능력치",
    `| 능력 | 수치 | 최대 |\n| --- | ---: | ---: |\n${STAT_KEYS.map(k => `| ${STAT_INFO[k].name} | ${c.stats[k]} | 100 |`).join("\n")}`,
    "## 전투 설정",
    `- 베이스 계열 (base class): ${c.baseClass || "선택 사항 없음"}\n- 직업 설명: ${BASE_CLASSES.find(entry => entry.name === c.baseClass)?.description || "미정"}\n- 나이트 계열 (knight class): 선택 사항 없음\n- 초월자 (Transcendent class): 선택 사항 없음`,
    `- 주무기: ${c.primaryWeapon || "미정"}\n- 보조무기: ${c.secondaryWeapon || "미정"}\n- 장 등급: ${c.stageRank || "미정"}\n- 전투 특성: ${c.combatTags.join(", ") || "미정"}`,
    "### 전투 스킬",
    c.combatSkills.length ? c.combatSkills.map(skill => skillDescription(c, skill)).join("\n\n") : "추가한 스킬 없음",
    "### 전투 스타일", c.combatStyle || "미정",
    ...weaponRecordSections(c).map(section => `### ${section.title}\n\n${section.text}`),
  ].filter(Boolean).join("\n\n") + "\n";
}
