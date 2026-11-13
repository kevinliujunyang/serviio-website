import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('../../assets/js/account.js', import.meta.url), 'utf8');
function setup({hash='', responses=[], lang='en'}={}) {
 const elements=new Map();
 function element(id) { if(!elements.has(id)) elements.set(id,{id, hidden:false,disabled:false,value:'',textContent:'',children:[],listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){},focus(){},replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},querySelectorAll(){return [];}}); return elements.get(id); }
 const calls=[];const redirects=[];let clean=false;
 const location={hash,pathname:lang==='zh'?'/zh/account/':'/account/',search:'',origin:'https://serviio.ai',assign(url){redirects.push(url);}};
 const context={document:{documentElement:{lang},getElementById:element,createElement:()=>element(Symbol())},location,history:{replaceState(){clean=true;location.hash='';}},URL,URLSearchParams,Date,console,fetch:async(url,options)=>{calls.push({url,options});const r=await (responses.shift()??{status:401,body:{error:'unauthorized'}});return {ok:r.status<400,status:r.status,json:async()=>r.body};}};
 vm.runInNewContext(source,context);
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 return {element,calls,redirects,flush,get cleaned(){return clean;},submit:async(id)=>{await element(id).listeners.submit({preventDefault(){}});await flush();},click:async(id)=>{await element(id).listeners.click({preventDefault(){}});await flush();}};
}
test('email link fragment is cleared before any verification and requires an explicit click',async()=>{
 const ui=setup({hash:'#token=private-link',responses:[{status:200,body:{ok:true}},{status:200,body:{account:{email:'owner@example.com'},restaurant:null,connection:null}}]});
 assert.equal(ui.cleaned,true);assert.equal(ui.calls.length,0);
 assert.equal(ui.element('confirm-panel').hidden,false);
 await ui.click('confirm-sign-in');assert.equal(ui.calls[0].url,'/api/account/verify');
 assert.equal(JSON.parse(ui.calls[0].options.body).token,'private-link');
 assert.equal(ui.element('account-email').textContent,'owner@example.com');
});
test('sign-in uses the localized generic API and retains email on a recoverable failure',async()=>{
 const ui=setup({lang:'zh',responses:[{status:401,body:{}},{status:503,body:{error:'unavailable'}}]});await ui.flush();
 ui.element('email').value='owner@example.com';await ui.submit('sign-in-form');
 const call=ui.calls.at(-1);assert.equal(call.url,'/api/account/sign-in');assert.equal(call.options.credentials,'same-origin');
 assert.equal(call.options.headers['Content-Type'],'application/json');assert.equal(JSON.parse(call.options.body).locale,'zh');
 assert.equal(ui.element('email').value,'owner@example.com');assert.equal(ui.element('sign-in-button').disabled,false);
 assert.match(ui.element('notice').textContent,/暂时|尚未/);
});
test('profile save failure preserves typed values and does not report success',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:null,connection:null}},{status:500,body:{error:'internal_error'}}]});await ui.flush();
 ui.element('restaurant-name').value='My restaurant';ui.element('contact-name').value='Owner';ui.element('phone').value='123';
 await ui.submit('profile-form');assert.equal(ui.element('restaurant-name').value,'My restaurant');assert.match(ui.element('notice').textContent,/try again/i);assert.equal(ui.element('save-profile').disabled,false);assert.notEqual(ui.element('save-profile').textContent,'Saved');
});
test('server content is treated as text and inactive locations cannot be selected',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'<img onerror=alert(1)>'},restaurant:{name:'<script>',contact_name:'Owner',phone:'123'},connection:{status:'connected',location_id:null}}},{status:200,body:{locations:[{id:'active',name:'<b>Branch</b>',status:'ACTIVE',address:'Main St'},{id:'closed',name:'Closed',status:'INACTIVE'}]}}]});await ui.flush();await ui.flush();
 assert.equal(ui.element('account-email').textContent,'<img onerror=alert(1)>');
 const options=ui.element('location').children;assert.equal(options.length,2);assert.equal(options[1].value,'active');assert.match(options[1].textContent,/<b>Branch<\/b>/);
});
test('Square redirect rejects an unrelated or non-HTTPS destination',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:{name:'A',contact_name:'B',phone:'123'},connection:null}},{status:200,body:{url:'https://evil.example/oauth2/authorize'}}]});await ui.flush();await ui.click('connect-square');assert.deepEqual(ui.redirects,[]);assert.match(ui.element('square-notice').textContent,/try again/i);
});
for(const page of ['account/index.html','zh/account/index.html']) test(`${page} is private, accessible, and contains explicit scope and activation copy`,async()=>{
 const html=await readFile(new URL(`../../${page}`,import.meta.url),'utf8');assert.match(html,/name="robots" content="noindex, nofollow"/);assert.match(html,/name="referrer" content="no-referrer"/);assert.match(html,/role="status"/);assert.match(html,/for="email"/);assert.match(html,/noscript/);assert.match(html,/MERCHANT_PROFILE_READ/);assert.match(html,/account\.js/);
});
test('successful email request never reveals whether an account exists',async()=>{
 const ui=setup({responses:[{status:401,body:{error:'authentication_required'}},{status:200,body:{ok:true}}]});await ui.flush();
 assert.equal(ui.element('notice').textContent,'');ui.element('email').value='new@example.com';await ui.submit('sign-in-form');
 assert.match(ui.element('notice').textContent,/Check your email/);assert.doesNotMatch(ui.element('notice').textContent,/created|existing account/i);
});
test('an expired link offers a new sign-in without claiming authentication',async()=>{
 const ui=setup({hash:'#token=expired',responses:[{status:400,body:{error:'invalid_link'}}]});await ui.click('confirm-sign-in');
 assert.match(ui.element('notice').textContent,/expired/);assert.equal(ui.element('sign-in-panel').hidden,false);assert.equal(ui.element('workspace').hidden,true);
});
test('a transient verification failure leaves confirmation available for retry',async()=>{
 const ui=setup({hash:'#token=retry',responses:[{status:503,body:{error:'configuration_unavailable'}}]});await ui.click('confirm-sign-in');
 assert.equal(ui.element('confirm-panel').hidden,false);assert.equal(ui.element('confirm-sign-in').disabled,false);assert.match(ui.element('notice').textContent,/unavailable/);
});
test('disconnect waits for server confirmation and preserves connected state on failure',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:{name:'A'},connection:{status:'connected'}}},{status:200,body:{locations:[]}},{status:503,body:{error:'square_unavailable'}}]});await ui.flush();await ui.flush();
 await ui.click('disconnect-square');assert.equal(ui.calls.length,2);assert.equal(ui.element('disconnect-confirm').hidden,false);
 await ui.click('confirm-disconnect');assert.equal(ui.element('connection-status').textContent,'Square connected');assert.match(ui.element('notice').textContent,/unavailable/);
});
test('saving a location sends only its ID and reports ordering remains inactive',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:{name:'A'},connection:{status:'connected'}}},{status:200,body:{locations:[{id:'L1',name:'Branch',status:'ACTIVE'}]}},{status:200,body:{ok:true}}]});await ui.flush();await ui.flush();ui.element('location').value='L1';await ui.submit('location-form');
 assert.equal(ui.calls.at(-1).options.body,'{"location_id":"L1"}');assert.match(ui.element('notice').textContent,/Ordering is not activated/);
});
test('logout does not hide the account until the server confirms it',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:null,connection:null}},{status:500,body:{error:'internal_error'}},{status:200,body:{ok:true}}]});await ui.flush();await ui.click('logout');assert.equal(ui.element('workspace').hidden,false);await ui.click('logout');assert.equal(ui.element('workspace').hidden,true);
});

