(function(global){
'use strict';
const cfg=global.FIRST1000_APPLICATION_CONFIG||{};
const limits={name:120,email:254,buildIdea:5000,phone:50,socials:1000};
function validate(input){
 const data={};for(const key of Object.keys(limits)){data[key]=String(input[key]||'').trim();if(data[key].length>limits[key])throw new Error('Please shorten '+key+'.');}
 if(!data.name||!data.email||!data.buildIdea)throw new Error('Please complete your name, email and build idea.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw new Error('Please enter a valid email address.');
 if(!['Personal','Business'].includes(input.category))throw new Error('Choose Personal or Business.');
 data.category=input.category;data.submissionId=String(input.submissionId||'');data.website=String(input.website||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.submissionId))throw new Error('Please reopen the application and try again.');
 if(data.website)throw new Error('The application could not be sent.');return data;
}
async function submit(input){
 const data=validate(input),controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),cfg.timeoutMs||20000);
 try{
  const response=await fetch(cfg.endpoint,{method:'POST',body:new URLSearchParams(data),mode:'cors',credentials:'omit',signal:controller.signal});
  if(!response.ok)throw new Error('We could not confirm receipt. Your answers are kept. Please retry.');
  const result=await response.json();
  if(result.ok!==true||result.submissionId!==data.submissionId){
   const errors={INVALID_INPUT:'Please check your answers and try again.',ID_CONFLICT:'This application reference already has different answers. Please contact us by text before submitting again.',RATE_LIMITED:'Please wait a moment before trying again.',BUSY:'Applications are busy right now. Please retry shortly.',CAPACITY_REACHED:'Applications cannot be received right now. Please contact us by text.',SUBMISSION_FAILED:'We could not confirm receipt. Please retry.'};
   throw new Error(errors[result.code]||'We could not confirm receipt. Your answers are kept. Please retry.');
  }
  return result;
 }catch(error){if(error.name==='AbortError')throw new Error('Receipt was not confirmed before the connection timed out. Your answers and reference are kept. Please retry.');if(error instanceof TypeError)throw new Error('We could not confirm receipt because of a connection error. Your answers and reference are kept. Please retry.');throw error;}
 finally{clearTimeout(timer);}
}
const api={validate,submit};global.First1000Application=api;
if(typeof document==='undefined')return;
const dialog=document.createElement('dialog');dialog.id='first1000-application';dialog.className='application-dialog';dialog.setAttribute('aria-labelledby','application-heading');dialog.setAttribute('data-embed-interactive','');
dialog.innerHTML=`<div class="application-shell"><header class="application-header"><p class="application-eyebrow">Keiki × Maritime <span>The First 1,000</span></p><button type="button" class="application-close" aria-label="Close application"><span aria-hidden="true">×</span></button></header><h2 id="application-heading">Your application.</h2><p class="application-intro">Your details, and what you’d like to build.</p><form id="first1000-application-form"><div class="application-identity"><label>Your name<input name="name" autocomplete="name" required maxlength="120" aria-describedby="application-error-name"><span class="application-field-error" id="application-error-name"></span></label><label>Email address<input name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="application-error-email"><span class="application-field-error" id="application-error-email"></span></label></div><div class="application-project"><label>Personal or business?<select name="category" required aria-describedby="application-error-category"><option value="">Choose one</option><option>Personal</option><option>Business</option></select><span class="application-field-error" id="application-error-category"></span></label><label>What would you like to build?<textarea name="buildIdea" required maxlength="5000" rows="3" placeholder="An idea, a problem, or simply “I don’t know yet.”" aria-describedby="application-error-buildIdea"></textarea><span class="application-field-error" id="application-error-buildIdea"></span></label></div><details class="application-optionals"><summary>Phone &amp; links <span>Optional</span></summary><div><label>Phone<input name="phone" type="tel" autocomplete="tel" maxlength="50"></label><label>Social or project links<textarea name="socials" maxlength="1000" rows="2" placeholder="A profile, website or something you’ve made"></textarea></label></div></details><label class="application-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><div class="application-send"><button class="application-submit" type="button"><span>Send application</span><span aria-hidden="true">↗</span></button><p class="application-privacy">Sent to Keiki × Maritime.<br><a data-application-terms target="_blank" rel="noopener">Program Terms</a> · <a data-application-privacy target="_blank" rel="noopener">Privacy</a></p></div></form><p class="application-status" role="status" aria-live="polite"></p><p class="application-reference" hidden></p><a class="application-sms" href="sms:+16287264285">Prefer to text? <span>+1 (628) 726-4285 ↗</span></a></div>`;
document.body.appendChild(dialog);dialog.querySelector('[data-application-terms]').href=cfg.terms||'/terms';dialog.querySelector('[data-application-privacy]').href=cfg.privacy||'https://onkeiki.com/privacy';
const form=dialog.querySelector('form'),status=dialog.querySelector('.application-status'),button=dialog.querySelector('.application-submit'),reference=dialog.querySelector('.application-reference');
let pending=false,confirmed=false,id=null,opener=null,release=null;
function open(event){
 if(!cfg.endpoint)return false;opener=event?.target?.closest?.('a,button')||document.activeElement;
 if(!dialog.open){release=global.AscentPremiumEmbed?.acquireInputLock?.()||null;dialog.showModal();}
 if(!id)id=crypto.randomUUID();return true;
}
api.open=open;api.close=()=>dialog.close();
dialog.querySelector('.application-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('keydown',e=>e.stopPropagation());
dialog.addEventListener('close',()=>{release?.();release=null;opener?.focus?.({preventScroll:true});});
form.addEventListener('invalid',event=>{const field=event.target,error=dialog.querySelector('#application-error-'+field.name);field.setAttribute('aria-invalid','true');if(error)error.textContent=field.validity.valueMissing?'Please complete this field.':field.validationMessage;},true);
form.addEventListener('input',event=>{const field=event.target;if(field.checkValidity?.()){field.removeAttribute('aria-invalid');const error=dialog.querySelector('#application-error-'+field.name);if(error)error.textContent='';}});
const handleSubmit=async event=>{
 event.preventDefault();if(pending||confirmed)return;if(!form.reportValidity())return;
 if(!id)id=crypto.randomUUID();const data=Object.fromEntries(new FormData(form));data.submissionId=id;
 pending=true;button.disabled=true;button.textContent='Sending…';status.textContent='Sending your application…';status.dataset.state='pending';
 try{await submit(data);confirmed=true;dialog.querySelector('#application-heading').textContent='Thank you.';dialog.querySelector('.application-intro').textContent='Your application has reached Keiki × Maritime.';status.textContent='Application received.';status.dataset.state='success';reference.textContent='Reference: '+id;reference.hidden=false;form.hidden=true;}
 catch(error){status.textContent=error.message||'We could not confirm receipt. Your answers are kept. Please retry.';status.dataset.state='error';}
 finally{pending=false;button.disabled=confirmed;button.textContent='Send application ↗';}
};
form.addEventListener('submit',handleSubmit);
button.addEventListener('click',handleSubmit);
form.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.tagName==='INPUT'&&!event.isComposing){event.preventDefault();handleSubmit(event);}});
// The premium runtime owns the CTA interception; other classic players may call open directly.
if(global.AscentPremiumEmbed?.registerApplicationHandler)global.AscentPremiumEmbed.registerApplicationHandler((detail,event)=>open(event));
else global.addEventListener('ascent:embed-ready',event=>event.detail?.api?.registerApplicationHandler?.((detail,click)=>open(click)),{once:true});
document.addEventListener('click',event=>{const trigger=event.target.closest?.('[data-application-open]');if(trigger&&open(event))event.preventDefault();});
})(globalThis);
