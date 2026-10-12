import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONALITY_CATALOG } from '../lib/personality-catalog.ts';
import { TRAIT_ANCHORS, catalogDialogueLines } from '../lib/personality-dialogues.ts';
import { matchVoices, dialogueCandidates, randomizeDialogue, DEFAULT_CHARACTER, normalizeCharacter, characterMarkdown } from '../lib/character.ts';

test('all 99 positive and 106 negative source rows have distinct identities and complete dialogue',()=>{
  assert.equal(PERSONALITY_CATALOG.length,205);
  assert.equal(PERSONALITY_CATALOG.filter(t=>t.group==='positive').length,99);
  assert.equal(PERSONALITY_CATALOG.filter(t=>t.group==='negative').length,106);
  assert.equal(new Set(PERSONALITY_CATALOG.map(t=>t.name)).size,205);
  assert.deepEqual(Object.keys(TRAIT_ANCHORS).sort(),PERSONALITY_CATALOG.map(t=>t.key).sort());
  const globalLines = new Set();
  for(const trait of PERSONALITY_CATALOG){
    assert.ok(trait.name.length<=24);
    const {found,unknown}=matchVoices([trait.name]);
    assert.deepEqual(unknown,[]); assert.equal(found.length,1); assert.equal(found[0].catalogKey,trait.key);
    assert.equal(matchVoices([trait.name.replaceAll(' ','')]).found[0].catalogKey,trait.key);
    const scenes=catalogDialogueLines(trait.key);assert.equal(scenes.length,3);
    for(const scene of scenes){
      assert.equal(scene.length,5);assert.equal(new Set(scene.map(pair=>pair[0])).size,5);
      for(const pair of scene){
        assert.equal(pair.length,2);assert.notEqual(pair[0],pair[1]);
        pair.forEach(line=>{assert.ok(line.length>10&&line.length<=600);assert.doesNotMatch(line,/undefined|야요|다요|자요|니요/);});
        globalLines.add(pair[0]);
      }
    }
  }
  assert.equal(globalLines.size,3075);
});

test('all traits have five reachable nonrepeating variants in every scene, IQ band and register',()=>{
  for(const trait of PERSONALITY_CATALOG)for(const iq of [90,99,100,119,120,130])for(const register of ['casual','polite','auto']){
    const pools=dialogueCandidates([trait.name],register,iq);
    for(const pool of pools){assert.equal(pool.length,5);assert.equal(new Set(pool).size,5);assert.ok(pool.every(line=>line.length<=600));}
    for(let v=0;v<5;v++){
      const lines=randomizeDialogue([trait.name],register,iq,[],undefined,()=>(v+.5)/5);
      lines.forEach((line,s)=>assert.equal(line,pools[s][v]));
      const next=randomizeDialogue([trait.name],register,iq,lines,undefined,()=>0);
      next.forEach((line,s)=>assert.notEqual(line,lines[s]));
    }
  }
});

test('similar traits and duplicated English labels never collapse into another source row',()=>{
  const pairs=[['분석적인','지적인'],['통찰력 있는','끈기 있는'],['개인적인','주도적인'],['신중한','조심성이 많은'],['잘 믿는','잘 속는'],['내성적인','병적으로 내성적인']];
  for(const [a,b]of pairs){assert.notDeepEqual(dialogueCandidates([a],'auto'),dialogueCandidates([b],'auto'));}
  assert.equal(matchVoices(['Persistent']).found.length,0);
  assert.equal(matchVoices(['Proactive']).found.length,0);
  assert.equal(matchVoices(['분석적인','Analytical']).found.length,1);
  assert.equal(matchVoices(['아직 없는 자유 성격']).unknown.length,1);
});

test('mixed legacy/catalogue traits and saved dialogue retain compatibility',()=>{
  const keywords=['다정한','차분함','분석적인','냉소','고집불통인','신중함','움츠러드는','재치 있는'];
  const pools=dialogueCandidates(keywords,'polite',130);
  assert.ok(pools.every(p=>p.length>=5 && p.every(line=>line.length<=600)));
  const previous=['직접 쓴 일상','직접 쓴 갈등','직접 쓴 진심'];
  const next=randomizeDialogue(keywords,'polite',130,previous,1,()=>.9);
  assert.equal(next[0],previous[0]);assert.equal(next[2],previous[2]);assert.notEqual(next[1],previous[1]);
  const saved=normalizeCharacter({...DEFAULT_CHARACTER,keywords,dialogue:previous});
  assert.deepEqual(saved.keywords,keywords);assert.deepEqual(saved.dialogue,previous);
  assert.match(characterMarkdown(saved),/움츠러드는/);
  for(const name of ['차분함','다정함','과묵함','장난기','원칙적'])assert.equal(dialogueCandidates([name],'auto')[0].length,13);
});

test('IQ changes expression without replacing the chosen trait-specific anchor',()=>{
  for(const trait of PERSONALITY_CATALOG){
    const low=dialogueCandidates([trait.name],'casual',90),mid=dialogueCandidates([trait.name],'casual',110),high=dialogueCandidates([trait.name],'casual',130);
    for(let s=0;s<3;s++)for(let v=0;v<5;v++){
      assert.ok(low[s][v].startsWith(mid[s][v]));assert.ok(high[s][v].startsWith(mid[s][v]));
      assert.notEqual(low[s][v],high[s][v]);
    }
  }
});
