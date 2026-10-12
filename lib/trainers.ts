import type { BaseClass } from "./character.ts";

// Official planning document, 시스템/계열 tab, checked 2026-09-03.
export const TRAINERS = [
  { id: "kyle", baseClass: "블레이드", name: "Kyle · 카일", specialty: "공격형", distribution: [80, 10, 10] },
  { id: "claire", baseClass: "블레이드", name: "Claire · 클레어", specialty: "단일 공격형", distribution: [90, 10, 0] },
  { id: "cassius", baseClass: "블레이드", name: "Cassius · 카시우스", specialty: "방어형", distribution: [50, 40, 10] },
  { id: "camilla", baseClass: "블레이드", name: "Camilla · 카밀라", specialty: "서포트형", distribution: [55, 15, 30] },
  { id: "dexter", baseClass: "가디언", name: "Dexter · 덱스터", specialty: "가디언 전직관", distribution: [15, 60, 25] },
  { id: "jasper", baseClass: "레인저", name: "Jasper · 제스퍼", specialty: "레인저 전직관", distribution: [60, 15, 25] },
] as const;
export type TrainerId = typeof TRAINERS[number]["id"] | "";
export function trainersForClass(baseClass: BaseClass) { return TRAINERS.filter(trainer => trainer.baseClass === baseClass); }
export function selectedTrainer(baseClass: BaseClass, trainerId: unknown) { return trainersForClass(baseClass).find(trainer => trainer.id === trainerId); }
export function normalizeTrainer(baseClass: BaseClass, trainerId: unknown): TrainerId { return selectedTrainer(baseClass, trainerId)?.id || ""; }
export function changeBaseClass(baseClass: BaseClass, trainerId: unknown) { return { baseClass, trainerId: normalizeTrainer(baseClass, trainerId) }; }
export const PROFILE_TRAITS = ["전직관 NPC", "기본 스킬 NPC", "적NPC", "아군NPC", "퀘스트 NPC"] as const;
export type ProfileTrait = typeof PROFILE_TRAITS[number];
export function normalizeProfileTraits(raw: unknown): ProfileTrait[] {
  return Array.isArray(raw) ? [...new Set(raw.filter((value): value is ProfileTrait => PROFILE_TRAITS.includes(value as ProfileTrait)))] : [];
}
