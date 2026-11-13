import test from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt, randomToken } from '../../server/account/security.mjs';
import { renewConnection, runRenewal } from '../../server/account/renewal.mjs';
const DAY = 86400000;
const now = Date.parse('2026-11-12T12:00:00Z');
const env = { APP_ORIGIN:'https://example.com', SQUARE_ENVIRONMENT:'sandbox', SQUARE_APP_ID:'app', SQUARE_APP_SECRET:'app-secret', SQUARE_API_VERSION:'2026-09-16', TOKEN_ENCRYPTION_KEY:randomToken() };
const replacement = {merchant_id:'merchant',access_token:'new-access',refresh_token:'new-refresh',expires_at:'2026-12-12T12:00:00Z'};
async function connection(patch={}) { return {account_id:'account',merchant_id:'merchant',token_cipher:await encrypt(JSON.stringify({access_token:'old-access',refresh_token:'old-refresh'}),env.TOKEN_ENCRYPTION_KEY),expires_at:now+20*DAY,renewed_at:now-7*DAY,status:'connected',location_id:'location',lease:null,lease_until:0,version:1,...patch}; }
function storeFor(record) {
 return {record,claims:0,completions:0,failures:0,cleaned:false,
 async dueConnections(time,limit){assert.equal(limit,100);return this.record ? [structuredClone(this.record)] : [];},
 async claimConnection(id,lease,time){this.claims++;if (!this.record || this.record.lease_until>time || ['disconnected','disconnecting','revoking'].includes(this.record.status)) return null;Object.assign(this.record,{lease,lease_until:time+60000});return structuredClone(this.record);},
 async completeRenewal(id,lease,token_cipher,expires_at,time){this.completions++;if(this.record.lease!==lease || ['disconnected','disconnecting','revoking'].includes(this.record.status))return null;Object.assign(this.record,{token_cipher,expires_at,renewed_at:time,status:'connected',lease:null,lease_until:0,version:this.record.version+1});return structuredClone(this.record);},
 async failRenewal(id,lease,status){this.failures++;if(this.record.lease!==lease || ['disconnected','disconnecting','revoking'].includes(this.record.status))return null;Object.assign(this.record,{status,lease:null,lease_until:0});return structuredClone(this.record);},
 async cleanup(){this.cleaned=true;}
 };
}
const success = async () => new Response(JSON.stringify(replacement));
test('renewal starts at seven days, decrypts only server-side and atomically stores encrypted replacement',async()=>{
 const record=await connection(),store=storeFor(record);
 const updated=await renewConnection(env,store,structuredClone(record),now,async(url,options)=>{
  assert.equal(JSON.parse(options.body).refresh_token,'old-refresh');return success();
 });
 assert.equal(updated.renewed_at,now);
 assert.equal(updated.expires_at,Date.parse(replacement.expires_at));
 assert.equal(updated.location_id,'location');
 assert.equal(store.completions,1);
 assert.ok(!updated.token_cipher.includes('new-refresh'));
 assert.deepEqual(JSON.parse(await decrypt(updated.token_cipher,env.TOKEN_ENCRYPTION_KEY)),replacement);
});
test('fresh tokens do not refresh, while imminent expiry refreshes early',async()=>{
 const fresh=await connection({renewed_at:now-7*DAY+1}),store=storeFor(fresh);
 assert.equal(await renewConnection(env,store,fresh,now,()=>{throw Error('must not fetch');}),null);
 assert.equal(store.claims,0);
 const expiring=await connection({renewed_at:now-DAY,expires_at:now+DAY});
 assert.equal((await renewConnection(env,storeFor(expiring),expiring,now,success)).status,'connected');
});
test('a transient provider failure preserves credentials and exposes renewal_failed',async()=>{
 const record=await connection(),cipher=record.token_cipher,store=storeFor(record);
 const updated=await renewConnection(env,store,record,now,async()=>new Response('{}',{status:503}));
 assert.equal(updated.status,'renewal_failed');assert.equal(updated.token_cipher,cipher);assert.equal(updated.renewed_at,now-7*DAY);
});
test('revoked refresh credentials require reconnect and never expose provider details',async()=>{
 const record=await connection(),store=storeFor(record);
 assert.equal((await renewConnection(env,store,record,now,async()=>new Response(JSON.stringify({errors:[{code:'INVALID_GRANT',detail:'old-refresh'}]}),{status:400}))).status,'reconnect_required');
 assert.equal(store.completions,0);
});
test('merchant identity mismatch never replaces a connection',async()=>{
 const record=await connection(),store=storeFor(record),cipher=record.token_cipher;
 const result=await renewConnection(env,store,record,now,async()=>new Response(JSON.stringify({...replacement,merchant_id:'other-merchant'})));
 assert.equal(result.status,'reconnect_required');assert.equal(result.token_cipher,cipher);assert.equal(store.completions,0);
});
test('concurrent refresh requests share a lease and issue one provider request',async()=>{
 const record=await connection(),snapshot=structuredClone(record),store=storeFor(record);let calls=0;
 await Promise.all([renewConnection(env,store,snapshot,now,async()=>{calls++;return success();}),renewConnection(env,store,snapshot,now,async()=>{calls++;return success();})]);
 assert.equal(calls,1);assert.equal(store.completions,1);
 // A stale page request after completion must recheck the freshly claimed row.
 await renewConnection(env,store,snapshot,now,async()=>{calls++;return success();});
 assert.equal(calls,1);
});
test('in-flight renewal cannot resurrect a revoked or disconnecting connection',async()=>{
 for(const status of ['disconnected','disconnecting','revoking']){
  const record=await connection(),store=storeFor(record);
  assert.equal(await renewConnection(env,store,record,now,async()=>{Object.assign(store.record,{status,lease:null,token_cipher:null});return success();}),null);
  assert.equal(store.record.status,status);assert.equal(store.record.token_cipher,null);
 }
});
test('scheduled renewal cleans expired records and caps even a misbehaving store at 100',async()=>{
 const base=await connection();let claims=0,cleaned=0;
 const store={async cleanup(){cleaned++;},async dueConnections(time,limit){assert.equal(limit,100);return Array.from({length:150},(_,i)=>({...base,account_id:String(i)}));},async claimConnection(){claims++;return null;}};
 const result=await runRenewal(env,store,now,()=>{throw Error('must not fetch');});
 assert.equal(cleaned,1);assert.equal(claims,100);assert.equal(result.processed,100);assert.equal(result.skipped,100);
});
test('each scheduled claim gets a fresh timestamp after a batch advances beyond the lease duration',async()=>{
 const base=await connection();let clockTime=now,claims=[];
 const store={async cleanup(){},async dueConnections(){return Array.from({length:6},(_,i)=>({...base,account_id:String(i)}));},async claimConnection(account,lease,time){claims.push(time);return null;}};
 const clock=()=>{const current=clockTime;clockTime+=130000;return current;};
 await runRenewal(env,store,now,()=>{throw Error('must not fetch');},clock);
 assert.deepEqual(claims,Array.from({length:6},(_,i)=>now+i*130000));
 assert.ok(claims[5]>now+120000);
});
test('a delayed scheduled event uses actual execution time for selection and cleanup',async()=>{
 const {default:worker}=await import('../../workers/square-renewal.mjs');
 const queries=[];
 const db={async batch(){},prepare(sql){return {bind(...args){queries.push({sql,args});return {async all(){return {results:[]};}};}};}};
 let work;
 const started=Date.now();
 await worker.scheduled({scheduledTime:started-DAY},{ACCOUNT_DB:db},{waitUntil(promise){work=promise;}});
 await work;
 assert.ok(queries.length>0);
 for(const query of queries)assert.ok(query.args[0]>=started);
});
