/* Player Applications append-only service.
 * Deploy only after approval. No credentials are sent to browser clients.
 * Google Sheets scope is broader than the hardcoded single-file behavior below.
 */
const PLAYER_SHEET_ID = '10eAEVJrPAW3ZJgToFBFksUktO0aIaz8Pbygh0t2SWxQ';
const PLAYER_TAB = 'Applications';
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return json_({ok:false,code:'METHOD_NOT_ALLOWED'}); }
function text_(value, max, required) {
  if (typeof value !== 'string') throw new Error('INVALID_INPUT');
  const result = value.trim();
  if ((required && !result) || result.length > max || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(result)) throw new Error('INVALID_INPUT');
  return result;
}
function hex_(bytes) { return bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join(''); }
function safeCell_(value) { return /^[\s]*[=+\-@]/.test(value) || value.startsWith("'") ? "'"+value : value; }
function doPost(e) {
  let lock;
  try {
    const body = e && e.postData && e.postData.contents;
    if (!body || body.length > 24000) return json_({ok:false,code:'INVALID_INPUT'});
    const p = (e.postData.type || '').indexOf('application/json') === 0 ? JSON.parse(body) : e.parameter;
    if (!p || (typeof p.website !== 'undefined' && p.website !== '')) return json_({ok:false,code:'INVALID_INPUT'});
    const id=text_(p.submissionId,64,true);
    if (!/^[a-zA-Z0-9_-]{16,64}$/.test(id)) return json_({ok:false,code:'INVALID_INPUT'});
    const name=text_(p.name,120,true),email=text_(p.email,254,true).toLowerCase();
    const category=text_(p.category,16,true),idea=text_(p.buildIdea,5000,true);
    const phone=text_(p.phone||'',50,false),socials=text_(p.socials||'',1000,false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['Personal','Business'].includes(category)) return json_({ok:false,code:'INVALID_INPUT'});
    lock=LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json_({ok:false,code:'BUSY'});
    const sheet=SpreadsheetApp.openById(PLAYER_SHEET_ID).getSheetByName(PLAYER_TAB);
    if (!sheet) return json_({ok:false,code:'NOT_CONFIGURED'});
    const last=sheet.getLastRow();
    if(last>=10001) return json_({ok:false,code:'CAPACITY_REACHED'});
    if(last>1){
      const existing=sheet.getRange(2,8,last-1,1).createTextFinder(id).matchEntireCell(true).findNext();
      if(existing) {
        const saved=sheet.getRange(existing.getRow(),2,1,6).getValues()[0];
        const current=[name,email,category,idea,phone,socials];
        if(saved.some(function(value,index){return String(value)!==current[index] && String(value)!==safeCell_(current[index]);})) return json_({ok:false,code:'ID_CONFLICT'});
        return json_({ok:true,submissionId:id,duplicate:true});
      }
    }
    const cache=CacheService.getScriptCache();
    const emailKey='email:'+hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,email));
    const emailCount=Number(cache.get(emailKey)||0),globalCount=Number(cache.get('all-submissions')||0);
    if(emailCount>=3 || globalCount>=100) return json_({ok:false,code:'RATE_LIMITED'});
    const row=last+1;
    // Prefix dangerous spreadsheet formulas; never evaluate applicant-entered text.
    sheet.getRange(row,2,1,7).setNumberFormat('@');
    sheet.getRange(row,1,1,8).setValues([[new Date(),name,email,category,idea,phone,socials,id].map(function(value){return typeof value==='string'?safeCell_(value):value;})]);
    sheet.getRange(row,1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    SpreadsheetApp.flush();
    cache.put(emailKey,String(emailCount+1),3600);
    cache.put('all-submissions',String(globalCount+1),3600);
    return json_({ok:true,submissionId:id});
  } catch(error) {
    // Never echo submitted data, spreadsheet contents, token values or stack traces.
    return json_({ok:false,code:error && error.message==='INVALID_INPUT'?'INVALID_INPUT':'SUBMISSION_FAILED'});
  } finally { if(lock && lock.hasLock()) lock.releaseLock(); }
}
