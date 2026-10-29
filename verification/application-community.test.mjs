import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/shared/application.js',import.meta.url),'utf8');
const data={name:'Test',email:'test@example.com',category:'Personal',buildIdea:'Test idea',socials:'https://example.com/work',submissionId:'00000000-0000-4000-8000-000000000000'};
function api(fetch){const context=vm.createContext({URL,URLSearchParams,AbortController,setTimeout,clearTimeout,fetch,FIRST1000_APPLICATION_CONFIG:{endpoint:'https://example.invalid'}});vm.runInContext(source,context);return context.First1000Application;}
test('socials accepts free text while remaining required',()=>{const app=api();for(const socials of ['', '   '])assert.throws(()=>app.validate({...data,socials}));for(const socials of ['@builder','builder123','find me on LinkedIn','https://example.com/work'])assert.equal(app.validate({...data,socials}).socials,socials);});
test('submission uses keepalive and confirms matching reference',async()=>{let request;const app=api(async(url,options)=>{request=options;return {ok:true,json:async()=>({ok:true,submissionId:data.submissionId})}});await app.submit(data);assert.equal(request.keepalive,true);assert.equal(request.body.get('socials'),data.socials);});
test('community appears before receipt, with retry and exact invite URLs',()=>{assert(source.indexOf('community.hidden=false')<source.indexOf('await submit(lastData)'));assert(source.includes('https://discord.gg/aZSqJXbYd?utm_source=chatgpt.com'));assert(source.includes('https://join.slack.com/t/keikixmaritime/shared_invite/zt-4d99nlxr7-2Vdkb5V01nD2N6txBCMm_g?utm_source=chatgpt.com'));assert(source.includes("retry.addEventListener('click',sendApplication)"));});
