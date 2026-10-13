import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {createConnection} from '../runtime/database.mjs';
import {migrate} from '../runtime/migrate.mjs';
await mkdir('.test-runtime',{recursive:true});
const folder=await mkdtemp(join(process.cwd(),'.test-runtime','http-'));
const config={url:'file:'+join(folder,'test.db')};const db=createConnection(config);await migrate(db);await db.close();
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
const origin=`http://127.0.0.1:${port}`,setup=randomBytes(32).toString('hex'),password='HTTP-test-password-long-432!';
let child,logs='',ownerCookie='',count=0;
const ok=s=>{count++;console.log('PASS '+s);};
async function start(){
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:config.url,DATABASE_AUTH_TOKEN:'',APP_ORIGIN:origin,SETUP_TOKEN:setup,NETLIFY:''},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',s=>{logs=(logs+s).slice(-8000);});child.stderr.on('data',s=>{logs=(logs+s).slice(-8000);});
 for(let i=0;i<150;i++){if(child.exitCode!==null)throw new Error('Server failed: '+logs);try{const r=await fetch(origin+'/api/session');if(r.status===200)return;}catch{}await new Promise(r=>setTimeout(r,100));}
 throw new Error('Server did not become ready: '+logs);
}
async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}}
async function api(action,body,cookie=ownerCookie,expected=200){
 const response=await fetch(origin+'/api/'+action,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json',origin}),...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();assert.equal(response.status,expected,action+': '+JSON.stringify(data));return {data,cookie:response.headers.get('set-cookie')?.split(';')[0],response};
}
try{
 await start();
 const page=await fetch(origin);assert.equal(page.status,200);const html=await page.text();assert.match(html,/Pharmacie Ijjai/);
 const assets=[...new Set([...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"?]+[^" ]*)"/g)].map(m=>m[1]))];assert(assets.length>0);for(const url of assets)assert.equal((await fetch(new URL(url,origin))).status,200);
 ok('actual Next production page and all linked static assets serve successfully');
 await api('snapshot',undefined,'',401);const empty=(await api('session',undefined,'')).data;assert.equal(empty.firstAccount,true);ok('anonymous access is denied; first-account status is available');
 const owner=await api('register',{name:'Responsable test',email:'owner@test.invalid',password,confirmPassword:password,pharmacyName:'Officine HTTP',code:setup},'',201);ownerCookie=owner.cookie;assert(ownerCookie);let snapshot=(await api('snapshot')).data;assert.equal(snapshot.products.length,0);assert.equal(snapshot.settings.pharmacyName,'Officine HTTP');ok('first account registration creates a session and opens an empty real database');
 const evil=await fetch(origin+'/api/suppliers',{method:'POST',headers:{'content-type':'application/json',origin:'https://hostile.invalid',cookie:ownerCookie},body:'{}'});assert.equal(evil.status,403);
 const noOrigin=await fetch(origin+'/api/logout',{method:'POST',headers:{'content-type':'application/json',cookie:ownerCookie},body:'{}'});assert.equal(noOrigin.status,403);ok('foreign and missing origins cannot mutate data');
 const base={kind:'medicament',name:'Médicament HTTP',barcode:'0000000012345',activeIngredients:[{name:'Paracétamol',dose:500,unit:'mg'}],purchaseCents:700,discountBp:0,saleCents:1000,taxId:'exonere',minStock:2};
 const medicine=(await api('products',base)).data.id,para=(await api('products',{...base,kind:'parapharmacie',name:'Soin HTTP',barcode:'0000000054321',activeIngredients:[],purchaseCents:2000,saleCents:3500})).data.id;
 await api('products',{...base,barcode:'INVALID-KIND',kind:'lait'},ownerCookie,400);
 const supplier=(await api('suppliers',{name:'Fournisseur HTTP',phone:'',email:'',city:'',note:''})).data.id;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Casablanca',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const receipt={id:crypto.randomUUID(),supplierId:supplier,document:'BL-HTTP-01',kind:'entry',receptionDate:today,lines:[{productId:medicine,series:1,manufacturerLot:'TEST-1',expiry:'2030-12-31',quantity:4,freeQuantity:0,purchaseCents:700,discountBp:0,saleCents:1000},{productId:para,series:1,manufacturerLot:'TEST-2',expiry:null,quantity:5,freeQuantity:0,purchaseCents:2000,discountBp:0,saleCents:3500}]};
 await api('receipts',receipt);await api('receipts',receipt);snapshot=(await api('snapshot')).data;assert.equal(snapshot.products.find(p=>p.id===medicine).available,4);assert.equal(snapshot.products.find(p=>p.id===para).available,5);ok('both product families, leading barcode zeros, supplier and idempotent receipt work over HTTP');
 const sale={id:crypto.randomUUID(),payment:'Carte',receivedCents:0,expectedTotalCents:9000,lines:[{productId:medicine,quantity:2},{productId:para,quantity:2}]};await api('sales',sale);await api('sales',sale);const ticket=(await api('ticket?id='+sale.id)).data;assert.equal(ticket.lines.length,2);assert.equal(JSON.stringify(ticket).includes('cost'),false);
 snapshot=(await api('snapshot')).data;assert.equal(snapshot.sales.length,1);assert.equal(snapshot.products.find(p=>p.id===medicine).available,2);ok('mixed sale depletes stock once and client ticket contains no purchase costs');
 const line=ticket.lines.find(l=>l.productId===para);await api('returns',{id:crypto.randomUUID(),saleId:sale.id,payment:'Carte',reason:'Retour HTTP vérifié',lines:[{saleLineId:line.id,quantity:1}]});snapshot=(await api('snapshot')).data;assert.equal(snapshot.products.find(p=>p.id===para).available,3);assert.equal(snapshot.quarantine.length,1);
 const entries=snapshot.ledger.filter(e=>e.event!=='purchase');assert.equal(entries.reduce((s,e)=>s+e.totalCents,0),5500);assert.equal(entries.reduce((s,e)=>s+e.costCents,0),3400);assert.deepEqual(new Set(entries.map(e=>e.kind)),new Set(['medicament','parapharmacie']));ok('partial return stays quarantined and family ledger reconciles net sales and exact cost');
 const invite=(await api('invitations',{email:'staff@test.invalid',rights:{sales:true,reports:true}})).data;
 const staff=await api('register',{name:'Équipe HTTP',email:'staff@test.invalid',username:'staff-http',password,confirmPassword:password,code:invite.code},'',201);
 const staffState=(await api('snapshot',undefined,staff.cookie)).data;assert.equal(JSON.stringify(staffState).includes('costCents'),false);assert.equal(JSON.stringify(staffState).includes('purchaseCents'),false);await api('products',base,staff.cookie,403);await api('backup',undefined,staff.cookie,403);ok('invited account logs in with scoped rights; costs and backups remain protected');
 const backup=(await api('backup')).data;assert.equal(backup.schemaVersion,11);assert.equal(JSON.stringify(backup).includes('passwordHash'),false);const source=join(folder,'backup.json'),target=join(folder,'restored.db');await writeFile(source,JSON.stringify(backup));
 const restore=spawn(process.execPath,['scripts/restore-backup.mjs',source,target],{stdio:['ignore','pipe','pipe']});let restoreLog='';restore.stdout.on('data',x=>restoreLog+=x);restore.stderr.on('data',x=>restoreLog+=x);const [exit]=await once(restore,'exit');assert.equal(exit,0,restoreLog);const restored=createConnection({url:'file:'+target});assert.equal((await restored.prepare('SELECT COUNT(*) n FROM sales').first()).n,1);assert.equal((await restored.prepare('SELECT COUNT(*) n FROM employees').first()).n,0);await restored.close();ok('credential-free backup restores into a separate database with verified integrity');
 await stop();await start();snapshot=(await api('snapshot')).data;assert.equal(snapshot.sales.length,1);assert.equal(snapshot.products.find(p=>p.id===para).available,3);ok('accounts, sessions and business records survive complete production server restart');
 await api('logout',{});await api('snapshot',undefined,ownerCookie,401);const signed=await api('login',{username:'owner@test.invalid',password},'');assert(signed.cookie);ok('logout invalidates the server session and email login restores access');
 console.log(JSON.stringify({passed:count,failed:0,runtime:'Next.js production HTTP + SQLite/libSQL',isolated:true}));
}finally{await stop();await rm(folder,{recursive:true,force:true});}
