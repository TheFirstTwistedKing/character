import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogueCandidates, generateDialogue, randomizeDialogue, normalizeCharacter, DEFAULT_CHARACTER, DIALOGUE_VARIANT_COUNT } from '../lib/character.ts';

const personalities = ['차분함','다정함','신중함','과묵함','자신감','장난기','냉소','수줍음','호기심','충동적','원칙적','감성적','야심','낙관적','헌신적','냉혹함'];
test('each scene has the original three plus ten distinct additions for every voice, IQ band and register', () => {
  for (const keywords of [...personalities.map(v => [v]), personalities.slice(0,8), personalities.slice(8), [], ['미등록 키워드']]) {
    for (const iq of [90,99,100,119,120,130]) for (const register of ['casual','polite','auto']) {
      const pools = dialogueCandidates(keywords, register, iq);
      assert.equal(pools.length,3);
      pools.forEach((pool, scene) => {
        assert.equal(pool.length,13);
        assert.equal(new Set(pool).size,DIALOGUE_VARIANT_COUNT);
        pool.forEach((line,v) => {
          assert.ok(line.trim().length > 0 && line.length <= 600, `${keywords}: scene ${scene}, variant ${v}, length ${line.length}`);
          assert.doesNotMatch(line,/undefined|null/);
          assert.equal(generateDialogue(keywords,register,[v,v,v],iq)[scene],line);
        });
      });
    }
  }
});

test('every candidate is randomly reachable and the previous line is always excluded', () => {
  const args = [['냉소'],'casual',130];
  const pools = dialogueCandidates(...args);
  for (let i=0;i<13;i++) {
    const chosen = randomizeDialogue(...args,[],undefined,()=>(i+0.5)/13);
    chosen.forEach((line,scene)=>assert.equal(line,pools[scene][i]));
  }
  for (let old=0;old<13;old++) {
    const previous = pools.map(p=>p[old]);
    for (let i=0;i<12;i++) {
      const chosen = randomizeDialogue(...args,previous,undefined,()=>(i+0.5)/12);
      chosen.forEach((line,scene)=>assert.notEqual(line,previous[scene]));
    }
  }
});

test('single-scene regeneration preserves manually edited siblings and saved lines', () => {
  const previous = ['직접 쓴 일상','직접 쓴 갈등','직접 쓴 진심'];
  for (let scene=0;scene<3;scene++) {
    const lines = randomizeDialogue(['수줍음'],'polite',90,previous,scene,()=>0.99);
    lines.forEach((line,i)=>i===scene?assert.notEqual(line,previous[i]):assert.equal(line,previous[i]));
    const normalized = normalizeCharacter({...DEFAULT_CHARACTER,dialogue:lines});
    assert.deepEqual(normalized.dialogue,lines);
  }
});

test('special variants respond jointly to IQ and personality, including register', () => {
  for (const personality of personalities) for (const scene of [0,1,2]) {
    const low = dialogueCandidates([personality],'casual',90)[scene];
    const mid = dialogueCandidates([personality],'casual',110)[scene];
    const high = dialogueCandidates([personality],'casual',130)[scene];
    for (const v of [10,11,12]) {
      assert.notEqual(low[v],mid[v]); assert.notEqual(high[v],mid[v]);
      assert.notEqual(high[v],dialogueCandidates([personality],'polite',130)[scene][v]);
    }
  }
  assert.match(dialogueCandidates(['다정함'],'casual',130)[1][10],/놀란 마음부터/);
  assert.match(dialogueCandidates(['냉소'],'casual',130)[1][10],/주장과 증거/);
  assert.match(dialogueCandidates(['다정함'],'casual',90)[1][10],/안 다쳤는지/);
  assert.deepEqual(generateDialogue(['수줍음'],'auto',[12,12,12],130),generateDialogue(['수줍음'],'polite',[12,12,12],130));
});
