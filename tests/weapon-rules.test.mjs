import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { DEFAULT_CHARACTER, WEAPONS, normalizeCharacter, characterMarkdown } from '../lib/character.ts';
import { WEAPON_RULES, DEFAULT_WEAPON_SETUP, CLASS_RULES, CLASS_SKILLS, calculateWeaponDamage, damageReduction, normalizeWeaponSetup, remainingDurability, ruleValue, weaponRecordSections, canUseClassSkill } from '../lib/weapon-rules.ts';

const equipment={trait:'일반',remaining:null};
const setup=(overrides={})=>({...structuredClone(DEFAULT_WEAPON_SETUP),...overrides});
const damage=(weapon,overrides={},state=equipment)=>calculateWeaponDamage(weapon,setup(overrides),state);

test('every weapon has the exact source table values, including X and charge timing',()=>{
  // Columns: durability, windup, recovery, normal damage, heavy damage, guard wear, parry wear, penetration.
  const expected={
    '단검':[6400,.3,.2,60,120,200,20,null],
    '쇼트소드':[11500,.35,.3,30,60,50,35,null],
    '롱소드':[14000,.4,.35,40,80,60,45,null],
    '그레이트소드':[16000,.5,.4,50,100,70,55,null],
    '한손 둔기':[13000,.35,.25,25,50,55,30,null],
    '양손 둔기':[14300,.45,.4,35,70,65,40,null],
    '한손 도끼':[13000,.35,.25,25,50,55,30,null],
    '양손 도끼':[14300,.45,.4,35,70,65,40,null],
    '건틀렛':[10500,.3,.25,15,30,30,15,null],
    '창':[11500,.4,.35,35,70,80,50,null],
    '채찍':[16200,.3,.2,20,40,null,80,null],
    '월도':[14200,.5,.45,55,110,80,50,null],
    '새총':[15000,1,.1,50,null,null,null,5],
    '활':[13000,1.5,.25,100,null,null,null,70],
    '석궁':[14000,.1,.4,40,null,null,null,85],
    '권총':[25000,null,.2,30,null,null,null,30],
    '기관총':[35000,null,.1,30,null,null,null,40],
    '저격총':[40000,null,.5,40,null,null,null,70],
    '중화기':[65000,null,.05,50,null,null,null,20],
    '투척무기':[null,null,null,null,null,null,null,50],
    '쉴드건':[89000,null,.1,50,null,60,null,35],
    '방패':[20000,null,null,null,10,50,null,null],
  };
  assert.equal(WEAPONS.length,22);
  assert.deepEqual(Object.keys(expected).sort(),[...WEAPONS].sort());
  assert.deepEqual(Object.keys(WEAPON_RULES).sort(),[...WEAPONS].sort());
  for(const [weapon,values] of Object.entries(expected)) {
    const r=WEAPON_RULES[weapon];
    assert.deepEqual([r.durability,r.windup,r.recovery,r.normal,r.heavy,r.guardWear,r.parryWear,r.guardPierce],values,weapon);
    assert.equal(r.charge,['활','새총'].includes(weapon));
  }
  assert.equal(WEAPON_RULES['쉴드건'].shield,true);
  assert.equal(WEAPON_RULES['쉴드건'].category,'원거리');
  assert.equal(ruleValue(null),'X / 미기재');assert.equal(ruleValue(0),'0');
});

test('piecewise damage reduction is continuous and reaches exactly 96.8%',()=>{
  for(const [n,expected] of [[0,0],[1,.4],[100,40],[101,40.2],[300,80],[301,80.04],[600,92],[601,92.02],[800,96],[801,96.004],[1000,96.8]]) assert.equal(damageReduction(n),expected,`${n}`);
  assert.equal(damageReduction(-5),0);assert.equal(damageReduction(9999),96.8);assert.equal(damageReduction(NaN),0);
  for(let n=0;n<1000;n++)assert.ok(damageReduction(n+1)>=damageReduction(n));
});

test('melee and ranged apply different movement, skill and guard rules',()=>{
  const walking=damage('단검',{targetToughness:100,skillMultiplier:1.05});
  assert.deepEqual(walking,{normal:36,heavy:72,skill:113.4,guardPiercing:null,reduction:40,unavailable:null});
  const running=damage('단검',{targetToughness:100,movement:'run',skillMultiplier:1.05});
  const rushing=damage('단검',{targetToughness:100,movement:'rush',skillMultiplier:1.05});
  assert.equal(running.normal,72);assert.equal(rushing.normal,108);assert.equal(rushing.heavy,216);
  assert.equal(running.skill,113.4);assert.equal(rushing.skill,113.4);
  assert.equal(damage('단검',{targetToughness:100,skillMultiplier:1.02}).skill,110.2);
  const bow=damage('활',{targetToughness:300,movement:'rush',skillMultiplier:3});
  assert.equal(bow.normal,20);assert.equal(bow.skill,60);assert.equal(bow.guardPiercing,70);assert.equal(bow.heavy,null);
  assert.equal(damage('쉴드건',{targetToughness:1000,movement:'rush'}).guardPiercing,17.5);
  assert.equal(damage('방패',{targetToughness:100,movement:'rush'}).heavy,18);
  assert.equal(damage('방패').normal,null);assert.equal(damage('방패').skill,null);
  assert.equal(damage('투척무기').normal,null);assert.equal(damage('투척무기').guardPiercing,null);
  for(const weapon of WEAPONS)for(const n of [0,100,300,1000])for(const movement of ['walk','run','rush']) {
    const result=damage(weapon,{targetToughness:n,movement});
    for(const key of ['normal','heavy','skill','guardPiercing'])assert.ok(result[key]===null||(Number.isFinite(result[key])&&result[key]>=0));
  }
});

