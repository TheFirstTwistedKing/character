"use client";
import { useState } from "react";
import { Check, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { PERSONALITY_CATALOG } from "@/lib/personality-catalog";
import { TRAIT_ANCHORS, dialoguePair } from "@/lib/personality-dialogues";

export function PersonalityCatalogPicker({ selected, onSelect }: { selected: string[]; onSelect: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" className="outline-button personality-library-button" onClick={() => setOpen(true)}><ListPlus size={16} />성격 목록에서 고르기 <span>205</span></Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="personality-library-dialog"><DialogHeader><DialogTitle>성격 목록 · 205가지</DialogTitle><DialogDescription>긍정 99개 · 부정 106개. 각 성격에 일상·갈등·진심 대사가 5종씩 있어요. 최대 8개까지 선택할 수 있어요.</DialogDescription></DialogHeader>
      <p className="catalog-selection" role="status">선택 {selected.length}/8{selected.length >= 8 && " · 기존 키워드를 지우면 다른 성격을 추가할 수 있어요."}</p>
      <Command className="personality-library-command"><CommandInput aria-label="성격 목록 검색" placeholder="성격 이름·영문·유사한 성향 검색" />
        <CommandList><CommandEmpty>일치하는 성격이 없어요. 편집 화면에서 자유 키워드를 입력할 수 있어요.</CommandEmpty>
          {(["positive", "negative"] as const).map(group => <CommandGroup key={group} heading={group === "positive" ? "긍정적인 성격 · 99" : "부정적인 성격 · 106"}>
            {PERSONALITY_CATALOG.filter(t => t.group === group).map(trait => {
              const picked = selected.some(name => name.replace(/\s/g, "") === trait.name.replace(/\s/g, ""));
              return <CommandItem key={trait.key} value={`${trait.name} ${trait.english} ${trait.synonyms}`} disabled={picked || selected.length >= 8} onSelect={() => onSelect(trait.name)}>
                <div><strong>{trait.name}<small>{trait.english}</small></strong><p>일상 예시 · “{dialoguePair(TRAIT_ANCHORS[trait.key][1])[0]}”</p></div>{picked && <Check size={16} aria-label="선택됨" />}
              </CommandItem>;
            })}
          </CommandGroup>)}
        </CommandList></Command>
      <p className="catalog-note">분류와 명칭은 원본 목록을 따랐어요. 실제 사람의 도덕성이나 정신건강을 판정하는 기준이 아닌 창작용 설정이에요. 영문 표기가 같은 항목은 한국어 이름으로 구분해요.</p>
    </DialogContent></Dialog>
  </>;
}
