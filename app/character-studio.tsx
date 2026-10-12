"use client";

import { useEffect, useRef, useState, type CSSProperties, type ComponentProps, type PointerEvent, type ReactNode } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight, Copy, Download, Dumbbell, Heart, HeartOff, Info, LoaderCircle, Layers3, MessageCircle, Minus, Moon, Palette, Plus, RefreshCw, Ruler, Save, Shield, Sparkles, Swords, Trash2, Upload, UserRound, Waves, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { bodyReferenceRanges, DEFAULT_CHARACTER, iqStyle, STAT_INFO, STAT_KEYS, SCENES, characterMarkdown, clamp, dialogueSignature, describeBody, estimateBody, generateDialogue, hexToRgb, hsvToHex, matchVoices, normalizeCharacter, readableInk, rgbToHex, rgbToHsv, updateStat, type Character } from "@/lib/character";

import { ProfileTraits } from "@/components/profile-traits";
import { selectedTrainer } from "@/lib/trainers";
import { ProfileAffiliation } from "@/components/profile-affiliation";
import { CombatPanel } from "@/components/combat-panel";
import { PortraitEditor } from "@/components/portrait-editor";
import { blobDataUrl, portraitBlob, portraitFilename, uploadPortrait } from "@/lib/portrait-client";

import { useCharacterSlots } from "@/lib/use-character-slots";
import { SlotManager } from "@/components/slot-manager";
import { randomizeDialogue } from "@/lib/character";
import { AuthRequiredError } from "@/lib/auth-required";
import { PersonalityCatalogPicker } from "@/components/personality-catalog-picker";
const TABS: { id: string; label: string; short: string; icon: LucideIcon }[] = [
  { id: "body", label: "프로필", short: "프로필", icon: Ruler },
  { id: "personality", label: "성격과 대사", short: "성격", icon: MessageCircle },
  { id: "color", label: "대표 색상", short: "색상", icon: Palette },
  { id: "abilities", label: "능력 수치", short: "능력", icon: Swords },
  { id: "combat", label: "전투 설정", short: "전투", icon: Swords },
];
const SUGGESTIONS = ["과묵함", "장난기", "냉소적", "호기심 많은", "자신감", "수줍음", "낙관적", "원칙적"];
const SWATCHES = ["#A78BFA", "#7DD3FC", "#5EEAD4", "#86EFAC", "#FDE68A", "#FDBA74", "#FDA4AF", "#F0ABFC"];

function initialCharacter(): Character {
  const c = structuredClone(DEFAULT_CHARACTER);
  c.dialogue = generateDialogue(c.keywords, c.register, [0, 0, 0], c.iq);
  c.dialogueSignature = dialogueSignature(c.keywords, c.register, c.iq);
  return c;
}

function NumberField({ value, onChange, min, max, step = 1, label, suffix, className = "" }: { value: number; onChange: (n: number) => void; min: number; max: number; step?: number; label: string; suffix?: string; className?: string }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = draft.trim() ? Number(draft) : value;
    const bounded = clamp(Number.isFinite(n) ? n : value, min, max);
    const rounded = step === 1 ? Math.round(bounded) : Math.round(bounded * 10) / 10;
    setDraft(String(rounded)); onChange(rounded);
  };
  return <div className={`number-field ${className}`}><Input type="number" inputMode={step === 1 ? "numeric" : "decimal"} aria-label={label} min={min} max={max} step={step} value={draft} onChange={e => {
    const raw = e.target.value; setDraft(raw);
    if (raw !== "" && Number.isFinite(Number(raw)) && Number(raw) >= min && Number(raw) <= max) onChange(step === 1 ? Math.round(Number(raw)) : Number(raw));
  }} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") { commit(); e.currentTarget.blur(); } }} />{suffix && <span>{suffix}</span>}</div>;
}

function Range({ label, ...props }: ComponentProps<typeof Slider> & { label: string }) {
  return <Slider {...props} aria-label={label} ref={node => { node?.querySelectorAll('[role="slider"]').forEach(thumb => thumb.setAttribute("aria-label", label)); }} />;
}

function SectionHeading({ icon: Icon, title, description, badge }: { icon: LucideIcon; title: string; description: string; badge?: string }) {
  return <div className="section-heading"><span className="section-icon"><Icon size={19} /></span><div><h2>{title}</h2><p>{description}</p></div>{badge && <span className="quiet-badge">{badge}</span>}</div>;
}

function MetricControl({ icon: Icon, title, detail, value, min, max, step, unit, onChange, first, last }: { icon: LucideIcon; title: string; detail: string; value: number; min: number; max: number; step: number; unit: string; onChange: (n: number) => void; first: string; last: string }) {
  return <div className="metric-control"><div className="metric-top"><div className="metric-label"><Icon size={16} /><div><h3>{title}</h3><p>{detail}</p></div></div><NumberField value={value} onChange={onChange} min={min} max={max} step={step} label={title} suffix={unit} /></div><Range label={`${title} 조절`} value={[value]} min={min} max={max} step={step} onValueChange={([n]) => onChange(n)} /><div className="range-captions"><span>{first}</span><span>{last}</span></div></div>;
}

function BodyLabels({ character: c }: { character: Character }) {
  const labels = describeBody(c.height, c.muscle, c.fat);
  return <div className="body-labels" aria-label="체형 설명" aria-live="polite"><span className={`muscle-description level-${labels.muscleLevel}`}><Dumbbell size={12} />{labels.muscle}</span><span className={`fat-description level-${labels.fatLevel}`}><Waves size={12} />{labels.fat}</span></div>;
}