test('broken weapons cannot attack; unspecified traits do not invent numerical modifiers',()=>{
  for(const state of [{trait:'파괴된',remaining:null},{trait:'일반',remaining:0}]){
    const r=damage('단검',{},state); assert.equal(r.normal,null);assert.match(r.unavailable,/사용 불가/);
  }
  for(const trait of ['일반','견습','단단한','가벼운','약한','반듯한'])assert.equal(damage('단검',{}, {trait,remaining:null}).normal,60);
  assert.equal(remainingDurability('단검',equipment),6400);
  assert.equal(remainingDurability('단검',{trait:'일반',remaining:100}),100);
  assert.equal(remainingDurability('투척무기',equipment),null);
});

test('save and import preserve calculator settings, exact skill decimals and old character data',()=>{
  const old={...structuredClone(DEFAULT_CHARACTER),schemaVersion:5,primaryWeapon:'그레이트 소드',secondaryWeapon:'두손 도끼'};delete old.weaponSetup;
  const migrated=normalizeCharacter(old);
  assert.equal(migrated.primaryWeapon,'그레이트소드');assert.equal(migrated.secondaryWeapon,'양손 도끼');
  assert.deepEqual(migrated.weaponSetup,DEFAULT_WEAPON_SETUP);assert.equal(migrated.schemaVersion,7);
  const fixture={...structuredClone(DEFAULT_CHARACTER),primaryWeapon:'단검',secondaryWeapon:'방패',combatSkills:[{stat:'str',multiplier:2.5}],weaponSetup:setup({targetToughness:801,movement:'rush',skillMultiplier:1.05,primary:{trait:'단단한',remaining:6000},secondary:{trait:'일반',remaining:10000}})};
  assert.deepEqual(normalizeCharacter(JSON.parse(JSON.stringify(fixture))),fixture);
  assert.deepEqual(normalizeWeaponSetup({targetToughness:-5,movement:'fly',skillMultiplier:999,primary:{trait:'not-real',remaining:1e9}},'단검',''),setup({skillMultiplier:3,primary:{trait:'일반',remaining:6400}}));
  assert.equal(normalizeWeaponSetup({primary:{trait:'견습'}},'권총','').primary.trait,'일반');
  assert.equal(normalizeWeaponSetup({primary:{trait:'견습'}},'새총','').primary.trait,'견습');
  assert.equal(normalizeWeaponSetup({skillMultiplier:1.02},'단검','').skillMultiplier,1.02);
  assert.equal(normalizeWeaponSetup({primary:{remaining:999}},'투척무기','').primary.remaining,null);
  assert.equal(normalizeCharacter({...fixture,stats:{...fixture.stats,str:1000}}).stats.str,100);
});

test('class mappings and named skills follow the dedicated class tab without banning free weapon use',()=>{
  assert.equal(Object.keys(CLASS_RULES).length,10);
  assert.deepEqual(CLASS_RULES['랜서'].weapons,['창','방패']);
  assert.ok(!CLASS_RULES['인더스트리얼'].weapons.includes('쉴드건'));
  assert.ok(CLASS_RULES['인더스트리얼'].weapons.includes('투척무기'));
  assert.deepEqual(CLASS_SKILLS.map(s=>[s.name,s.multiplier,s.cooldown,s.windup,s.recovery,s.charge,s.parry]),[['Rush Strike',1.05,50,5,.5,true,false],['Flash Cut',1.02,60,.3,.15,false,true]]);
  assert.equal(canUseClassSkill('블레이드','단검'),true);assert.equal(canUseClassSkill('블레이드','채찍'),false);assert.equal(canUseClassSkill('가디언','단검'),false);
  assert.equal(normalizeCharacter({...DEFAULT_CHARACTER,baseClass:'블레이드',primaryWeapon:'권총'}).primaryWeapon,'권총');
});

test('Markdown and both image formats carry equipment and calculation details into extended records',async()=>{
  const fixture={...structuredClone(DEFAULT_CHARACTER),primaryWeapon:'단검',secondaryWeapon:'쉴드건',baseClass:'블레이드',trainerId:'kyle',weaponSetup:setup({targetToughness:100,movement:'rush',skillMultiplier:1.05,primary:{trait:'단단한',remaining:6000}})};
  const records=weaponRecordSections(fixture),md=characterMarkdown(fixture);
  for(const phrase of ['6000 / 6400','내구도 손실 · 가드 200 / 패리 20','일반 108 / 강공격 216 / 스킬 113.4','가드 관통 17.5','Flash Cut: 1.02배'])assert.ok(md.includes(phrase),phrase);
  const built=await build({entryPoints:['lib/character-sheet.ts'],bundle:true,platform:'node',format:'esm',write:false});
  const {planCharacterSheet}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  const ctx={font:'',measureText(value){return {width:[...value].length*Number(this.font.match(/(\d+)px/)?.[1]||24)};}};
  const plan=planCharacterSheet(ctx,fixture);
  assert.ok(plan.height>1800);
  for(const record of records)assert.ok(plan.notes.some(n=>n.title===record.title));
  for(const note of plan.notes)assert.ok(note.y+note.height<plan.height-65);
  const client=readFileSync('lib/character-sheet-client.ts','utf8');
  assert.match(client,/paintCharacterSheet/);assert.match(client,/image\/png/);assert.match(client,/image\/jpeg/);
  const ui=readFileSync('components/weapon-workbench.tsx','utf8');
  assert.match(ui,/step=\{\.01\}/);assert.match(ui,/calc|calculateWeaponDamage/);assert.match(ui,/X \/ 미기재/);
  const page=readFileSync('app/character-studio.tsx','utf8');assert.equal((page.match(/version: 7/g)||[]).length,2);
});
