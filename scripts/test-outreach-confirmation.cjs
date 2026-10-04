const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('interested.html','utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function page(query, ok=true){
 const nodes={},calls=[]; let resolve;
 const response=new Promise(r=>resolve=r);
 const ctx={URLSearchParams,FormData,AbortController,setTimeout,clearTimeout,window:{location:{search:query}},document:{getElementById(id){return nodes[id]??=( {style:{},disabled:id==='confirm-btn',textContent:'',focus(){this.focused=true},addEventListener(_,fn){this.click=fn}})}},fetch(url,opts){calls.push({url,opts});return response}};
 vm.runInNewContext(code,ctx);
 return {nodes,calls,resolve};
}
(async()=>{
 for(const query of ['', '?t=invalid']){let p=page(query);assert.equal(p.nodes['invalid-view'].style.display,'block');assert.equal(p.calls.length,0)}
 let p=page('?t='+'a'.repeat(32)+'&r=%3Cimg%20src%3Dx%3E&s=Square');
 assert.equal(p.calls.length,0);assert.equal(p.nodes['for-rest'].textContent,' for <img src=x>');
 p.nodes['confirm-btn'].click();p.nodes['confirm-btn'].click();assert.equal(p.calls.length,1);
 assert.equal(p.calls[0].opts.method,'POST');assert.equal(p.calls[0].opts.body.get('token'),'a'.repeat(32));
 assert.equal(p.calls[0].opts.body.get('restaurant'),'<img src=x>');
 p.resolve({ok:true});await new Promise(r=>setImmediate(r));assert.equal(p.nodes['success-view'].style.display,'block');
 p=page('?t='+'b'.repeat(32));p.nodes['confirm-btn'].click();p.resolve({ok:false});await new Promise(r=>setImmediate(r));
 assert.equal(p.nodes['confirm-btn'].disabled,false);assert.equal(p.nodes.err.style.display,'block');
 console.log('PASS: GET has no submission, malformed tokens rejected, display is text, repeat clicks blocked, payload, success and retry states');
})().catch(e=>{console.error(e);process.exitCode=1});