function BodyPanel({ character: c, change }: { character: Character; change: (v: Partial<Character>) => void }) {
  const body = estimateBody(c.height, c.muscle, c.fat);
  const ranges = bodyReferenceRanges(c.height);
  const circumference = 2 * Math.PI * 74;
  const shares = [body.muscleShare, c.fat, body.otherShare];
  const colors = ["#AA91F5", "#E2B875", "#515561"];
  return <div className="panel body-panel"><SectionHeading icon={Ruler} title="프로필" description="숫자로 그려보는 캐릭터의 실루엣" badge="PROFILE" />
    <div className="profile-details"><div><label className="field-label">나이</label><NumberField value={c.age} onChange={age => change({ age })} min={0} max={99999} label="캐릭터 나이" suffix="세" /></div><div><label className="field-label" htmlFor="character-gender">성별</label><Select value={c.gender} onValueChange={value => change({ gender: value as Character["gender"] })}><SelectTrigger id="character-gender"><SelectValue placeholder="선택" /></SelectTrigger><SelectContent><SelectItem value="남">남</SelectItem><SelectItem value="여">여</SelectItem></SelectContent></Select></div></div>
    <ProfileAffiliation character={c} change={change} />
    <ProfileTraits character={c} change={change} />
    <div className="body-editor"><div className="body-controls">
      <MetricControl icon={Ruler} title="키" detail="Height" value={c.height} min={80} max={260} step={1} unit="cm" onChange={height => change({ height })} first="80 cm" last="260 cm" />
      <MetricControl icon={Dumbbell} title="골격근량" detail="Skeletal muscle" value={c.muscle} min={5} max={100} step={.1} unit="kg" onChange={muscle => change({ muscle })} first="적은 근육량" last="많은 근육량" />
      <MetricControl icon={Waves} title="체지방률" detail="Body fat" value={c.fat} min={3} max={60} step={.1} unit="%" onChange={fat => change({ fat })} first="3%" last="60%" />
    </div><div className="weight-result"><span className="eyebrow">ESTIMATED WEIGHT</span><h3>예상 몸무게</h3><div className="weight-ring"><svg viewBox="0 0 180 180" role="img" aria-label={`신체 구성: 근육 ${body.muscleShare.toFixed(1)}%, 지방 ${c.fat}%, 기타 제지방 ${body.otherShare.toFixed(1)}%`}><circle cx="90" cy="90" r="74" fill="none" stroke="#282931" strokeWidth="7" />{shares.map((v, i) => <circle key={i} cx="90" cy="90" r="74" fill="none" stroke={colors[i]} strokeWidth="7" strokeDasharray={`${Math.max(0, v / 100 * circumference - 5)} ${circumference}`} strokeDashoffset={-shares.slice(0, i).reduce((n, x) => n + x / 100 * circumference, 0)} transform="rotate(-90 90 90)" strokeLinecap="round" />)}</svg><div className="weight-number"><output aria-label="추정 몸무게">{body.weight.toFixed(1)}</output><span>kg</span></div></div><span className="result-note"><span className="live-dot" />실시간 계산</span><BodyLabels character={c} /><div className="body-legend"><span><i style={{ background: colors[0] }} />근육</span><span><i style={{ background: colors[1] }} />지방</span><span><i style={{ background: colors[2] }} />기타</span></div></div></div>
    <div className="composition"><div><span className="subheading">몸무게 구성</span><span className="small-muted">인간형 성인 기준 · 창작용 추정</span></div><div className="composition-bar" aria-hidden="true">{shares.map((v, i) => <span key={i} style={{ width: `${v}%`, background: colors[i] }} />)}</div><div className="composition-values"><span>골격근 <b>{c.muscle.toFixed(1)} <small>kg</small></b></span><span className="fat-mass-control">지방량 <NumberField value={Number(body.fatMass.toFixed(1))} min={Math.ceil((c.muscle + body.otherLean) * .03 / .97 * 10) / 10} max={Math.floor((c.muscle + body.otherLean) * .6 / .4 * 10) / 10} step={.1} label="지방량 직접 입력" suffix="kg" onChange={mass => change({ fat: Math.round(mass / (c.muscle + body.otherLean + mass) * 1000) / 10 })} /></span><span>기타 제지방 <b>{body.otherLean.toFixed(1)} <small>kg</small></b></span></div></div>
    <div className="body-reference" aria-live="polite"><strong>{c.height} cm 기준 · 적당한 범위</strong><span>근육 {ranges.muscle.min.toFixed(1)} kg 이상 ~ {ranges.muscle.max.toFixed(1)} kg 미만</span><span>지방량 {ranges.fat.min.toFixed(1)} kg 이상 ~ {ranges.fat.max.toFixed(1)} kg 미만</span><small>표시는 소수 첫째 자리로 반올림하며, 판정에는 반올림 전 값을 사용해요.</small></div>
    <div className="information"><Info size={15} /><p>골격근 이외의 제지방량을 <strong>9 × 키(m)²</strong>으로 가정해요. 몸무게는 <strong>(골격근량 + 기타 제지방량) ÷ (1 − 체지방률/100)</strong>로 계산해요. 지방량(kg)도 직접 입력할 수 있어요. 적당한 근육 범위는 8.5–12 × 키(m)², 적당한 지방량 범위는 3–7 × 키(m)² kg으로 키에 따라 함께 변해요(상한 미포함). 모든 종족에 같은 창작용 가정을 적용하며, 실제 신체·건강 판단 기준은 아니에요.</p></div>
  </div>;
}

