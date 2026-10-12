import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { TRAINERS, PROFILE_TRAITS, trainersForClass, normalizeTrainer, changeBaseClass, normalizeProfileTraits } from '../lib/trainers.ts';
import { BASE_CLASSES, DEFAULT_CHARACTER, normalizeCharacter, characterMarkdown } from '../lib/character.ts';
import { CLASS_SKILLS, weaponRecordSections } from '../lib/weapon-rules.ts';

test('all six source trainers retain their class, names, specialties and role percentages', () => {
  assert.deepEqual(TRAINERS.map(t=>[t.id,t.baseClass,t.name,t.specialty,...t.distribution]),[
    ['kyle','블레이드','Kyle · 카일','공격형',80,10,10],
    ['claire','블레이드','Claire · 클레어','단일 공격형',90,10,0],
    ['cassius','블레이드','Cassius · 카시우스','방어형',50,40,10],
    ['camilla','블레이드','Camilla · 카밀라','서포트형',55,15,30],
    ['dexter','가디언','Dexter · 덱스터','가디언 전직관',15,60,25],
    ['jasper','레인저','Jasper · 제스퍼','레인저 전직관',60,15,25],
  ]);
  assert.equal(trainersForClass('블레이드').length,4);
  for(const t of TRAINERS) assert.equal(t.distribution.reduce((a,b)=>a+b,0),100);
  for(const cls of BASE_CLASSES.filter(c=>!['블레이드','가디언','레인저'].includes(c.name))) assert.deepEqual(trainersForClass(cls.name),[]);
  assert.deepEqual(trainersForClass(''),[]);
});

test('changing classes clears incompatible trainer selections and never auto-selects someone', () => {
  assert.deepEqual(changeBaseClass('블레이드','claire'),{baseClass:'블레이드',trainerId:'claire'});
  for(const cls of BASE_CLASSES) for(const t of TRAINERS) assert.equal(normalizeTrainer(cls.name,t.id),t.baseClass===cls.name?t.id:'');
  assert.deepEqual(changeBaseClass('가디언','claire'),{baseClass:'가디언',trainerId:''});
  assert.equal(normalizeTrainer('블레이드','unknown'),'');
  assert.equal(normalizeTrainer('', 'kyle'),'');
});

test('NPC traits are distinct fixed multi-select values with safe imports', () => {
  assert.deepEqual(PROFILE_TRAITS,['전직관 NPC','기본 스킬 NPC','적NPC','아군NPC','퀘스트 NPC']);
  assert.deepEqual(normalizeProfileTraits(['전직관 NPC','전직관 NPC',null,'임의 특성','퀘스트 NPC']),['전직관 NPC','퀘스트 NPC']);
  assert.deepEqual(normalizeProfileTraits('적NPC'),[]);
  const old={...structuredClone(DEFAULT_CHARACTER),schemaVersion:6};delete old.trainerId;delete old.profileTraits;
  const migrated=normalizeCharacter(old);
  assert.equal(migrated.schemaVersion,7);assert.equal(migrated.trainerId,'');assert.deepEqual(migrated.profileTraits,[]);
  assert.deepEqual(migrated.stats,old.stats);assert.deepEqual(migrated.combatTags,old.combatTags);
});

test('trainer and all NPC roles survive backup and appear in text exports without attributing Kyle skills to others', () => {
  for(const t of TRAINERS){
    const fixture={...structuredClone(DEFAULT_CHARACTER),baseClass:t.baseClass,trainerId:t.id,profileTraits:[...PROFILE_TRAITS]};
    const restored=normalizeCharacter(JSON.parse(JSON.stringify(fixture)));
    assert.deepEqual(restored,fixture);
    const text=characterMarkdown(restored);
    for(const label of [...PROFILE_TRAITS,t.name,`공격형 ${t.distribution[0]}%`,`방어형 ${t.distribution[1]}%`,`서포트형 ${t.distribution[2]}%`]) assert.ok(text.includes(label),label);
    assert.equal(text.includes('Rush Strike'),t.id==='kyle');
    assert.equal(text.includes('Flash Cut'),t.id==='kyle');
  }
  assert.ok(CLASS_SKILLS.every(s=>s.trainerId==='kyle'));
  const unmatched=normalizeCharacter({...DEFAULT_CHARACTER,baseClass:'가디언',trainerId:'kyle'});
  assert.equal(unmatched.trainerId,'');assert.doesNotMatch(weaponRecordSections(unmatched).map(r=>r.text).join(' '),/카일|Rush Strike/);
});

test('PNG/JPG shared renderer includes selected trainer and all profile roles in readable records', async () => {
  const built=await build({entryPoints:['lib/character-sheet.ts'],bundle:true,platform:'node',format:'esm',write:false});
  const {planCharacterSheet}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  const ctx={font:'',measureText(value){return {width:[...value].length*25};}};
  const fixture={...structuredClone(DEFAULT_CHARACTER),baseClass:'블레이드',trainerId:'camilla',profileTraits:[...PROFILE_TRAITS]};
  const plan=planCharacterSheet(ctx,fixture),text=plan.notes.flatMap(n=>n.lines).join(' ');
  for(const label of [...PROFILE_TRAITS,'Camilla','카밀라','55%','15%','30%']) assert.ok(text.includes(label),label);
  assert.doesNotMatch(text,/Kyle|Rush Strike|Flash Cut/);
  for(const note of plan.notes) assert.ok(note.y+note.height<plan.height);
});
