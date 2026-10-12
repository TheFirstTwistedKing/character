export const COMBAT_TAG_GROUPS = [
  { name: "공격 특성", tags: ["공격력", "파괴력", "살상력", "화력", "폭발력", "관통력", "절단력", "타격력", "충격력", "제압력", "치명타", "연속타격", "속사", "난사", "저격", "기습", "암습", "반격", "추격", "마무리", "처형", "돌진", "강타", "연격", "협공", "범위공격"] },
  { name: "방어 특성", tags: ["방어력", "내구력", "생존력", "저항력", "회복력", "재생력", "차단", "방패술", "철벽", "요새화", "피해감소", "피해반사", "마법저항", "물리저항", "상태저항", "충격흡수", "방어태세", "불굴", "인내", "수호", "보호막", "회피", "흘리기", "받아치기", "무효화", "피해분산"] },
  { name: "속도·기동 특성", tags: ["민첩성", "순발력", "반응속도", "이동속도", "공격속도", "가속", "도약", "질주", "비행", "활공", "순간이동", "은신", "잠입", "후퇴", "이탈", "측면기동", "위치전환", "거리조절", "추적", "회전기동"] },
  { name: "전술·감각 특성", tags: ["전투감각", "직감", "통찰력", "판단력", "집중력", "관찰력", "예측력", "분석력", "적응력", "지휘력", "통솔력", "협동심", "침착성", "결단력", "경계심", "정밀성", "정확도", "사거리", "매복", "유인", "교란", "견제", "포위", "진형유지"] },
  { name: "정신·의지 특성", tags: ["용기", "투지", "의지력", "정신력", "집중", "냉정", "광기", "광폭화", "분노", "흉포함", "대담함", "집념", "끈기", "충성심", "공포저항", "고통내성", "위압감", "살기", "사기", "전의"] },
  { name: "특수·속성 특성", tags: ["흡혈", "중독", "출혈", "기절", "속박", "둔화", "침묵", "감전", "빙결", "연소", "부식", "석화", "혼란", "세뇌", "저주", "정화", "해제", "면역", "투명화", "환영", "소환", "변신", "부활", "생명흡수", "마력흡수", "방어무시", "필중", "즉사", "연쇄공격", "지속피해", "폭발피해", "반사피해", "환경적응", "전투학습"] },
] as const;
export const LEGACY_COMBAT_TAGS = ["민첩", "전략", "비열", "정정당당", "방어", "지원", "원거리", "근접"] as const;
export const COMBAT_TAGS = [...COMBAT_TAG_GROUPS.flatMap(group => [...group.tags]), ...LEGACY_COMBAT_TAGS];
export function mergeCombatTagSelection(current: string[], visible: readonly string[], selected: string[]) {
  const allowed = new Set(visible);
  return [...new Set([...current.filter(tag => !allowed.has(tag)), ...selected.filter(tag => allowed.has(tag))])];
}

export const DEBUFFS = [
  { name: "출혈", effect: "1초마다 1.5 대미지" },
  { name: "파열", effect: "1초마다 3 대미지" },
  { name: "중독", effect: "1초마다 2 대미지" },
  { name: "화상", effect: "1초마다 2.5 대미지" },
  { name: "감전", effect: "1초마다 1 대미지 및 이동 속도 10% 감소" },
  { name: "어지러움", effect: "일정 시간 동안 움직일 수 없음" },
  { name: "기절", effect: "래그돌 상태로 일정 시간 동안 움직일 수 없음" },
  { name: "골절", effect: "이동 속도 50% 감소" },
  { name: "절삭", effect: "다리: 기어감(이동 속도 90% 감소). 팔: 두손 무기 및 잘린 부위의 무기 사용 불가" },
] as const;
export type DebuffName = typeof DEBUFFS[number]["name"];
export type SkillDebuff = { type: DebuffName; part?: "다리" | "팔" };
export function normalizeDebuffs(raw: unknown): SkillDebuff[] {
  if (!Array.isArray(raw)) return [];
  const result: SkillDebuff[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || !DEBUFFS.some(d => d.name === item.type) || result.some(d => d.type === item.type)) continue;
    result.push({ type: item.type, ...(item.type === "절삭" && (item.part === "다리" || item.part === "팔") ? { part: item.part } : {}) });
  }
  return result;
}
export function debuffDescription(debuff: SkillDebuff): string {
  if (debuff.type === "절삭" && debuff.part) return debuff.part === "다리" ? "다리: 기어감(이동 속도 90% 감소)" : "팔: 두손 무기 및 잘린 부위의 무기 사용 불가";
  return DEBUFFS.find(d => d.name === debuff.type)?.effect || "";
}