function PersonalityPanel({ character: c, change }: { character: Character; change: (v: Partial<Character>) => void }) {
  const [input, setInput] = useState("");
  const matched = matchVoices(c.keywords);
  const dirty = c.dialogueSignature !== dialogueSignature(c.keywords, c.register, c.iq);
  function collected(extra = input) { return [...new Set([...c.keywords, ...extra.split(/[,，、\n]+/).map(s => s.trim().slice(0, 24)).filter(Boolean)])].slice(0, 8); }
  function add(extra = input) {
    if (c.keywords.length >= 8 && extra.trim()) { toast.info("성격 키워드는 최대 8개까지 넣을 수 있어요."); return; }
    change({ keywords: collected(extra) }); setInput("");
  }
  function generate() {
    const keywords = collected();
    if (!keywords.length) { toast.info("성격 키워드를 하나 이상 입력해주세요."); return; }
    setInput("");
    change({ keywords, dialogue: randomizeDialogue(keywords, c.register, c.iq, c.dialogue), dialogueSignature: dialogueSignature(keywords, c.register, c.iq) });
    toast.success("세 가지 상황의 대사를 만들었어요.");
  }
  function regenerateOne(index: number) {
    change({ dialogue: randomizeDialogue(c.keywords, c.register, c.iq, c.dialogue, index) });
  }
  return <div className="panel personality-panel"><SectionHeading icon={MessageCircle} title="성격과 대사" description="키워드에 목소리를 더해보세요" badge="CHARACTER VOICE" />
    <label className="field-label" htmlFor="keyword-input">성격 키워드 <span>{c.keywords.length}/8</span></label>
    <div className="keyword-box">{c.keywords.map(word => <span className="keyword" key={word}>{word}<button type="button" aria-label={`${word} 삭제`} onClick={() => change({ keywords: c.keywords.filter(w => w !== word) })}><X size={12} /></button></span>)}<input id="keyword-input" value={input} maxLength={220} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (!e.nativeEvent.isComposing && (e.key === "Enter" || e.key === ",")) { e.preventDefault(); add(); } }} placeholder={c.keywords.length ? "키워드 추가..." : "예: 차분함, 다정함, 신중함"} /><button className="add-keyword" onClick={() => add()} aria-label="키워드 추가"><Plus size={17} /></button></div>
    <p className="field-hint">Enter 또는 쉼표로 구분해요. 입력 중인 키워드도 생성할 때 함께 반영해요.</p>
    <div className="suggestions"><span>이런 성격은 어때요?</span>{SUGGESTIONS.map(s => <button key={s} disabled={c.keywords.includes(s) || c.keywords.length >= 8} onClick={() => add(s)}>+ {s}</button>)}</div>
    <PersonalityCatalogPicker selected={c.keywords} onSelect={name => add(name)} />
    <div className="preferences-grid"><div><label className="field-label" htmlFor="character-likes"><span><Heart size={15} />좋아하는 것</span><span>{c.likes.length}/800</span></label><Textarea id="character-likes" value={c.likes} maxLength={800} onChange={e => change({ likes: e.target.value })} placeholder="예: 비 오는 날, 따뜻한 차, 오래된 지도…" /></div><div><label className="field-label" htmlFor="character-dislikes"><span><HeartOff size={15} />싫어하는 것</span><span>{c.dislikes.length}/800</span></label><Textarea id="character-dislikes" value={c.dislikes} maxLength={800} onChange={e => change({ dislikes: e.target.value })} placeholder="예: 큰 소음, 거짓말, 약속을 어기는 행동…" /></div></div>
    <div className="iq-panel"><div className="metric-top"><div><h3>지능 <span>IQ</span></h3><p>{iqStyle(c.iq)}</p></div><NumberField value={c.iq} min={90} max={130} label="지능 IQ" onChange={iq => change({ iq })} /></div><Range label="IQ 조절" value={[c.iq]} min={90} max={130} step={1} onValueChange={([iq]) => change({ iq })} /><div className="range-captions"><span>90 · 단순하고 직관적</span><span>130 · 분석적이고 논리적</span></div><p className="field-hint">90–99는 단순한 표현, 100–119는 일상적인 표현, 120–130은 근거를 짚는 표현으로 대사를 만들어요. 캐릭터 연출을 위한 설정이에요.</p></div>
    <div className="voice-actions"><div className="voice-select"><label htmlFor="register">말투</label><Select value={c.register} onValueChange={register => change({ register: register as Character["register"] })}><SelectTrigger id="register"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">성격에 맞춤</SelectItem><SelectItem value="casual">반말</SelectItem><SelectItem value="polite">존댓말</SelectItem></SelectContent></Select></div><Button className="primary-button" onClick={generate}><Sparkles size={16} />대사 3개 만들기</Button></div>
    <p className="field-hint">목록의 205개 성격은 상황마다 5종씩, 기존 성격은 13종씩 대사를 제공해요. 성격별 핵심 표현과 상황별 문장을 조합한 창작 초안이며, 여러 성격을 선택하면 후보를 모아 랜덤으로 뽑아요. IQ에 따른 표현과 직전 대사 중복 방지도 적용돼요. 좋아하는 것과 싫어하는 것은 설정 기록용이며, 대사 생성에는 반영하지 않아요.</p>
    {matched.found.length > 0 && <div className="voice-insight"><Sparkles size={16} /><p><strong>{matched.found.map(v => v.id).join(" · ")}</strong><span>{matched.found[0].style}. 상황마다 성격의 다른 면을 표현해요.</span></p></div>}
    {matched.unknown.length > 0 && <p className="field-hint unknown-hint">‘{matched.unknown.join("’, ‘")}’은 아직 말투 규칙에 없는 자유 키워드예요. {matched.found.length ? "해석 가능한 나머지 성격을 대사에 반영해요." : "현재는 차분한 기본 대사가 나와요. 추천 키워드를 더하면 말투가 달라져요."}</p>}
    {dirty && c.dialogue.length > 0 && <p className="stale-note"><Info size={14} />현재 성격·말투·IQ 기준으로 대사를 다시 만들 수 있어요. 대사 3개 만들기를 눌러주세요.</p>}
    <div className="dialogues">{SCENES.map((scene, i) => <article className={`dialogue-card scene-${i}`} key={scene.en}><div className="dialogue-top"><span className="scene-number">0{i + 1}</span><div><h3>{scene.name}</h3><p>{scene.hint}</p></div><div className="dialogue-tools"><button aria-label={`${scene.name} 대사 복사`} disabled={!c.dialogue[i]} onClick={() => copyText(c.dialogue[i], "대사를 복사했어요.")}><Copy size={14} /></button><button aria-label={`${scene.name} 대사 다시 만들기`} disabled={!c.dialogue[i] || dirty} onClick={() => regenerateOne(i)}><RefreshCw size={14} /></button></div></div><div className="quote-editor"><span aria-hidden="true">“</span><Textarea aria-label={`${scene.name} 대사 편집`} value={c.dialogue[i] ?? ""} maxLength={600} placeholder="성격을 입력하고 대사를 만들어보세요." onChange={e => change({ dialogue: SCENES.map((_, j) => i === j ? e.target.value : c.dialogue[j] || "") })} /></div><span className="scene-en">{scene.en}</span></article>)}</div>
    <div className="information"><Info size={15} /><p>성격 키워드를 말투 규칙에 연결한 창작용 초안이에요. 대사를 눌러 캐릭터의 배경과 관계에 맞게 직접 다듬을 수 있어요.</p></div>
  </div>;
}

