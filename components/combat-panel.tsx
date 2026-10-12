"use client";

import { useState } from "react";
import { Check, Flag, Info, Plus, Shield, Swords, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { BASE_CLASSES, STAGE_RANKS, weaponsForSlot, selectWeapon, type BaseClass, type Character, type StageRank, type Weapon } from "@/lib/character";
import { COMBAT_TAG_GROUPS, LEGACY_COMBAT_TAGS, mergeCombatTagSelection } from "@/lib/combat-catalog";

import { changeBaseClass } from "@/lib/trainers";
import { TrainerPicker } from "@/components/trainer-picker";
import { CombatSkills } from "@/components/combat-skills";
import { WeaponWorkbench } from "@/components/weapon-workbench";

export function CombatPanel({ character: c, change }: { character: Character; change: (patch: Partial<Character>) => void }) {
  const [input, setInput] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const query = tagSearch.trim().replace(/\s/g, "");
  const groups = [...COMBAT_TAG_GROUPS, { name: "기존 특성", tags: LEGACY_COMBAT_TAGS }].map(group => ({ ...group, tags: group.tags.filter(tag => tag.includes(query) || group.name.includes(query)) }));
  const selectedClass = BASE_CLASSES.find(entry => entry.name === c.baseClass);
  function choose(slot: "primaryWeapon" | "secondaryWeapon", value: string) {
    try {
      const weapon = value === "none" ? "" : value as Weapon;
      const equipmentSlot = slot === "primaryWeapon" ? "primary" : "secondary";
      change({ ...selectWeapon(c, slot, weapon), weaponSetup: weapon === c[slot] ? c.weaponSetup : { ...c.weaponSetup, [equipmentSlot]: { trait: "일반", remaining: null } } });
    }
    catch (error) { toast.info(error instanceof Error ? error.message : "다른 무기를 선택해주세요."); }
  }
  function addTag() {
    const tags = [...new Set([...c.combatTags, ...input.split(/[,，、\n]+/).map(t => t.trim().slice(0, 24)).filter(Boolean)])];
    if (tags.length > 16) { toast.info("전투 특성은 최대 16개까지 넣을 수 있어요."); return; }
    change({ combatTags: tags }); setInput("");
  }
  return <div className="panel combat-panel">
    <div className="section-heading"><span className="section-icon"><Swords size={19} /></span><div><h2>전투 설정</h2><p>직업, 무기, 움직임으로 완성하는 전투 정체성</p></div><span className="quiet-badge">COMBAT PROFILE</span></div>
    <div className="combat-classes">
      <div className="class-field base-class-field"><label className="field-label" htmlFor="base-class">베이스 계열<span>base class</span></label>
        <Select value={c.baseClass || "none"} onValueChange={value => change(changeBaseClass(value === "none" ? "" : value as BaseClass, c.trainerId))}><SelectTrigger id="base-class" aria-describedby="base-class-description"><SelectValue>{c.baseClass || "선택 사항 없음"}</SelectValue></SelectTrigger><SelectContent position="popper" className="class-options"><SelectItem value="none">선택 사항 없음</SelectItem>{BASE_CLASSES.map(entry => <SelectItem key={entry.name} value={entry.name} textValue={entry.name}><span className="class-option-text"><strong>{entry.name}</strong><small>{entry.description}</small></span></SelectItem>)}</SelectContent></Select>
        <p className={`class-description ${selectedClass ? "has-selection" : ""}`} id="base-class-description" aria-live="polite">{selectedClass ? selectedClass.description : "캐릭터의 전문 분야를 선택해주세요."}</p>
      </div>
      <div className="class-field"><label className="field-label" htmlFor="knight-class">나이트 계열<span>knight class</span></label><Select value="none" onValueChange={() => change({ knightClass: "" })}><SelectTrigger id="knight-class"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">선택 사항 없음</SelectItem></SelectContent></Select></div>
      <div className="class-field"><label className="field-label" htmlFor="transcendent-class">초월자<span>Transcendent class</span></label><Select value="none" onValueChange={() => change({ transcendentClass: "" })}><SelectTrigger id="transcendent-class"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">선택 사항 없음</SelectItem></SelectContent></Select></div>
    </div>
    <TrainerPicker character={c} change={change} />
    <div className="weapon-grid">{(["primaryWeapon", "secondaryWeapon"] as const).map((slot, i) => {
      const other = slot === "primaryWeapon" ? c.secondaryWeapon : c.primaryWeapon;
      const Icon = i === 0 ? Swords : Shield;
      return <div className="weapon-field" key={slot}><label className="field-label" htmlFor={slot}><span className="weapon-label"><Icon size={16} />{i === 0 ? "주무기" : "보조무기"}</span><span>{i === 0 ? "PRIMARY" : "SECONDARY"}</span></label>
        <Select value={c[slot] || "none"} onValueChange={value => choose(slot, value)}><SelectTrigger id={slot}><SelectValue placeholder="무기를 선택해주세요" /></SelectTrigger><SelectContent position="popper"><SelectItem value="none">선택 안 함</SelectItem>{weaponsForSlot(slot).map(weapon => <SelectItem key={weapon} value={weapon} disabled={weapon === other}>{weapon}{weapon === other ? ` · ${i === 0 ? "보조무기" : "주무기"}로 선택됨` : ""}</SelectItem>)}</SelectContent></Select>
        <p className="field-hint">{i === 0 ? "전투의 중심이 되는 무기" : "상황에 맞춰 사용하는 두 번째 무기"}</p>
      </div>;
    })}</div>
    <p className="weapon-note"><Info size={13} />주무기와 보조무기는 서로 달라야 하며, 방패는 보조무기로만 선택할 수 있어요.</p>
    <WeaponWorkbench character={c} change={change} />
    <CombatSkills character={c} change={change} />
    <div className="combat-style-field"><label className="field-label" htmlFor="combat-style">전투 스타일<span>{c.combatStyle.length}/1200</span></label><Textarea id="combat-style" value={c.combatStyle} maxLength={1200} onChange={e => change({ combatStyle: e.target.value })} placeholder="예: 거리를 유지하며 상대를 관찰한 뒤, 빈틈이 생기면 빠르게 파고든다. 정면 대결보다 지형을 활용하는 편." /></div>
    <div className="combat-traits"><div className="field-label"><span className="weapon-label"><Tag size={15} />전투 특성</span><span>{c.combatTags.length}/16</span></div><p className="field-hint">6개 분류의 150개 특성과 기존 태그에서 최대 16개를 선택하세요. 설정용 태그이며 능력치·대미지는 바꾸지 않아요.</p>
      <Input aria-label="전투 특성 검색" value={tagSearch} onChange={e => setTagSearch(e.target.value)} placeholder="특성 이름 또는 분류 검색" className="combat-trait-search" />
      <div className="combat-tag-catalog">{groups.filter(group => group.tags.length > 0).map(group => <section className="combat-tag-group" key={group.name} aria-label={group.name}><h3>{group.name}<span>{group.tags.length}개</span></h3>
        <ToggleGroup type="multiple" value={c.combatTags} className="combat-presets" onValueChange={selected => {
          // Keep selected tags from other categories, hidden search results and custom tags.
          const next = mergeCombatTagSelection(c.combatTags, group.tags, selected);
          if (next.length > 16) { toast.info("전투 특성은 최대 16개까지 넣을 수 있어요."); return; }
          change({ combatTags: next });
        }}>{group.tags.map(tag => <ToggleGroupItem key={tag} value={tag} aria-label={`${tag} 전투 특성`} className="combat-preset">{c.combatTags.includes(tag) ? <Check size={13} /> : <Plus size={13} />}{tag}</ToggleGroupItem>)}</ToggleGroup>
      </section>)}{groups.every(group => group.tags.length === 0) && <p className="field-hint" role="status">일치하는 특성이 없어요. 아래에서 직접 추가할 수 있어요.</p>}</div>
      <div className="combat-tag-input"><Input aria-label="나만의 전투 특성" value={input} maxLength={150} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (!e.nativeEvent.isComposing && e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="직접 입력: 마법, 기습, 검과 총의 조합…" /><button aria-label="전투 특성 추가" onClick={addTag}><Plus size={16} />추가</button></div>
      <div className="selected-combat-tags" aria-label="선택한 전투 특성">{c.combatTags.map(tag => <span key={tag}>{tag}<button aria-label={`${tag} 전투 특성 삭제`} onClick={() => change({ combatTags: c.combatTags.filter(t => t !== tag) })}><X size={12} /></button></span>)}{c.combatTags.length === 0 && <p>선택한 전투 특성이 여기에 모여요.</p>}</div>
    </div>
    <div className="stage-rank-field"><div className="stage-rank-title"><span className="section-icon"><Flag size={18} /></span><div><label htmlFor="stage-rank">장 등급</label><p>10장부터 신장까지, 캐릭터의 등급을 기록해요.</p></div></div><Select value={c.stageRank || "none"} onValueChange={rank => change({ stageRank: rank === "none" ? "" : rank as StageRank })}><SelectTrigger id="stage-rank"><SelectValue /></SelectTrigger><SelectContent position="popper"><SelectItem value="none">미정</SelectItem>{STAGE_RANKS.map(rank => <SelectItem key={rank} value={rank}>{rank}</SelectItem>)}</SelectContent></Select></div>
    <div className="stage-ladder" aria-label="장 등급 순서">{STAGE_RANKS.map(rank => <button key={rank} className={rank === c.stageRank ? "selected" : ""} aria-pressed={rank === c.stageRank} onClick={() => change({ stageRank: rank })}>{rank}</button>)}</div>
  </div>;
}
