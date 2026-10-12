"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAT_INFO, STAT_KEYS, skillName, skillValue, type Character, type StatKey, type CombatSkill } from "@/lib/character";
import { DEBUFFS, debuffDescription } from "@/lib/combat-catalog";

export function CombatSkills({ character: c, change }: { character: Character; change: (patch: Partial<Character>) => void }) {
  const available = STAT_KEYS.filter(stat => !c.combatSkills.some(skill => skill.stat === stat));
  function update(index: number, patch: Partial<CombatSkill>) { change({ combatSkills: c.combatSkills.map((skill, i) => i === index ? { ...skill, ...patch } : skill) }); }
  return <section className="combat-skills" aria-labelledby="combat-skills-title">
    <div className="combat-skills-heading"><div><h3 id="combat-skills-title">능력 기반 스킬</h3><p>능력 수치 × 배율 · 위의 무기 대미지와는 별도 계산이에요.</p></div><Button variant="outline" disabled={!available.length} onClick={() => { if (available[0]) change({ combatSkills: [...c.combatSkills, { stat: available[0], multiplier: 1 }] }); }}><Plus size={15} />스킬 추가</Button></div>
    {!c.combatSkills.length && <p className="field-hint">근력, 맷집, 기력, 순발력, 매력, 통찰 중 필요한 스킬을 추가해보세요.</p>}
    <div className="combat-skill-list">{c.combatSkills.map((skill, index) => <article className="combat-skill-card" key={skill.stat} aria-label={skillName(skill)}>
      <div className="skill-name-field"><label className="field-label" htmlFor={`skill-name-${index}`}>스킬 이름<span>{(skill.name || "").length}/60</span></label><Input id={`skill-name-${index}`} value={skill.name || ""} maxLength={60} placeholder={`${STAT_INFO[skill.stat].name} 스킬`} onChange={e => update(index, { name: e.target.value })} /></div>
      <div className="combat-skill-row">
      <div><label className="field-label" htmlFor={`skill-stat-${index}`}>기준 능력</label><Select value={skill.stat} onValueChange={stat => update(index, { stat: stat as StatKey })}><SelectTrigger id={`skill-stat-${index}`}><SelectValue /></SelectTrigger><SelectContent>{STAT_KEYS.map(stat => <SelectItem value={stat} key={stat} disabled={stat !== skill.stat && !available.includes(stat)}>{STAT_INFO[stat].name}</SelectItem>)}</SelectContent></Select></div>
      <div><label className="field-label" htmlFor={`skill-multiplier-${index}`}>배율</label><Select value={String(skill.multiplier)} onValueChange={value => change({ combatSkills: c.combatSkills.map((s, i) => i === index ? { ...s, multiplier: Number(value) } : s) })}><SelectTrigger id={`skill-multiplier-${index}`}><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 21 }, (_, i) => (10 + i) / 10).map(value => <SelectItem key={value} value={String(value)}>{value}배</SelectItem>)}</SelectContent></Select></div>
      <output className="skill-result" aria-live="polite" aria-label={`${STAT_INFO[skill.stat].name} 스킬 결과`}><span>{c.stats[skill.stat]} × {skill.multiplier}</span><strong>{skillValue(c.stats, skill)}</strong></output>
      <Button variant="ghost" size="icon" aria-label={`${skillName(skill)} 삭제`} onClick={() => change({ combatSkills: c.combatSkills.filter((_, i) => i !== index) })}><X size={16} /></Button>
      </div>
      <fieldset className="skill-debuffs"><legend>부여 디버프 · 복수 선택</legend><div className="skill-debuff-options">{DEBUFFS.map(debuff => {
        const selected = skill.debuffs?.find(d => d.type === debuff.name), id = `skill-${index}-debuff-${debuff.name}`;
        return <label key={debuff.name} htmlFor={id} className={selected ? "selected" : ""}><Checkbox id={id} checked={!!selected} onCheckedChange={checked => update(index, { debuffs: checked === true ? [...(skill.debuffs || []).filter(d => d.type !== debuff.name), { type: debuff.name }] : (skill.debuffs || []).filter(d => d.type !== debuff.name) })} /><span><strong>{debuff.name}</strong><small>{debuff.effect}</small></span></label>;
      })}</div>
      {skill.debuffs?.some(d => d.type === "절삭") && <div className="sever-part"><label className="field-label" htmlFor={`skill-sever-${index}`}>절삭 부위</label><Select value={skill.debuffs.find(d => d.type === "절삭")?.part || "none"} onValueChange={part => update(index, { debuffs: skill.debuffs?.map(d => d.type === "절삭" ? { type: "절삭", ...(part === "다리" || part === "팔" ? { part } : {}) } : d) })}><SelectTrigger id={`skill-sever-${index}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">미정 · 부위별 효과 모두 표시</SelectItem><SelectItem value="다리">다리</SelectItem><SelectItem value="팔">팔</SelectItem></SelectContent></Select></div>}
      {!!skill.debuffs?.length && <ul className="selected-debuff-effects">{skill.debuffs.map(d => <li key={d.type}><strong>{d.type}</strong> — {debuffDescription(d)}</li>)}</ul>}
      </fieldset>
    </article>)}</div>
    <p className="field-hint">각 능력은 한 번씩 추가할 수 있어요. 배율은 1–3배(0.1 단위)이며, 포인트 제한이나 주사위 없이 수치만 계산해요.</p>
    <p className="field-hint">디버프는 스킬이 대상에게 부여하는 효과를 기록해요. 지속 시간과 중첩 규칙은 미정이며, 디버프 피해·이동 제한은 위의 결과나 캐릭터의 무기에 자동 적용하지 않아요.</p>
  </section>;
}
