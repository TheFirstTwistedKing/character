import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { COMBAT_TAG_GROUPS, COMBAT_TAGS, DEBUFFS, debuffDescription, normalizeDebuffs, mergeCombatTagSelection } from '../lib/combat-catalog.ts';
import { DEFAULT_CHARACTER, normalizeCharacter, skillName, skillValue, characterMarkdown } from '../lib/character.ts';

test('all 150 requested traits are grouped exactly, preserving distinct similar terms and legacy tags', () => {
  const expected = [
    '공격력 파괴력 살상력 화력 폭발력 관통력 절단력 타격력 충격력 제압력 치명타 연속타격 속사 난사 저격 기습 암습 반격 추격 마무리 처형 돌진 강타 연격 협공 범위공격',
    '방어력 내구력 생존력 저항력 회복력 재생력 차단 방패술 철벽 요새화 피해감소 피해반사 마법저항 물리저항 상태저항 충격흡수 방어태세 불굴 인내 수호 보호막 회피 흘리기 받아치기 무효화 피해분산',
    '민첩성 순발력 반응속도 이동속도 공격속도 가속 도약 질주 비행 활공 순간이동 은신 잠입 후퇴 이탈 측면기동 위치전환 거리조절 추적 회전기동',
    '전투감각 직감 통찰력 판단력 집중력 관찰력 예측력 분석력 적응력 지휘력 통솔력 협동심 침착성 결단력 경계심 정밀성 정확도 사거리 매복 유인 교란 견제 포위 진형유지',
    '용기 투지 의지력 정신력 집중 냉정 광기 광폭화 분노 흉포함 대담함 집념 끈기 충성심 공포저항 고통내성 위압감 살기 사기 전의',
    '흡혈 중독 출혈 기절 속박 둔화 침묵 감전 빙결 연소 부식 석화 혼란 세뇌 저주 정화 해제 면역 투명화 환영 소환 변신 부활 생명흡수 마력흡수 방어무시 필중 즉사 연쇄공격 지속피해 폭발피해 반사피해 환경적응 전투학습',
  ];
  assert.deepEqual(COMBAT_TAG_GROUPS.map(g => g.tags.join(' ')), expected);
  assert.equal(COMBAT_TAG_GROUPS.flatMap(g => g.tags).length,150);
  assert.equal(COMBAT_TAGS.length,158); assert.equal(new Set(COMBAT_TAGS).size,158);
  for(const tag of COMBAT_TAGS) assert.deepEqual(normalizeCharacter({...DEFAULT_CHARACTER,combatTags:[tag]}).combatTags,[tag]);
});

test('category toggles and searches preserve hidden and custom selections', () => {
  const existing=['나만의 특성','집중','집중력','공격력'];
  assert.deepEqual(mergeCombatTagSelection(existing,['공격력','파괴력'],['파괴력']),['나만의 특성','집중','집중력','파괴력']);
  assert.deepEqual(mergeCombatTagSelection(existing,['공격력'],[]),existing.slice(0,3));
  assert.deepEqual(mergeCombatTagSelection(existing,['공격력'],existing),existing);
});

test('all nine debuffs retain exact rates and severed-part effects without invented durations', () => {
  assert.deepEqual(DEBUFFS.map(d => d.name),['출혈','파열','중독','화상','감전','어지러움','기절','골절','절삭']);
  for(const [type,rate] of [['출혈',1.5],['파열',3],['중독',2],['화상',2.5],['감전',1]]) assert.ok(debuffDescription({type}).includes(`1초마다 ${rate} 대미지`));
  assert.match(debuffDescription({type:'감전'}),/10%/);
  assert.match(debuffDescription({type:'골절'}),/50%/);
  assert.match(debuffDescription({type:'절삭',part:'다리'}),/기어감.*90%/);
  assert.match(debuffDescription({type:'절삭',part:'팔'}),/두손 무기 및 잘린 부위의 무기 사용 불가/);
  assert.match(debuffDescription({type:'기절'}),/래그돌/);
  assert.deepEqual(normalizeDebuffs([null,{},'출혈',{type:'없음'},{type:'출혈',part:'팔'},{type:'출혈'},{type:'절삭',part:'다리'}]),[{type:'출혈'},{type:'절삭',part:'다리'}]);
  assert.deepEqual(normalizeDebuffs([{type:'절삭',part:'알 수 없음'}]),[{type:'절삭'}]);
});

test('named skills and multi-debuffs round-trip while old backups and stat calculations stay compatible', () => {
  const skill={stat:'str',multiplier:2,name:'붉은 달',debuffs:DEBUFFS.map(d=>({type:d.name,...(d.name==='절삭'?{part:'팔'}:{})}))};
  const fixture={...structuredClone(DEFAULT_CHARACTER),combatSkills:[skill],combatTags:['공격력','파괴력','집중','집중력','민첩']};
  assert.deepEqual(normalizeCharacter(JSON.parse(JSON.stringify(fixture))),fixture);
  assert.equal(skillValue(fixture.stats,skill),20);
  assert.equal(skillName(skill),'붉은 달'); assert.equal(skillName({...skill,name:' '}),'근력 스킬');
  const old=normalizeCharacter({...DEFAULT_CHARACTER,combatSkills:[{stat:'str',multiplier:2}]});
  assert.deepEqual(old.combatSkills,[{stat:'str',multiplier:2}]);
  const bad=normalizeCharacter({...fixture,combatSkills:[{...skill,name:'가'.repeat(100)+'\n',debuffs:[{type:'가짜'}]}]});
  assert.equal(bad.combatSkills[0].name.length,60); assert.deepEqual(bad.combatSkills[0].debuffs,[]);
  const md=characterMarkdown(fixture);
  for(const value of ['붉은 달','공격력','집중력','1초마다 1.5 대미지','팔: 두손 무기','지속 시간·중첩 규칙 미정']) assert.ok(md.includes(value),value);
});

test('shared PNG/JPG sheet retains every named skill and debuff in overflow records', async () => {
  const built=await build({entryPoints:['lib/character-sheet.ts'],bundle:true,platform:'node',format:'esm',write:false});
  const {planCharacterSheet}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  const fixture={...structuredClone(DEFAULT_CHARACTER),combatSkills:['str','con','energy','dex','cha','wis'].map((stat,i)=>({stat,multiplier:3,name:`스킬이름${i}`,debuffs:DEBUFFS.map(d=>({type:d.name}))}))};
  const ctx={font:'',measureText(value){return {width:[...value].length*25};}};
  const plan=planCharacterSheet(ctx,fixture), record=plan.notes.find(n=>n.title==='전투 스킬');
  assert.ok(record); const content=record.lines.join(' ');
  for(const skill of fixture.combatSkills) assert.ok(content.includes(skill.name));
  for(const d of DEBUFFS) assert.ok(content.includes(d.name));
  for(const note of plan.notes) assert.ok(note.y+note.height<plan.height);
});