function ColorPanel({ color, change }: { color: string; change: (v: Partial<Character>) => void }) {
  const rgb = hexToRgb(color), hsv = rgbToHsv(rgb);
  const [hue, setHue] = useState(hsv.h), [hexDraft, setHexDraft] = useState(color);
  useEffect(() => { setHexDraft(color); const next = rgbToHsv(hexToRgb(color)); if (next.s > .1 && next.v > .1) setHue(next.h); }, [color]);
  function choose(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    change({ color: hsvToHex(hue, clamp((e.clientX - rect.left) / rect.width * 100, 0, 100), clamp(100 - (e.clientY - rect.top) / rect.height * 100, 0, 100)) });
  }
  function commitHex() {
    let normalized = hexDraft.startsWith("#") ? hexDraft : `#${hexDraft}`;
    if (/^#[0-9a-f]{3}$/i.test(normalized)) normalized = "#" + normalized.slice(1).split("").map(s => s + s).join("");
    if (/^#[0-9a-f]{6}$/i.test(normalized)) { change({ color: normalized.toUpperCase() }); setHexDraft(normalized.toUpperCase()); }
    else { setHexDraft(color); toast.info("HEX 코드는 #A78BFA처럼 입력해주세요."); }
  }
  return <div className="panel color-panel"><SectionHeading icon={Palette} title="대표 색상" description="한눈에 떠오르는, 이 캐릭터만의 색" badge="SIGNATURE COLOR" />
    <div className="color-workspace"><div className="color-controls"><div className="sv-box" style={{ backgroundColor: `hsl(${hue} 100% 50%)` }} tabIndex={0} role="group" aria-label="채도와 명도 색상 박스. 좌우 방향키로 채도, 위아래 방향키로 명도를 조절합니다." onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.focus(); choose(e); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) choose(e); }} onKeyDown={e => { if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return; e.preventDefault(); const step = e.shiftKey ? 10 : 1; change({ color: hsvToHex(hue, clamp(hsv.s + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0), 0, 100), clamp(hsv.v + (e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0), 0, 100)) }); }}><span className="sv-cursor" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: color }} /></div><div className="hue-row"><Palette size={15} /><Range label="색조" className="hue-slider" value={[hue]} min={0} max={359} step={1} onValueChange={([h]) => { setHue(h); change({ color: hsvToHex(h, hsv.s, hsv.v) }); }} /><input type="color" aria-label="기기 색상 선택기 열기" value={color} onChange={e => change({ color: e.target.value.toUpperCase() })} /></div><p className="field-hint">박스를 드래그하거나 방향키로 색을 골라보세요.</p></div>
    <div className="large-swatch" style={{ backgroundColor: color, color: readableInk(color) }}><span className="eyebrow">YOUR SIGNATURE</span><span className="swatch-letter">Aa</span><div><strong>{color}</strong><span>RGB {rgb.join(" · ")}</span></div></div></div>
    <div className="rgb-inputs"><div className="hex-control"><label className="field-label" htmlFor="hex-input">HEX 코드</label><div><Input id="hex-input" spellCheck={false} maxLength={7} value={hexDraft} onChange={e => { setHexDraft(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) change({ color: e.target.value.toUpperCase() }); }} onBlur={commitHex} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /><button aria-label="HEX 코드 복사" onClick={() => copyText(color, "HEX 코드를 복사했어요.")}><Copy size={15} /></button></div></div>{["R", "G", "B"].map((label, i) => <div className="rgb-control" key={label}><label className={`field-label rgb-${label.toLowerCase()}`}>{label}<span>{["Red", "Green", "Blue"][i]}</span></label><NumberField value={rgb[i]} onChange={n => change({ color: rgbToHex(rgb.map((v, j) => i === j ? n : v)) })} min={0} max={255} label={`${label} 색상값`} /></div>)}</div>
    <div className="rgb-sliders">{["Red", "Green", "Blue"].map((label, i) => <div key={label}><span className={`channel-dot channel-${i}`} /><span>{label}</span><Range label={`${label} 값 조절`} className={`channel-slider channel-slider-${i}`} value={[rgb[i]]} min={0} max={255} step={1} onValueChange={([n]) => change({ color: rgbToHex(rgb.map((v, j) => i === j ? n : v)) })} /><span className="mono">{rgb[i]}</span></div>)}</div>
    <div className="recommended-colors"><div className="subheading">영감이 되는 색들<span>마음에 드는 색에서 시작해요</span></div><div>{SWATCHES.map(s => <button key={s} className={color === s ? "selected" : ""} style={{ backgroundColor: s, color: readableInk(s) }} aria-label={`${s} 색상 선택`} aria-pressed={color === s} onClick={() => change({ color: s })}>{color === s && <Check size={18} />}</button>)}</div></div>
  </div>;
}