test('a pending submission prevents duplicate requests and re-enables the button afterwards',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;});
 const ui=setup({responses:[{status:401,body:{error:'authentication_required'}},pending]});await ui.flush();ui.element('email').value='preview@example.com';
 const first=ui.submit('sign-in-form');await ui.submit('sign-in-form');assert.equal(ui.calls.length,2);assert.equal(ui.element('sign-in-button').disabled,true);
 finish({status:200,body:{ok:true}});await first;assert.equal(ui.element('sign-in-button').disabled,false);
});
for (const lang of ['en', 'zh']) test(`${lang} Square connection sends locale explicitly with no referrer dependency`, async()=>{
 const ui=setup({lang,responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:{name:'A'},connection:null}},{status:503,body:{error:'square_unavailable'}}]});await ui.flush();await ui.click('connect-square');
 assert.equal(JSON.parse(ui.calls.at(-1).options.body).locale,lang);
 assert.equal(ui.element('square-notice').textContent,lang==='zh'?'Square 暂时不可用，请重试。':'Square is temporarily unavailable. Please try again.');
});
test('service unavailable remains recoverable and merchant mismatch explains the existing connection',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:{name:'A'},connection:null}},{status:409,body:{error:'merchant_mismatch'}},{status:503,body:{error:'service_unavailable'}}]});await ui.flush();await ui.click('connect-square');
 assert.match(ui.element('square-notice').textContent,/disconnect.*existing.*Square/i);await ui.click('connect-square');assert.match(ui.element('square-notice').textContent,/Account service is temporarily unavailable/);
});

