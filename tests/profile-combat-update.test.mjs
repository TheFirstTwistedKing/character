import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as c from '../lib/character.ts';

test('renamed country 추풍 replaces 추풀 and migrates saved affiliations without data loss', () => {
  assert.ok(c.COUNTRIES.includes('추풍'));
  assert.ok(!c.COUNTRIES.includes('추풀'));
  for (const affiliation of c.GENERAL_AFFILIATIONS) {
    const saved={...structuredClone(c.DEFAULT_CHARACTER),country:'추풀',affiliation};
    const restored=c.normalizeCharacter(JSON.parse(JSON.stringify(saved)));
    assert.deepEqual(restored,{...saved,country:'추풍'});
    assert.deepEqual(c.normalizeCharacter(restored),restored);
    assert.match(c.characterMarkdown(restored),/출신 국가: 추풍/);
  }
});

test('races, countries and affiliations are constrained and survive old/new backups', () => {
  assert.deepEqual(c.RACES, ['인간','반암형인','암형체']);
  assert.equal(c.affiliationOptions('').length, 0);
  assert.deepEqual(c.affiliationOptions('은월'), ['기업','사무소','국가 친위대','범죄 조직','방랑자']);
  assert.deepEqual(c.affiliationOptions('리바이어던'), ['Stage Management','R.S.S.',"Leviathan's Register",'Memorial Extraction',"Sovereign's hand",'Unbreakable Shield','Judgement Operation']);
  assert.equal(c.selectCountry('리바이어던','기업').affiliation,'');
  assert.equal(c.selectCountry('백월','기업').affiliation,'기업');
  assert.equal(c.selectCountry('은월','R.S.S.').affiliation,'');
  for (const country of c.COUNTRIES) for (const affiliation of c.affiliationOptions(country)) for (const race of c.RACES) {
    const input={...c.DEFAULT_CHARACTER,country,affiliation,race};
    assert.deepEqual(c.normalizeCharacter(JSON.parse(JSON.stringify(input))),input);
  }
  const old=c.normalizeCharacter({name:'이전',keywords:[],stats:{},primaryWeapon:'폴암',race:'안형체'});
  assert.equal(old.primaryWeapon,'월도'); assert.equal(old.race,'암형체'); assert.deepEqual(old.combatSkills,[]);
  assert.equal(c.normalizeCharacter({...old,country:'리바이어던',affiliation:'기업'}).affiliation,'');
  assert.equal(c.normalizeCharacter({...old,race:'임의 종족',country:'임의 국가'}).race,'');
});

test('shield is secondary-only, duplicate weapons stay blocked including migrated values', () => {
  assert.ok(!c.WEAPONS.includes('폴암')); assert.ok(c.WEAPONS.includes('월도'));
  assert.ok(!c.weaponsForSlot('primaryWeapon').includes('방패'));
  assert.ok(c.weaponsForSlot('secondaryWeapon').includes('방패'));
  assert.throws(()=>c.selectWeapon(c.DEFAULT_CHARACTER,'primaryWeapon','방패'),/보조무기/);
  assert.equal(c.selectWeapon(c.DEFAULT_CHARACTER,'secondaryWeapon','방패').secondaryWeapon,'방패');
  assert.throws(()=>c.normalizeCharacter({...c.DEFAULT_CHARACTER,primaryWeapon:'방패'}),/보조무기/);
  assert.throws(()=>c.normalizeCharacter({...c.DEFAULT_CHARACTER,primaryWeapon:'폴암',secondaryWeapon:'월도'}),/중복/);
});

test('combat skills use exactly the six attributes, sanitize multipliers and have no shared budget', () => {
  const stats=Object.fromEntries(c.STAT_KEYS.map(key=>[key,100]));
  const full=c.normalizeCharacter({...c.DEFAULT_CHARACTER,stats,combatSkills:c.STAT_KEYS.map(stat=>({stat,multiplier:3}))});
  assert.equal(full.combatSkills.length,6);
  assert.deepEqual(full.combatSkills.map(skill=>c.skillValue(full.stats,skill)),[300,300,300,300,300,300]);
  const input=[{stat:'str',multiplier:0},{stat:'str',multiplier:2},{stat:'con',multiplier:99},{stat:'energy',multiplier:1.58},{stat:'dex',multiplier:NaN},{stat:'int',multiplier:2},null,{},'bad'];
  assert.deepEqual(c.normalizeCharacter({...full,combatSkills:input}).combatSkills,[{stat:'str',multiplier:1},{stat:'con',multiplier:3},{stat:'energy',multiplier:1.6},{stat:'dex',multiplier:1}]);
  assert.equal(c.skillValue({...stats,str:40},{stat:'str',multiplier:2.5}),100);
});