function Radar({ stats, color }: { stats: Character["stats"]; color: string }) {
  const point = (i: number, radius: number) => [140 + Math.cos(i * Math.PI / 3 - Math.PI / 2) * radius, 122 + Math.sin(i * Math.PI / 3 - Math.PI / 2) * radius];
  return <svg className="radar" viewBox="0 0 280 246" role="img" aria-label={`능력치: ${STAT_KEYS.map(k => `${STAT_INFO[k].name} ${stats[k]}`).join(", ")}`}>
    {[.25, .5, .75, 1].map(scale => <polygon key={scale} points={STAT_KEYS.map((_, i) => point(i, 78 * scale).join(",")).join(" ")} fill="none" stroke="#33343e" strokeWidth="1" />)}
    {STAT_KEYS.map((_, i) => <line key={i} x1="140" y1="122" x2={point(i, 78)[0]} y2={point(i, 78)[1]} stroke="#2c2d36" />)}
    <polygon points={STAT_KEYS.map((k, i) => point(i, stats[k] / 100 * 78).join(",")).join(" ")} fill={color} fillOpacity=".18" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    {STAT_KEYS.map((k, i) => <g key={k}><circle cx={point(i, stats[k] / 100 * 78)[0]} cy={point(i, stats[k] / 100 * 78)[1]} r="3" fill={color} /><text x={point(i, 104)[0]} y={point(i, 104)[1] - 2} textAnchor="middle" fill="#9c9ba9" fontSize="11">{STAT_INFO[k].name}</text><text x={point(i, 104)[0]} y={point(i, 104)[1] + 14} textAnchor="middle" fill="#e7e5ee" fontSize="13" fontWeight="600">{stats[k]}</text></g>)}
  </svg>;
}

function AbilitiesPanel({ character: c, change }: { character: Character; change: (v: Partial<Character>) => void }) {
  return <div className="panel abilities-panel"><SectionHeading icon={Swords} title="능력 수치" description="여섯 가지 능력을 원하는 만큼 조절하세요" badge="0 — 100" />
    <div className="stat-grid">{STAT_KEYS.map(key => { const info = STAT_INFO[key], score = c.stats[key]; const update = (value: number) => change({ stats: updateStat(c.stats, key, value) }); return <div className="stat-control" key={key} style={{ "--stat-color": info.color } as CSSProperties}><div><span className="stat-en">{info.en}</span><span className="stat-maximum">최대 100</span></div><h3>{info.name}</h3><p>{info.detail}</p><div className="stat-stepper"><button aria-label={`${info.name} 감소`} disabled={score <= 0} onClick={() => update(score - 1)}><Minus size={14} /></button><NumberField value={score} min={0} max={100} onChange={update} label={`${info.name} 능력치`} /><button aria-label={`${info.name} 증가`} disabled={score >= 100} onClick={() => update(score + 1)}><Plus size={14} /></button></div><Range label={`${info.name} 조절`} value={[score]} min={0} max={100} step={1} onValueChange={([value]) => update(value)} /><div className="range-captions"><span>0</span><span>100</span></div></div>; })}</div>
  </div>;
}

function CharacterPreview({ character: c, onExport, photoBusy, onPhotoUpload, onChange }: { character: Character; onExport: () => void; photoBusy: boolean; onPhotoUpload: (file: File) => void; onChange: (patch: Partial<Character>) => void }) {
  const body = estimateBody(c.height, c.muscle, c.fat);
  return <aside className="preview-column"><div className="preview-title"><span>캐릭터 미리보기</span><span><i className="live-dot" />LIVE</span></div><div className="character-card" style={{ "--character-color": c.color } as CSSProperties}>
    <PortraitEditor portrait={c.portrait} name={c.name} busy={photoBusy} onUpload={onPhotoUpload} onChange={portrait => onChange({ portrait })} />
    <div className="card-info"><div className="card-name"><span className="eyebrow">CHARACTER SHEET</span><h2>{c.name || "이름 없는 캐릭터"}</h2><p>{c.concept || "어떤 이야기를 가진 캐릭터인가요?"}</p></div><div className="preview-tags">{c.keywords.length ? c.keywords.slice(0, 4).map(word => <span key={word}>{word}</span>) : <span className="empty-tag">성격을 더해주세요</span>}{c.keywords.length > 4 && <span>+{c.keywords.length - 4}</span>}</div>
    {c.profileTraits.length > 0 && <div className="preview-profile-traits" aria-label="프로필 특성">{c.profileTraits.map(trait => <span key={trait}>{trait}</span>)}</div>}
    {selectedTrainer(c.baseClass, c.trainerId) && <p className="preview-trainer">트레이너 · {selectedTrainer(c.baseClass, c.trainerId)!.name}</p>}
    <p className="preview-origin">{c.age}세{c.gender && ` · ${c.gender}`} · {c.race || "종족 미정"} · {c.country || "출신 국가 미정"}{c.affiliation && ` · ${c.affiliation}`}</p><div className="preview-metrics"><div><span>키</span><strong>{c.height}<small>cm</small></strong></div><div><span>추정 몸무게</span><strong>{body.weight.toFixed(1)}<small>kg</small></strong></div><div><span>체지방률</span><strong>{c.fat}<small>%</small></strong></div></div><div className="preview-body-description"><BodyLabels character={c} /></div>
    {(c.baseClass || c.primaryWeapon || c.secondaryWeapon || c.stageRank || c.combatTags.length > 0) && <div className="preview-combat"><div><span>전투 프로필</span><strong>{c.stageRank || "등급 미정"}</strong></div>{c.baseClass && <p className="preview-class"><span>베이스 계열</span><strong>{c.baseClass}</strong></p>}<dl><div><dt>주무기</dt><dd>{c.primaryWeapon || "미정"}</dd></div><div><dt>보조무기</dt><dd>{c.secondaryWeapon || "미정"}</dd></div></dl>{c.combatTags.length > 0 && <div className="preview-combat-tags">{c.combatTags.map(tag => <span key={tag}>{tag}</span>)}</div>}</div>}
    <div className="preview-stats-heading"><span>능력치 밸런스</span><span>각 최대 100</span></div><Radar stats={c.stats} color={c.color} /><div className="preview-color"><span>시그니처 컬러</span><button aria-label="대표 색상 코드 복사" onClick={() => copyText(c.color, "대표색 코드를 복사했어요.")}><i style={{ backgroundColor: c.color }} />{c.color}<Copy size={12} /></button></div></div></div><Button variant="outline" className="preview-export" onClick={onExport} disabled={photoBusy}><ArrowDownToLine size={16} />캐릭터 시트 내보내기<ArrowUpRight size={15} /></Button><p className="preview-note"><Layers3 size={13} />모든 설정은 나만의 이야기를 위한 출발점이에요.</p></aside>;
}

