"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trainersForClass, selectedTrainer, normalizeTrainer } from "@/lib/trainers";
import type { Character } from "@/lib/character";

export function TrainerPicker({ character: c, change }: { character: Character; change: (patch: Partial<Character>) => void }) {
  const options = trainersForClass(c.baseClass), trainer = selectedTrainer(c.baseClass, c.trainerId);
  return <section className="trainer-picker" aria-labelledby="trainer-label">
    <label id="trainer-label" className="field-label" htmlFor="class-trainer">계열 트레이너 · 전직관</label>
    <Select value={trainer?.id || "none"} disabled={!options.length} onValueChange={value => change({ trainerId: normalizeTrainer(c.baseClass, value) })}>
      <SelectTrigger id="class-trainer" aria-describedby="trainer-description"><SelectValue placeholder="트레이너 선택" /></SelectTrigger>
      <SelectContent><SelectItem value="none">{!c.baseClass ? "베이스 계열을 먼저 선택하세요" : !options.length ? "선택 가능한 트레이너 없음" : "선택 안 함"}</SelectItem>{options.map(option => <SelectItem value={option.id} key={option.id}>{option.name} · {option.specialty}</SelectItem>)}</SelectContent>
    </Select>
    <p id="trainer-description" className="field-hint">{!c.baseClass ? "베이스 계열에 맞는 트레이너를 선택할 수 있어요." : !options.length ? "문서에 이 계열의 트레이너가 아직 등록되지 않았어요." : "계열을 변경하면 맞지 않는 트레이너 선택은 해제돼요."}</p>
    {trainer && <div className="trainer-detail" aria-live="polite"><strong>{trainer.name} · {trainer.specialty}</strong><div className="class-role-split">{["공격형", "방어형", "서포트형"].map((label, i) => <span key={label}>{label} <b>{trainer.distribution[i]}%</b></span>)}</div><p>{trainer.id === "kyle" ? "배울 수 있는 스킬: Rush Strike · Flash Cut" : "가르치는 스킬과 세부 메커니즘은 문서에 미기재예요."}</p></div>}
  </section>;
}
