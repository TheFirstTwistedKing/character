import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { DEFAULT_CHARACTER } from '../lib/character.ts';

// Isolate the hook's network/state transitions without browser or real sign-in.
let cells, cursor, effects, firstRender, requests, toasts, response;
globalThis.__authTestHooks = {
  useState(initial) { const i=cursor++; if (!(i in cells)) cells[i]=initial; return [cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value;}]; },
  useRef(initial) { const i=cursor++; if (!(i in cells)) cells[i]={current:initial}; return cells[i]; },
  useEffect(effect) { if (firstRender) effects.push(effect); },
  toast: {error:message=>toasts.push(message),success:()=>{}},
};
const bundled = await build({entryPoints:['lib/use-character-slots.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{
  name:'hook-harness', setup(b) {
    b.onResolve({filter:/^(react|sonner)$/},args=>({path:args.path,namespace:'harness'}));
    b.onLoad({filter:/.*/,namespace:'harness'},args=>({contents:args.path==='react'?'export const {useState,useRef,useEffect}=globalThis.__authTestHooks;':'export const {toast}=globalThis.__authTestHooks;'}));
  }
}]});
const {useCharacterSlots}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const character=structuredClone(DEFAULT_CHARACTER);
function reset() { cells=[];cursor=0;effects=[];firstRender=true;requests=0;toasts=[];response=()=>Response.json({slots:[]}); }
function render(signedIn) { cursor=0;const result=useCharacterSlots(character,()=>{},signedIn);firstRender=false;return result; }
async function settle() { await new Promise(resolve=>setImmediate(resolve)); }

test('anonymous editor is usable without failed slot requests or repeated toasts', async t=>{
  reset();t.mock.method(globalThis,'fetch',async()=>{requests++;return response();});
  let storage=render(false);effects.forEach(effect=>effect());await settle();storage=render(false);
  assert.equal(storage.authRequired,true);assert.equal(storage.busy,false);assert.equal(storage.error,'');
  await storage.save();await storage.reloadList();
  assert.equal(requests,0);assert.deepEqual(toasts,[]);
});

test('401 on initial load switches to login state instead of reopening-page errors',async t=>{
  reset();response=()=>new Response('not signed in',{status:401});
  t.mock.method(globalThis,'fetch',async()=>{requests++;return response();});
  render(true);effects.forEach(effect=>effect());await settle();const storage=render(true);
  assert.equal(storage.authRequired,true);assert.equal(storage.busy,false);assert.equal(storage.error,'');
  await storage.reloadList();await storage.save();
  assert.equal(requests,1);assert.deepEqual(toasts,[]);
});

test('expired login during save preserves draft and stops further protected requests',async t=>{
  reset();t.mock.method(globalThis,'fetch',async()=>{requests++;return response();});
  render(true);effects.forEach(effect=>effect());await settle();let storage=render(true);
  assert.equal(storage.authRequired,false);
  response=()=>Response.json({error:'expired'},{status:401});await storage.save();storage=render(true);
  assert.equal(storage.authRequired,true);assert.equal(storage.saved,false);assert.equal(storage.busy,false);
  await storage.save();assert.equal(requests,2);assert.deepEqual(toasts,[]);
  assert.deepEqual(character,DEFAULT_CHARACTER);
});

test('non-auth network errors remain actionable connection errors',async t=>{
  reset();response=()=>Response.json({error:'temporary outage'},{status:503});
  t.mock.method(globalThis,'fetch',async()=>{requests++;return response();});
  render(true);effects.forEach(effect=>effect());await settle();const storage=render(true);
  assert.equal(storage.authRequired,false);assert.equal(storage.error,'temporary outage');
  assert.deepEqual(toasts,['temporary outage']);
});

test('login uses a server-owned top-level anchor; no auth fetch, router redirect or reserved routes',()=>{
  const page=readFileSync('app/page.tsx','utf8');
  assert.match(page,/dynamic = "force-dynamic"/);
  assert.match(page,/await getChatGPTUser\(\)/);
  assert.match(page,/<a[^>]+href=\{chatGPTSignInPath\("\/"\)\}[^>]+target="_top"/);
  assert.doesNotMatch(page,/fetch\(|router\.|<Link/);
  const studio=readFileSync('app/character-studio.tsx','utf8');
  assert.doesNotMatch(studio,/from ["'][^"']*chatgpt-auth/);
  assert.match(studio,/로그인 화면으로 이동하면 저장하지 않은 편집 내용이 사라질 수/);
  const backup=studio.slice(studio.indexOf('function backupBeforeSignIn'),studio.indexOf('async function addPhoto'));
  assert.doesNotMatch(backup,/fetch\(|portraitBlob\(/);
  assert.match(backup,/JSON.stringify\(\{ \.\.\.character/);
});