async function copyText(value: string, message: string) {
  try { await navigator.clipboard.writeText(value); toast.success(message); }
  catch { toast.error("복사하지 못했어요. 텍스트를 선택해 직접 복사해주세요."); }
}

export default function CharacterStudio({ signedIn, signInLink }: { signedIn: boolean; signInLink: ReactNode }) {
  const [character, setCharacter] = useState<Character>(initialCharacter);
  const [activeTab, setActiveTab] = useState("body");
  const storage = useCharacterSlots(character, setCharacter, signedIn);
  const [signInOpen, setSignInOpen] = useState(false);
  const saved = storage.saved;
  const [exportOpen, setExportOpen] = useState(false), [resetOpen, setResetOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoOperation = useRef(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [exporting, setExporting] = useState<"json" | "md" | "image" | "png" | "jpg" | null>(null);
  const change = (patch: Partial<Character>) => setCharacter(prev => ({ ...prev, ...patch }));
  function handleAuthError(error: unknown) {
    if (!(error instanceof AuthRequiredError)) return false;
    storage.requireSignIn(); setExportOpen(false); setSignInOpen(true); return true;
  }
  function backupBeforeSignIn() {
    // No network: expired photo authentication must not block a settings backup.
    // Keep the portrait reference for retrieval by the same account after sign-in.
    const content = JSON.stringify({ ...character, format: "persona-studio", version: 7 }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${(character.name || "캐릭터").replace(/[^\p{L}\p{N}_-]+/gu, "_")}_login_backup.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast.success("설정을 JSON으로 내보냈어요. 다운로드된 파일을 확인한 뒤 로그인해주세요.");
  }
  async function addPhoto(file: File) {
    if (storage.authRequired) { setSignInOpen(true); return; }
    const operation = ++photoOperation.current;
    setPhotoBusy(true);
    try {
      const portrait = await uploadPortrait(file, file.name);
      if (operation !== photoOperation.current) return;
      change({ portrait }); toast.success("캐릭터 사진을 넣었어요. 저장을 누르면 시트에 함께 보관돼요.");
    } catch (error) { if (operation === photoOperation.current && !handleAuthError(error)) toast.error(error instanceof Error ? error.message : "사진을 올리지 못했어요."); }
    finally { if (operation === photoOperation.current) setPhotoBusy(false); }
  }
  async function download(format: "json" | "md" | "image" | "png" | "jpg") {
    if (exporting || photoBusy) return;
    const snapshot = structuredClone(character);
    setExporting(format);
    try {
      const photo = snapshot.portrait ? await portraitBlob(snapshot.portrait) : null;
      const photoName = photo ? portraitFilename(snapshot.name, photo.type) : undefined;
      let blob: Blob, filename: string;
      if (format === "png" || format === "jpg") {
        const { exportCharacterSheet, sheetFilename } = await import("@/lib/character-sheet-client");
        blob = await exportCharacterSheet(snapshot, format, photo); filename = sheetFilename(snapshot.name, format);
      } else if (format === "image") {
        if (!photo || !photoName) throw new Error("먼저 캐릭터 사진을 넣어주세요.");
        blob = photo; filename = photoName;
      } else {
        if (format === "json" && photo && snapshot.portrait) snapshot.portrait.url = await blobDataUrl(photo);
        const content = format === "json" ? JSON.stringify({ ...snapshot, format: "persona-studio", version: 7 }, null, 2) : characterMarkdown(snapshot, photoName);
        blob = new Blob([content], { type: format === "json" ? "application/json;charset=utf-8" : "text/markdown;charset=utf-8" });
        filename = `${(snapshot.name || "캐릭터").replace(/[^\p{L}\p{N}_-]+/gu, "_")}_character.${format}`;
      }
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success(format === "png" || format === "jpg" ? `라시안컷 캐릭터 시트지를 ${format.toUpperCase()}로 내보냈어요.` : format === "json" ? "사진과 모든 설정을 함께 백업했어요." : format === "image" ? "캐릭터 사진을 내보냈어요." : "마크다운 시트를 내보냈어요.");
    } catch (error) { if (!handleAuthError(error)) toast.error(error instanceof Error ? error.message : "파일을 내보내지 못했어요."); }
    finally { setExporting(null); }
  }
  async function importFile(file: File | undefined) {
    if (!file || photoBusy || exporting) return;
    const operation = ++photoOperation.current;
    setPhotoBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("10MB 이하의 캐릭터 JSON 파일을 선택해주세요.");
      const restored = normalizeCharacter(JSON.parse(await file.text()));
      if (restored.portrait?.url.startsWith("data:")) {
        const existing = restored.portrait;
        const blob = await portraitBlob(existing);
        restored.portrait = { ...await uploadPortrait(blob, existing.name), fit: existing.fit };
      }
      if (operation !== photoOperation.current) return;
      storage.detach(); setCharacter(restored); setExportOpen(false); toast.success("캐릭터를 불러왔어요. 저장을 누르면 새 슬롯에 보관돼요.");
    } catch (error) { if (!handleAuthError(error)) toast.error(error instanceof Error ? error.message : "캐릭터 파일을 읽지 못했어요."); }
    finally { if (fileInput.current) fileInput.current.value = ""; if (operation === photoOperation.current) setPhotoBusy(false); }
  }
  const tabIndex = TABS.findIndex(t => t.id === activeTab);
  return <><a className="skip-link" href="#character-editor">캐릭터 편집기로 이동</a><header className="topbar"><div className="topbar-inner"><a className="brand" href="/" aria-label="Rasyancut : Vanguard Character Maker 홈"><span className="brand-logo"><img src="/rasyancut-logo.png" alt="Rasyancut 로고" width={1000} height={1000} /></span><span className="brand-name">Rasyancut<span className="brand-colon"> :</span> Vanguard<small>Character Maker</small></span></a><div className="topbar-divider" /><span className="workspace-label">상상에, 인격을 더하다.</span><span className="dark-label"><Moon size={13} />DARK WORKSPACE</span></div></header>
    <main className="studio-shell" id="character-editor"><div className="breadcrumb"><Layers3 size={13} /><span>나의 작업실</span><ChevronRight size={12} /><span>캐릭터 에디터</span></div><div className="page-heading"><div><div className="eyebrow"><span />IMAGINE. DEFINE. BRING TO LIFE.</div><h1>캐릭터 만들기<span className="heading-star">✦</span></h1><p>작은 설정 하나에서, 당신만의 이야기가 시작돼요.</p></div><div className="page-actions"><Button variant="outline" className="outline-button new-character" disabled={photoBusy || storage.busy} onClick={() => setResetOpen(true)}><Plus size={16} />새 캐릭터</Button><Button className="primary-button" disabled={photoBusy || storage.busy} onClick={() => storage.authRequired ? setSignInOpen(true) : storage.save()}><Save size={16} />{storage.authRequired ? "로그인 후 저장" : "캐릭터 저장"}</Button></div></div>
    <SlotManager storage={storage} disabled={photoBusy || Boolean(exporting)} onSignIn={() => setSignInOpen(true)} />
    <fieldset className="studio-fieldset" disabled={storage.busy}><div className="workspace-grid"><section className="editor-column" aria-label="캐릭터 설정"><div className="identity-panel"><div className="identity-icon"><UserRound size={22} /></div><div className="identity-inputs"><div><label htmlFor="character-name">캐릭터 이름</label><Input id="character-name" value={character.name} maxLength={30} placeholder="이름을 지어주세요" onChange={e => change({ name: e.target.value })} /></div><div className="concept-input"><label htmlFor="character-concept">한 줄 소개</label><Input id="character-concept" value={character.concept} maxLength={100} placeholder="어떤 이야기를 가진 캐릭터인가요?" onChange={e => change({ concept: e.target.value })} /></div></div><span className={`save-state ${saved ? "is-saved" : ""}`}>{saved ? <CheckCheck size={13} /> : <span className="draft-dot" />}{saved ? "저장됨" : "편집 중"}</span></div>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="editor-tabs"><TabsList className="editor-tab-list" aria-label="캐릭터 설정 도구">{TABS.map((tab, i) => <TabsTrigger className="editor-tab" value={tab.id} key={tab.id}><tab.icon size={16} /><span className="desktop-tab-label">{tab.label}</span><span className="mobile-tab-label">{tab.short}</span><span className="tab-index">0{i + 1}</span></TabsTrigger>)}</TabsList>
      <TabsContent value="body"><BodyPanel character={character} change={change} /></TabsContent><TabsContent value="personality"><PersonalityPanel character={character} change={change} /></TabsContent><TabsContent value="color"><ColorPanel color={character.color} change={change} /></TabsContent><TabsContent value="abilities"><AbilitiesPanel character={character} change={change} /></TabsContent><TabsContent value="combat"><CombatPanel character={character} change={change} /></TabsContent>
    </Tabs><div className="editor-footer"><div className="step-indicator">{TABS.map((t, i) => <span key={t.id} className={i === tabIndex ? "active" : ""} />)}<span>{String(tabIndex + 1).padStart(2, "0")} / {String(TABS.length).padStart(2, "0")}</span></div>{tabIndex < TABS.length - 1 ? <button onClick={() => setActiveTab(TABS[tabIndex + 1].id)}>{TABS[tabIndex + 1].label} 설정하기<ArrowRight size={15} /></button> : <button onClick={() => setExportOpen(true)}>완성된 시트 내보내기<ArrowRight size={15} /></button>}</div><div className="local-note"><Shield size={14} /><p>저장을 누르면 <b>현재 슬롯</b>에 보관돼요. ‘새 슬롯에 저장’으로 캐릭터를 더 보관하고, 슬롯 관리에서 불러오거나 삭제할 수 있어요.</p></div></section><CharacterPreview character={character} onExport={() => setExportOpen(true)} photoBusy={photoBusy || storage.busy} onPhotoUpload={addPhoto} onChange={change} /></div></fieldset>
    <footer className="site-footer"><span className="footer-brand">Rasyancut : Vanguard Character Maker<span>당신의 상상이 머무는 곳</span></span><span>MADE FOR YOUR NEXT CHARACTER<Heart size={11} /></span></footer></main>
    <Dialog open={exportOpen} onOpenChange={setExportOpen}><DialogContent className="export-dialog"><DialogHeader><span className="modal-icon"><Download size={22} /></span><DialogTitle>이야기의 시작을 보관하세요</DialogTitle><DialogDescription>현재 캐릭터의 모든 설정과 대사를 파일로 내보내요.</DialogDescription></DialogHeader><div className="sheet-export-heading"><span>RASYANCUT CHARACTER SHEET</span><p>아이보리 바탕과 검정·금색 테두리의 고해상도 시트예요. 긴 내용은 이미지 하단의 상세 기록으로 이어져요.</p></div><button className="export-option sheet-export-option" disabled={Boolean(exporting) || photoBusy} onClick={() => download("png")}><span className="format-icon sheet-format">PNG</span><span><strong>라시안컷 캐릭터 시트지 PNG</strong><small>글자와 선을 선명하게 보관하는 이미지</small></span><ArrowDownToLine size={18} /></button><button className="export-option sheet-export-option" disabled={Boolean(exporting) || photoBusy} onClick={() => download("jpg")}><span className="format-icon sheet-format">JPG</span><span><strong>라시안컷 캐릭터 시트지 JPG</strong><small>사진과 설정을 한 장으로 공유하는 이미지</small></span><ArrowDownToLine size={18} /></button><button className="export-option" disabled={Boolean(exporting) || photoBusy} onClick={() => download("md")}><span className="format-icon">M↓</span><span><strong>마크다운 시트</strong><small>옵시디언에서 열거나 문서로 보관해요.</small></span><ArrowDownToLine size={18} /></button><button className="export-option" disabled={Boolean(exporting) || photoBusy} onClick={() => download("json")}><span className="format-icon">{`{ }`}</span><span><strong>캐릭터 백업 · JSON</strong><small>사진, 취향, 전투 설정까지 함께 보관해요.</small></span><ArrowDownToLine size={18} /></button>{character.portrait && <><button className="export-option" disabled={Boolean(exporting) || photoBusy} onClick={() => download("image")}><span className="format-icon"><Upload size={18} /></span><span><strong>캐릭터 사진 파일</strong><small>마크다운과 같은 폴더에 넣으면 사진이 표시돼요.</small></span><ArrowDownToLine size={18} /></button><p className="field-hint">사진이 있는 마크다운은 사진 파일도 함께 내려받아 같은 폴더에 보관해주세요. JSON은 사진까지 한 파일에 담아요.</p></>}{exporting && <p className="export-progress" role="status"><LoaderCircle size={15} className="animate-spin" />사진과 설정을 준비하고 있어요.</p>}<div className="import-row"><p>이전에 만든 캐릭터가 있나요?<small>불러오면 현재 작업 화면이 바뀝니다.</small></p><Button variant="outline" className="outline-button" disabled={photoBusy || Boolean(exporting)} onClick={() => fileInput.current?.click()}><Upload size={14} />불러오기</Button><input ref={fileInput} type="file" accept=".json,application/json" aria-label="캐릭터 JSON 파일 불러오기" className="sr-only" onChange={e => importFile(e.target.files?.[0])} /></div></DialogContent></Dialog>
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>새 캐릭터를 만들까요?</AlertDialogTitle><AlertDialogDescription>현재 작업 화면을 비우고 새로운 시트를 시작해요. 저장된 슬롯은 유지돼요. 아직 저장하지 않은 편집 내용은 먼저 슬롯에 저장해주세요.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>계속 편집</AlertDialogCancel><AlertDialogAction onClick={() => { photoOperation.current += 1; setPhotoBusy(false); const next = structuredClone(DEFAULT_CHARACTER); next.name = ""; next.concept = ""; next.keywords = []; next.dialogue = []; next.dialogueSignature = ""; next.stats = { str: 10, con: 10, energy: 10, dex: 10, cha: 10, wis: 10 }; storage.detach(); setCharacter(next); setActiveTab("body"); }}>새 시트 만들기</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={signInOpen} onOpenChange={setSignInOpen}><DialogContent><DialogHeader><DialogTitle>ChatGPT로 로그인</DialogTitle><DialogDescription>로그인 화면으로 이동하면 저장하지 않은 편집 내용이 사라질 수 있어요. 먼저 JSON 백업을 다운로드해주세요. 로그인 후 ‘내보내기 → 불러오기’로 이어서 편집할 수 있어요.</DialogDescription></DialogHeader><p className="field-hint">로그인용 백업은 모든 설정과 대사를 담아요. 서버에 올린 사진은 파일 대신 연결 정보만 포함하므로, 같은 계정으로 로그인해야 다시 볼 수 있어요.</p><div className="signin-actions"><Button variant="outline" disabled={photoBusy || Boolean(exporting)} onClick={backupBeforeSignIn}>현재 설정 JSON 백업</Button>{!photoBusy && !exporting && signInLink}<Button variant="ghost" onClick={() => setSignInOpen(false)}>계속 편집</Button></div></DialogContent></Dialog>
    <Toaster position="bottom-center" theme="dark" closeButton />
  </>;
}
