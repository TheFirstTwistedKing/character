"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, RACES, affiliationOptions, selectCountry, type Character } from "@/lib/character";

export function ProfileAffiliation({ character: c, change }: { character: Character; change: (patch: Partial<Character>) => void }) {
  return <div className="profile-world">
    <div><label className="field-label" htmlFor="character-race">종족</label>
      <Select value={c.race || "unset"} onValueChange={value => change({ race: value === "unset" ? "" : value as Character["race"] })}><SelectTrigger id="character-race"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unset">미정</SelectItem>{RACES.map(race => <SelectItem key={race} value={race}>{race}</SelectItem>)}</SelectContent></Select>
    </div>
    <div><label className="field-label" htmlFor="character-country">출신 국가</label>
      <Select value={c.country || "unset"} onValueChange={value => change(selectCountry(value === "unset" ? "" : value as Character["country"], c.affiliation))}><SelectTrigger id="character-country"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unset">미정</SelectItem>{COUNTRIES.map(country => <SelectItem key={country} value={country}>{country}{country === "리바이어던" ? " · 특수 국가" : ""}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="profile-affiliation"><label className="field-label" htmlFor="character-affiliation">소속</label>
      <Select disabled={!c.country} value={c.affiliation || "unset"} onValueChange={value => change({ affiliation: value === "unset" ? "" : value as Character["affiliation"] })}><SelectTrigger id="character-affiliation"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unset">{c.country ? "미정" : "국가를 먼저 선택하세요"}</SelectItem>{affiliationOptions(c.country).map(affiliation => <SelectItem key={affiliation} value={affiliation}>{affiliation}</SelectItem>)}</SelectContent></Select>
      <p className="field-hint">{c.country === "리바이어던" ? "리바이어던 전용 소속 7개 중에서 선택해요." : "국가를 선택하면 등록된 소속 중에서 선택할 수 있어요."} 국가 종류에 맞지 않는 소속은 국가를 바꿀 때 초기화돼요.</p>
    </div>
  </div>;
}
