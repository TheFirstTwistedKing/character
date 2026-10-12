"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { PROFILE_TRAITS, normalizeProfileTraits } from "@/lib/trainers";
import type { Character } from "@/lib/character";

export function ProfileTraits({ character: c, change }: { character: Character; change: (patch: Partial<Character>) => void }) {
  return <fieldset className="profile-traits"><legend>특성 · NPC 유형</legend><p>캐릭터가 맡는 역할을 모두 선택하세요. 전투 특성과는 별도로 기록돼요.</p><div className="profile-trait-options">{PROFILE_TRAITS.map((trait, index) => <label key={trait} htmlFor={`profile-trait-${index}`} className={c.profileTraits.includes(trait) ? "selected" : ""}><Checkbox id={`profile-trait-${index}`} checked={c.profileTraits.includes(trait)} onCheckedChange={checked => change({ profileTraits: checked === true ? normalizeProfileTraits([...c.profileTraits, trait]) : c.profileTraits.filter(value => value !== trait) })} /><span>{trait}</span></label>)}</div></fieldset>;
}
