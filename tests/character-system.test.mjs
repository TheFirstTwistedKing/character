import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import * as c from '../lib/character.ts';
const built = await build({ entryPoints: ['lib/character-store.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { characterRequest } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);

test('six independent 0–100 scores, fixed countries and IQ bounds survive import', () => {
  assert.deepEqual(c.STAT_KEYS.map(k => c.STAT_INFO[k].name), ['근력','맷집','기력','순발력','매력','통찰']);
  let stats = { ...c.DEFAULT_CHARACTER.stats };
  for (const key of c.STAT_KEYS) stats = c.updateStat(stats,key,100);
  assert.deepEqual(Object.values(stats), [100,100,100,100,100,100]);
  assert.equal(c.updateStat(stats,'str',-12).str,0);
  assert.equal(c.updateStat(stats,'str',200).str,100);
  assert.equal(c.COUNTRIES.length,12);
  const old = c.normalizeCharacter({ name:'이전 캐릭터', keywords:['과묵함'], stats:{str:16,dex:20,con:18,int:12,wis:14,cha:8}, limitPoints:true, skills:[] });
  assert.equal(old.stats.str,16); assert.equal(old.stats.energy,10); assert.equal(old.iq,110);
  assert.equal(old.gender,''); assert.equal(old.baseClass,''); assert.equal(old.knightClass,''); assert.equal(old.transcendentClass,'');
  assert.ok(!('int' in old.stats)); assert.ok(!('limitPoints' in old)); assert.ok(!('skills' in old));
  for (const country of c.COUNTRIES) assert.equal(c.normalizeCharacter({...old,country}).country,country);
  assert.equal(c.normalizeCharacter({...old,country:'사용자 추가 국가'}).country,'');
  assert.equal(c.normalizeCharacter({...old,iq:80}).iq,90);
  assert.equal(c.normalizeCharacter({...old,iq:140}).iq,130);
  const md = c.characterMarkdown({...old,age:500,country:'백월',iq:130,stats});
  assert.match(md,/500세/); assert.match(md,/백월/); assert.match(md,/IQ: 130/);
  assert.doesNotMatch(md,/d20|숙련도|보정|72점|신체 프로필/);
});

test('IQ changes all three scenes, preserves personality and allows different variants', () => {
  for (const register of ['casual','polite','auto']) {
    const low = c.generateDialogue(['차분함','다정함','신중함'], register,[0,0,0],90);
    const mid = c.generateDialogue(['차분함','다정함','신중함'], register,[0,0,0],110);
    const high = c.generateDialogue(['차분함','다정함','신중함'], register,[0,0,0],130);
    assert.equal(new Set(low).size,3); assert.equal(new Set(high).size,3);
    for(let i=0;i<3;i++){assert.notEqual(low[i],mid[i]);assert.notEqual(mid[i],high[i]);}
    assert.notDeepEqual(high,c.generateDialogue(['냉소'],register,[0,0,0],130));
    assert.notDeepEqual(high,c.generateDialogue(['차분함','다정함','신중함'],register,[1,1,1],130));
  }
  assert.notEqual(c.dialogueSignature(['차분함'],'auto',90),c.dialogueSignature(['차분함'],'auto',130));
});

test('D1 migration and slot CRUD preserve records, isolate owners and reject stale updates/deletes', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync('drizzle/0000_sudden_morlocks.sql','utf8'));
  const db = {
    prepare(sql) {
      const statement = sqlite.prepare(sql); let values = [];
      return {
        bind(...v) { values = v; return this; },
        async first() { return statement.get(...values) ?? null; },
        async all() { return { results: statement.all(...values) }; },
        async run() { return { meta: { changes: Number(statement.run(...values).changes) } }; },
      };
    },
  };
  const id1=crypto.randomUUID(),id2=crypto.randomUUID();
  const character = {...structuredClone(c.DEFAULT_CHARACTER), name:'테스트 아린',age:222,country:'리바이어던',affiliation:'R.S.S.',race:'암형체',combatSkills:[{stat:'str',multiplier:2.5},{stat:'wis',multiplier:3}],iq:129,gender:'여',baseClass:'테이머', primaryWeapon:'채찍',secondaryWeapon:'방패',likes:'달빛',dislikes:'거짓말',combatTags:['민첩','은신'],stageRank:'준1장',portrait:{url:`/api/portraits/${crypto.randomUUID()}`,name:'아린.png',fit:'contain'}};
  character.weaponSetup = { primary:{trait:'단단한',remaining:12000},secondary:{trait:'일반',remaining:18000},targetToughness:301,movement:'rush',skillMultiplier:1.05 };
  character.combatSkills[0].name = '붉은 달';
  character.combatSkills[0].debuffs = [{type:'출혈'},{type:'절삭',part:'팔'}];
  character.profileTraits = ['전직관 NPC','퀘스트 NPC'];
  async function request(method,id,body,owner='owner@example.test',revision=1,headers={}) { const req=new Request(`https://studio.example/api/characters${id?`/${id}`:''}?revision=${revision}`,{method,headers:{'Content-Type':'application/json','X-Persona-Write':'1',...headers},...(body?{body:JSON.stringify(body)}:{})});return characterRequest(req,owner,db,id); }
  const markdown = c.characterMarkdown(character);
  assert.match(markdown, /성별: 여/); assert.match(markdown, /테이머/); assert.match(markdown, /채찍이 무기인 조련 전문 직업/);
  assert.equal((await request('POST',null,{id:id1,character})).status,201);
  assert.equal((await request('POST',null,{id:id1,character:{...character,name:'중복 생성'}})).status,201);
  assert.equal((await request('POST',null,{id:id2,character:{...character,name:'두 번째',baseClass:'블레이드',trainerId:'claire'}})).status,201);
  assert.equal((await (await request('GET',id2)).json()).character.trainerId,'claire');
  assert.equal((await (await request('GET')).json()).slots.length,2);
  assert.deepEqual((await (await request('GET',id1)).json()).character,character);
  assert.equal((await request('GET',id1,null,'other@example.test')).status,404);
  assert.equal((await (await request('GET',null,null,'other@example.test')).json()).slots.length,0);
  assert.equal((await request('PUT',id1,{character:{...character,iq:100},revision:1})).status,200);
  assert.equal((await request('PUT',id1,{character,revision:1})).status,409);
  assert.equal((await request('DELETE',id1,null,'owner@example.test',1)).status,409);
  assert.equal((await request('DELETE',id1,null,'other@example.test',2)).status,409);
  assert.equal((await request('GET',id1,null,null)).status,401);
  assert.equal((await request('PUT',id1,{character,revision:2},'owner@example.test',1,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await request('DELETE',id1,null,'owner@example.test',2)).status,200);
  assert.equal((await request('GET',id1)).status,404);
  assert.equal((await request('GET',id2)).status,200);
  assert.equal((await request('POST',null,{id:crypto.randomUUID(),character:{...character,secondaryWeapon:'채찍'}})).status,400);
  sqlite.close();
});