for (const lang of ['en', 'zh']) test(`${lang} restaurant save button reflects saved, edited and restored details`, async () => {
 const profile={name:'Restaurant',contact_name:'Owner',phone:'4085550100'};
 const ui=setup({lang,responses:[{status:200,body:{account:{email:'owner@example.test'},restaurant:profile,connection:null}},{status:200,body:{ok:true}}]});await ui.flush();
 const button=ui.element('save-profile');
 assert.equal(button.textContent,lang==='zh'?'已保存':'Saved');assert.equal(button.disabled,true);
 ui.element('restaurant-name').value='Updated';ui.element('profile-form').listeners.input();
 assert.equal(button.textContent,lang==='zh'?'保存更改':'Save changes');assert.equal(button.disabled,false);
 await ui.submit('profile-form');assert.equal(button.textContent,lang==='zh'?'已保存':'Saved');assert.equal(button.disabled,true);
 ui.element('restaurant-name').value='Different';ui.element('profile-form').listeners.input();
 ui.element('restaurant-name').value='Updated';ui.element('profile-form').listeners.input();assert.equal(button.disabled,true);
});
test('editing while a profile save is pending keeps newer edits unsaved',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;});
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:null,connection:null}},pending]});await ui.flush();
 ui.element('restaurant-name').value='First';ui.element('contact-name').value='Owner';ui.element('phone').value='4085550100';
 const saving=ui.submit('profile-form');assert.equal(ui.element('save-profile').textContent,'Saving…');
 ui.element('restaurant-name').value='Second';ui.element('profile-form').listeners.input();assert.equal(ui.element('save-profile').disabled,true);
 finish({status:200,body:{ok:true}});await saving;
 assert.equal(ui.element('save-profile').textContent,'Save changes');assert.equal(ui.element('save-profile').disabled,false);assert.match(ui.element('notice').textContent,/unsaved changes/i);
});
test('missing Square setup is explained beside its disabled button without blocking account access',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:{name:'A',contact_name:'B',phone:'4085550100'},connection:null,square_configured:false}}]});await ui.flush();
 assert.equal(ui.element('workspace').hidden,false);assert.equal(ui.element('connect-square').disabled,true);
 assert.match(ui.element('square-notice').textContent,/Square.*setup/i);assert.equal(ui.element('notice').textContent,'');
});
test('Square configuration failure during connect has a specific nearby message',async()=>{
 const ui=setup({responses:[{status:200,body:{account:{email:'a@b.com'},restaurant:{name:'A'},connection:null}},{status:503,body:{error:'configuration_unavailable'}}]});await ui.flush();await ui.click('connect-square');
 assert.match(ui.element('square-notice').textContent,/Square.*setup/i);assert.doesNotMatch(ui.element('notice').textContent,/Account service is temporarily unavailable/);
});
