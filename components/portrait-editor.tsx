"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, Replace, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Portrait } from "@/lib/character";

export function PortraitEditor({ portrait, name, busy, onUpload, onChange }: { portrait: Portrait | null; name: string; busy: boolean; onUpload: (file: File) => void; onChange: (photo: Portrait | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false), [failedUrl, setFailedUrl] = useState("");
  const failed = Boolean(portrait?.url && failedUrl === portrait.url);
  return <div className={`portrait-editor ${portrait ? "has-portrait" : ""} ${dragging ? "is-dragging" : ""}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file && !busy) onUpload(file); }}>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="캐릭터 사진 파일" className="sr-only" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ""; }} />
    <div className="portrait-image-area">{portrait && !failed ? <img src={portrait.url} alt={`${name || "캐릭터"} 사진`} style={{ objectFit: portrait.fit }} onError={() => setFailedUrl(portrait.url)} /> : <div className="portrait-placeholder"><span><Camera size={30} /></span><strong>{failed ? "사진을 불러오지 못했어요" : "캐릭터에게 얼굴을 더해보세요"}</strong><p>{failed ? "아래 버튼으로 사진을 다시 선택해주세요." : "사진을 끌어놓거나 파일을 선택해주세요."}</p><button disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={15} />{failed ? "사진 다시 선택" : "캐릭터 사진 추가"}</button><small>JPG · PNG · WEBP / 최대 5MB</small></div>}{busy && <div className="portrait-loading" role="status"><LoaderCircle className="animate-spin" size={25} /><span>사진을 올리는 중이에요</span></div>}</div>
    {portrait && <div className="portrait-toolbar"><button disabled={busy} onClick={() => input.current?.click()}><Replace size={13} />교체</button><button disabled={busy} onClick={() => onChange(null)}><Trash2 size={13} />삭제</button><Select value={portrait.fit} onValueChange={fit => onChange({ ...portrait, fit: fit as Portrait["fit"] })} disabled={busy}><SelectTrigger aria-label="캐릭터 사진 표시 방식"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contain">전체 보기</SelectItem><SelectItem value="cover">공간 채우기</SelectItem></SelectContent></Select></div>}
  </div>;
}