test('both adequate mass ranges scale with height, and fat labels use kilograms', () => {
  const short=c.bodyReferenceRanges(150),tall=c.bodyReferenceRanges(200);
  for (const key of ['muscle','fat']) for (const edge of ['min','max']) assert.ok(tall[key][edge]>short[key][edge]);
  const fatPercent=(h,m,mass)=>mass/(m+9*(h/100)**2+mass)*100;
  assert.equal(c.describeBody(150,25,fatPercent(150,25,17)).fat,'많은 지방량');
  assert.equal(c.describeBody(200,25,fatPercent(200,25,17)).fat,'적당한 지방량');
  assert.equal(c.describeBody(150,25,18).muscle,'적당한 근육');
  assert.equal(c.describeBody(200,25,18).muscle,'부실한 근육');
  for (const h of [80,150,178,260]) assert.ok(Number.isFinite(c.estimateBody(h,32,18).weight));
});

test('preferences are record-only and never change generated dialogue or its signature', () => {
  const prefs={likes:'취향전용표식A',dislikes:'취향전용표식B'};
  for (const keywords of [['차분함'],['다정함'],['냉소'],['성실한']]) for (const iq of [90,110,130]) for (const register of ['casual','polite','auto']) {
    const pools=c.dialogueCandidates(keywords,register,iq);
    // Old JavaScript callers passing an extra preferences argument also cannot affect output.
    assert.deepEqual(c.dialogueCandidates(keywords,register,iq,prefs),pools);
    assert.deepEqual(c.generateDialogue(keywords,register,[0,0,0],iq,prefs),c.generateDialogue(keywords,register,[0,0,0],iq));
    assert.equal(c.dialogueSignature(keywords,register,iq,prefs),c.dialogueSignature(keywords,register,iq));
    assert.doesNotMatch(pools.flat().join(' '),/취향전용표식/);
    const previous=['직접 작성 1','직접 작성 2','직접 작성 3'];
    const next=c.randomizeDialogue(keywords,register,iq,previous,1,()=>0,prefs);
    assert.deepEqual(next,c.randomizeDialogue(keywords,register,iq,previous,1,()=>0));
    assert.equal(next[0],previous[0]); assert.equal(next[2],previous[2]);
    assert.notEqual(next[1],c.randomizeDialogue(keywords,register,iq,next,1,()=>0)[1]);
  }
  const saved={...structuredClone(c.DEFAULT_CHARACTER),...prefs,dialogue:['기존 취향 대사','직접 쓴 대사','세 번째 대사']};
  saved.dialogueSignature=JSON.stringify([saved.keywords,saved.register,saved.iq,saved.likes,saved.dislikes]);
  const restored=c.normalizeCharacter(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored.dialogue,saved.dialogue);
  assert.equal(restored.likes,saved.likes); assert.equal(restored.dislikes,saved.dislikes);
  const md=c.characterMarkdown(restored);
  assert.match(md,/취향전용표식A/); assert.match(md,/취향전용표식B/);
  assert.match(md,/기존 취향 대사/);
});

test('Markdown and PNG/JPG shared sheet renderer include new profile, skills and overflow', async () => {
  const built=await build({entryPoints:['lib/character-sheet.ts'],bundle:true,platform:'node',format:'esm',write:false});
  const {planCharacterSheet,paintCharacterSheet}=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  const fixture={...structuredClone(c.DEFAULT_CHARACTER),race:'암형체',country:'리바이어던',affiliation:'Memorial Extraction',primaryWeapon:'월도',secondaryWeapon:'방패',combatStyle:'긴 전투 스타일 '.repeat(100),combatSkills:c.STAT_KEYS.map(stat=>({stat,multiplier:3}))};
  const md=c.characterMarkdown(fixture);
  for(const value of ['암형체','리바이어던','Memorial Extraction','월도','방패','전투 스킬','3배','적당한 지방량']) assert.ok(md.includes(value),value);
  const painted=[];
  const ctx=new Proxy({font:'',measureText(value){const size=Number(this.font.match(/(\d+)px/)?.[1]||24);return {width:[...value].length*size,actualBoundingBoxAscent:size*.8};},fillText(value){painted.push(value);}}, {get(target,key){return key in target?target[key]:(()=>{});}});
  const plan=planCharacterSheet(ctx,fixture);
  assert.ok(plan.height>1800);
  assert.equal(plan.blocks.find(b=>b.key==='affiliation').text,fixture.affiliation);
  assert.equal(plan.blocks.find(b=>b.key==='skills').text.match(/× 3/g).length,6);
  for(const block of plan.blocks){assert.ok(block.lines.length<=block.maxLines);if(block.note)assert.ok(plan.notes.find(n=>n.number===block.note));}
  paintCharacterSheet(ctx,plan,fixture,{logo:{source:{},width:100,height:100}});
  for(const value of ['암형체','리바이어던','월도','방패'])assert.ok(painted.some(s=>s.includes(value)),value);
  assert.ok(painted.some(s=>s.includes('Memorial Extraction')));
});
