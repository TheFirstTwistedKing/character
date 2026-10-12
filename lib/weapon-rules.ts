import type { BaseClass, Character, Weapon } from "./character.ts";
import { selectedTrainer } from "./trainers.ts";

// Source: Rasyancut : Vanguard 공식 기획안, 시스템 / 계열 tabs, checked 2026-09-02.
// Null preserves the source's X/absent value. It must never be interpreted as zero damage.
export type WeaponRule = {
  category: "근접 · 근거리" | "근접 · 중거리" | "원거리" | "방패류";
  durability: number | null; windup: number | null; recovery: number | null; charge: boolean;
  normal: number | null; heavy: number | null; guardWear: number | null; parryWear: number | null;
  guardPierce: number | null; shield: boolean;
};
function melee(category: WeaponRule["category"], durability: number, windup: number, recovery: number, normal: number, heavy: number, guardWear: number | null, parryWear: number): WeaponRule {
  return { category, durability, windup, recovery, normal, heavy, guardWear, parryWear, charge: false, guardPierce: null, shield: false };
}
function ranged(durability: number | null, windup: number | null, recovery: number | null, normal: number | null, guardPierce: number, charge = false): WeaponRule {
  return { category: "원거리", durability, windup, recovery, normal, guardPierce, charge, heavy: null, guardWear: null, parryWear: null, shield: false };
}
export const WEAPON_RULES: Record<Exclude<Weapon, "">, WeaponRule> = {
  "단검": melee("근접 · 근거리", 6400, .3, .2, 60, 120, 200, 20),
  "쇼트소드": melee("근접 · 근거리", 11500, .35, .3, 30, 60, 50, 35),
  "롱소드": melee("근접 · 근거리", 14000, .4, .35, 40, 80, 60, 45),
  "그레이트소드": melee("근접 · 근거리", 16000, .5, .4, 50, 100, 70, 55),
  "한손 둔기": melee("근접 · 근거리", 13000, .35, .25, 25, 50, 55, 30),
  "양손 둔기": melee("근접 · 근거리", 14300, .45, .4, 35, 70, 65, 40),
  "한손 도끼": melee("근접 · 근거리", 13000, .35, .25, 25, 50, 55, 30),
  "양손 도끼": melee("근접 · 근거리", 14300, .45, .4, 35, 70, 65, 40),
  "건틀렛": melee("근접 · 근거리", 10500, .3, .25, 15, 30, 30, 15),
  "창": melee("근접 · 중거리", 11500, .4, .35, 35, 70, 80, 50),
  "채찍": melee("근접 · 중거리", 16200, .3, .2, 20, 40, null, 80),
  "월도": melee("근접 · 중거리", 14200, .5, .45, 55, 110, 80, 50),
  "새총": ranged(15000, 1, .1, 50, 5, true),
  "활": ranged(13000, 1.5, .25, 100, 70, true),
  "석궁": ranged(14000, .1, .4, 40, 85),
  "권총": ranged(25000, null, .2, 30, 30),
  "기관총": ranged(35000, null, .1, 30, 40),
  "저격총": ranged(40000, null, .5, 40, 70),
  "중화기": ranged(65000, null, .05, 50, 20),
  "투척무기": ranged(null, null, null, null, 50),
  "쉴드건": { ...ranged(89000, null, .1, 50, 35), guardWear: 60, shield: true },
  "방패": { category: "방패류", durability: 20000, windup: null, recovery: null, charge: false, normal: null, heavy: 10, guardWear: 50, parryWear: null, guardPierce: null, shield: true },
};
export const WEAPON_TRAITS = ["일반", "견습", "파괴된", "단단한", "가벼운", "약한", "반듯한"] as const;
export type WeaponTrait = typeof WEAPON_TRAITS[number];
export const TRAIT_DESCRIPTIONS: Record<WeaponTrait, string> = {
  "일반": "기본 특성 · 특수 효과 없음",
  "견습": "초반 상점 구매 · 공격 속도가 조금 느려짐 (감속 수치는 미기재)",
  "파괴된": "내구도 0% · 무기 사용 불가",
  "단단한": "세부 효과 미기재", "가벼운": "세부 효과 미기재", "약한": "세부 효과 미기재", "반듯한": "세부 효과 미기재",
};
export const MOVEMENTS = { walk: { name: "걷기", power: 1 }, run: { name: "뛰기", power: 2 }, rush: { name: "돌진", power: 3 } } as const;
export type EquipmentState = { trait: WeaponTrait; remaining: number | null };
export type WeaponSetup = {
  primary: EquipmentState; secondary: EquipmentState;
  targetToughness: number; movement: keyof typeof MOVEMENTS; skillMultiplier: number;
};
export const DEFAULT_WEAPON_SETUP: WeaponSetup = { primary: { trait: "일반", remaining: null }, secondary: { trait: "일반", remaining: null }, targetToughness: 0, movement: "walk", skillMultiplier: 1 };
const bound = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const round = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;
export function normalizeWeaponSetup(raw: unknown, primaryWeapon: Weapon, secondaryWeapon: Weapon): WeaponSetup {
  const r = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const equipment = (value: unknown, weapon: Weapon): EquipmentState => {
    const e = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const max = weapon ? WEAPON_RULES[weapon].durability : null;
    const invalidApprentice = e.trait === "견습" && weapon && WEAPON_RULES[weapon].category === "원거리" && weapon !== "새총";
    return { trait: !invalidApprentice && WEAPON_TRAITS.includes(e.trait as WeaponTrait) ? e.trait as WeaponTrait : "일반", remaining: e.remaining == null || max == null ? null : Math.round(bound(e.remaining, max, 0, max)) };
  };
  return { primary: equipment(r.primary, primaryWeapon), secondary: equipment(r.secondary, secondaryWeapon), targetToughness: Math.round(bound(r.targetToughness, 0, 0, 1000)), movement: r.movement === "run" || r.movement === "rush" ? r.movement : "walk", skillMultiplier: Math.round(bound(r.skillMultiplier, 1, 1, 3) * 100) / 100 };
}
export function damageReduction(toughness: number) {
  const n = bound(toughness, 0, 0, 1000);
  return Math.round((Math.min(n, 100) * .4 + Math.min(Math.max(n - 100, 0), 200) * .2 + Math.min(Math.max(n - 300, 0), 300) * .04 + Math.min(Math.max(n - 600, 0), 200) * .02 + Math.max(n - 800, 0) * .004) * 1000) / 1000;
}
export function remainingDurability(weapon: Weapon, state: EquipmentState) {
  if (!weapon) return null;
  if (state.trait === "파괴된") return 0;
  return state.remaining ?? WEAPON_RULES[weapon].durability;
}
export function calculateWeaponDamage(weapon: Weapon, setup: WeaponSetup, state: EquipmentState) {
  const reduction = damageReduction(setup.targetToughness);
  if (!weapon) return { normal: null, heavy: null, skill: null, guardPiercing: null, reduction, unavailable: "무기 미선택" };
  const rule = WEAPON_RULES[weapon], factor = 1 - reduction / 100;
  if (remainingDurability(weapon, state) === 0) return { normal: null, heavy: null, skill: null, guardPiercing: null, reduction, unavailable: "파괴된 무기 · 사용 불가" };
  const power = rule.category === "원거리" ? 1 : MOVEMENTS[setup.movement].power;
  const skillBase = rule.category === "원거리" ? rule.normal : rule.normal == null || rule.heavy == null ? null : rule.normal + rule.heavy;
  return {
    normal: rule.normal == null ? null : round(rule.normal * factor * power),
    heavy: rule.heavy == null ? null : round(rule.heavy * factor * power),
    skill: skillBase == null ? null : round(skillBase * factor * bound(setup.skillMultiplier, 1, 1, 3)),
    guardPiercing: rule.normal == null || rule.guardPierce == null ? null : round(rule.normal * rule.guardPierce / 100),
    reduction, unavailable: null,
  };
}
export type ClassRule = { weapons: Weapon[] };
export const CLASS_RULES: Record<Exclude<BaseClass, "">, ClassRule> = {
  "블레이드": { weapons: ["단검", "쇼트소드", "롱소드", "그레이트소드", "한손 도끼"] },
  "가디언": { weapons: ["그레이트소드", "방패", "양손 둔기", "양손 도끼", "월도"] },
  "레인저": { weapons: ["단검"] },
  "슈터": { weapons: ["새총", "활", "석궁", "권총", "기관총", "저격총", "중화기"] },
  "랜서": { weapons: ["창", "방패"] },
  "메딕": { weapons: ["단검", "쇼트소드", "건틀렛", "채찍", "권총"] },
  "크러셔": { weapons: ["한손 둔기", "양손 둔기", "양손 도끼", "건틀렛"] },
  "터렛": { weapons: ["쉴드건"] }, "테이머": { weapons: ["채찍"] },
  "인더스트리얼": { weapons: (Object.keys(WEAPON_RULES) as Weapon[]).filter(weapon => weapon !== "쉴드건") },
};
export const CLASS_SKILLS = [
  { name: "Rush Strike", baseClass: "블레이드", trainerId: "kyle", multiplier: 1.05, cooldown: 50, windup: 5, charge: true, recovery: .5, parry: false, description: "적에게 돌진해서 무기로 베어냄." },
  { name: "Flash Cut", baseClass: "블레이드", trainerId: "kyle", multiplier: 1.02, cooldown: 60, windup: .3, charge: false, recovery: .15, parry: true, description: "순식간에 베어내 출혈을 일으킴. 출혈: 초당 1.5 대미지 (지속시간 미기재)." },
] as const;
export function canUseClassSkill(baseClass: BaseClass, weapon: Weapon) {
  return baseClass === "블레이드" && CLASS_RULES[baseClass].weapons.includes(weapon);
}
export function ruleValue(value: number | null, unit = "") { return value == null ? "X / 미기재" : `${value}${unit}`; }
export function weaponRecordSections(c: Character): { title: string; text: string }[] {
  const setup = c.weaponSetup;
  const records = (["primary", "secondary"] as const).flatMap((slot, i) => {
    const weapon = i === 0 ? c.primaryWeapon : c.secondaryWeapon;
    if (!weapon) return [];
    const rule = WEAPON_RULES[weapon], state = setup[slot], damage = calculateWeaponDamage(weapon, setup, state);
    return [{ title: `${i === 0 ? "주무기" : "보조무기"} · ${weapon}`, text: [
      `${rule.category}${rule.shield && rule.category === "원거리" ? " / 방패류" : ""} · 특성 ${state.trait}: ${TRAIT_DESCRIPTIONS[state.trait]}`,
      `내구도 ${ruleValue(remainingDurability(weapon, state))} / ${ruleValue(rule.durability)}`,
      `선딜 ${rule.charge ? "차지 ~" : ""}${ruleValue(rule.windup, "초")} / 후딜 ${ruleValue(rule.recovery, "초")}`,
      `기본 대미지 · 일반 ${ruleValue(rule.normal)} / 강공격 ${ruleValue(rule.heavy)}`,
      `내구도 손실 · 가드 ${ruleValue(rule.guardWear)} / 패리 ${ruleValue(rule.parryWear)}`,
      `가드 관통률 ${ruleValue(rule.guardPierce, "%")} / 패리 관통률 X / 미기재`,
      `계산 조건 · 상대 맷집 ${setup.targetToughness} / 피해감소 ${damage.reduction}% / ${MOVEMENTS[setup.movement].name} / 스킬 ${setup.skillMultiplier}배`,
      damage.unavailable || `계산 대미지 · 일반 ${ruleValue(damage.normal)} / 강공격 ${ruleValue(damage.heavy)} / 스킬 ${ruleValue(damage.skill)} / 가드 관통 ${ruleValue(damage.guardPiercing)}`,
      "일반·강공격의 내구도 소모량은 미기재. X/미기재는 0이 아니며 계산하지 않음.",
    ].join("\n") }];
  });
  if (c.baseClass) {
    const rule = CLASS_RULES[c.baseClass], trainer = selectedTrainer(c.baseClass, c.trainerId);
    records.push({ title: `계열 무기 · ${c.baseClass}`, text: [
      `스킬 대응 무기: ${rule.weapons.join(", ")}`,
      `선택한 전직관: ${trainer ? `${trainer.name} · ${trainer.specialty}` : "선택 없음"}`,
      trainer ? `공격형 ${trainer.distribution[0]}% / 방어형 ${trainer.distribution[1]}% / 서포트형 ${trainer.distribution[2]}%` : "트레이너 미선택: 역할 비율 미정",
      "무기 사용은 자유이며, 비대응 무기에서는 일부 계열 스킬을 사용할 수 없음.",
      ...CLASS_SKILLS.filter(skill => skill.baseClass === c.baseClass && skill.trainerId === c.trainerId).map(skill => `${skill.name}: ${skill.multiplier}배 / 쿨다운 ${skill.cooldown}초 / 선딜 ${skill.charge ? "차지 ~" : ""}${skill.windup}초 / 후딜 ${skill.recovery}초 / 패리 ${skill.parry ? "가능" : "불가"}. ${skill.description}`),
    ].join("\n") });
  }
  return records;
}
