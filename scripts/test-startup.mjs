import assert from 'node:assert/strict';
import {mkdtemp,cp,symlink,rm,readFile,access,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {parseEnv} from 'node:util';
import {createConnection,connectionConfig} from '../runtime/database.mjs';
import {configuredOrigin} from '../runtime/config.mjs';
import {migrate} from '../runtime/migrate.mjs';
const root=process.cwd(),folder=await mkdtemp(join(tmpdir(),'ijjai-startup-'));
const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');
const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const origin=`http://localhost:${port}`;
const env={...process.env,NEXT_TELEMETRY_DISABLED:'1'};
for(const key of ['DATABASE_URL','DATABASE_AUTH_TOKEN','APP_ORIGIN','SETUP_TOKEN','NETLIFY','SITE_ID','SITE_NAME','URL','NODE_ENV'])delete env[key];
let child,logs='',count=0;
const ok=s=>{count++;console.log('PASS '+s);};
async function start(overrides={},raw=false){
 logs='';
 child=spawn(process.execPath,raw?[resolve('node_modules/next/dist/bin/next'),'start','--port',String(port),'--hostname','127.0.0.1']:['scripts/launch.mjs','start','--port',String(port),'--hostname','127.0.0.1'],{cwd:folder,env:{...env,...overrides},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',s=>logs=(logs+s).slice(-6000));child.stderr.on('data',s=>logs=(logs+s).slice(-6000));
 for(let i=0;i<200;i++){
  if(child.exitCode!==null)throw new Error('Server failed: '+logs);
  try{const r=await fetch(origin+'/api/session');if(r.status===200||raw)return r;}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 throw new Error('Server startup timed out: '+logs);
}
async function stop(){if(child&&child.exitCode===null){child.kill('SIGTERM');await once(child,'exit');}}
async function api(name,body,cookie=''){
 const r=await fetch(origin+'/api/'+name,{method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',cookie},body:body===undefined?undefined:JSON.stringify(body)});
 return {r,data:await r.json()};
}
try{
 assert.throws(()=>connectionConfig({}),e=>e.code==='DATABASE_URL_MISSING');
 assert.throws(()=>connectionConfig({NODE_ENV:'production'}),e=>e.code==='DATABASE_URL_MISSING');
 assert.throws(()=>connectionConfig({SITE_ID:'test-site',URL:'https://test.netlify.app',DATABASE_URL:'file:local.db'}),e=>e.code==='DATABASE_LOCAL_ON_NETLIFY');
 assert.throws(()=>configuredOrigin({SITE_ID:'test-site',URL:'https://test.netlify.app',APP_ORIGIN:'http://localhost:3000'}));
 assert.throws(()=>connectionConfig({DATABASE_URL:'libsql://test.invalid'}),e=>e.code==='DATABASE_TOKEN_MISSING');
 ok('missing runtime NETLIFY marker never falls back to an accidental local production database');
 for(const name of ['scripts','runtime','drizzle','app','components','lib','public','next.config.ts','tsconfig.json'])await cp(join(root,name),join(folder,name),{recursive:true});
 for(const name of ['node_modules','.next'])await symlink(join(root,name),join(folder,name),'dir');
 await cp(join(root,'package.json'),join(folder,'package.json'));
 await assert.rejects(()=>access(join(folder,'.env.local')));
 const ready=await start();assert.equal(ready.status,200);
 const first=await ready.json();assert.equal(first.firstAccount,true);assert.equal(first.setupConfigured,true);
 const originalEnv=await readFile(join(folder,'.env.local'),'utf8'),config=parseEnv(originalEnv);
 assert.match(config.SETUP_TOKEN,/^[a-f0-9]{64}$/);
 assert.equal(logs.includes(config.SETUP_TOKEN),false);
 assert.equal((await fetch(origin)).status,200);
 assert.equal((await api('snapshot')).r.status,401);
 ok('fresh folder starts production with no manual setup, env file, directory or database supplied');
 const password='Isolated-startup-test-password-34!';
 const registered=await api('register',{name:'Test installation',email:'startup@test.invalid',password,confirmPassword:password,code:config.SETUP_TOKEN,pharmacyName:'Officine de test isolée'});
 assert.equal(registered.r.status,201,JSON.stringify(registered.data));
 const cookie=registered.r.headers.get('set-cookie').split(';')[0];
 const supplied=await api('suppliers',{name:'Fournisseur persistant de test',phone:'',email:'',city:'',note:''},cookie);assert.equal(supplied.r.status,200);
 await stop();await start();
 assert.equal(await readFile(join(folder,'.env.local'),'utf8'),originalEnv);
 const snapshot=await api('snapshot',undefined,cookie);assert.equal(snapshot.r.status,200);assert.equal(snapshot.data.suppliers[0].name,'Fournisseur persistant de test');
 ok('generated secret, real owner session and saved records survive a complete restart unchanged');
 await stop();
 const legacyFile=join(folder,'legacy.db'),legacy=createConnection({url:'file:'+legacyFile});
 await legacy.exec("CREATE TABLE original_data (value TEXT); INSERT INTO original_data VALUES ('keep me');");
 await assert.rejects(()=>migrate(legacy),/MIGRATIONS_UNTRACKED/);
 assert.equal((await legacy.prepare('SELECT value FROM original_data').first()).value,'keep me');
 assert.equal(await legacy.prepare("SELECT name FROM sqlite_master WHERE name='app_migrations'").first(),null);await legacy.close();
 ok('untracked existing databases are rejected before any schema write or reset');
 const unconfigured=await start({DATABASE_URL:'',SITE_ID:'test-site',URL:'https://test.netlify.app',APP_ORIGIN:'https://test.netlify.app'},true);
 assert.equal(unconfigured.status,503);const failure=await unconfigured.json();assert.equal(failure.code,'DATABASE_URL_MISSING');assert(failure.reference);assert.equal(JSON.stringify(failure).includes(config.SETUP_TOKEN),false);
 ok('production API reports an actionable non-secret code and reference when runtime database config is missing');
 await stop();
 const emptyDb=join(folder,'empty.db'),empty=createConnection({url:'file:'+emptyDb});await empty.prepare('SELECT 1').first();await empty.close();
 const notMigrated=await start({DATABASE_URL:'file:'+emptyDb},true);assert.equal(notMigrated.status,503);assert.equal((await notMigrated.json()).code,'DATABASE_SCHEMA_NOT_READY');
 await stop();
 const doctor=spawnSync(process.execPath,['scripts/doctor.mjs','--netlify'],{cwd:folder,env,encoding:'utf8'});
 assert.equal(doctor.status,1);assert.match(doctor.stderr,/DATABASE_LOCAL_ON_NETLIFY/);assert.equal(doctor.stderr.includes(config.SETUP_TOKEN),false);
 ok('missing schema is explicit and Netlify build preflight rejects local SQLite without modifying data');
 console.log(JSON.stringify({passed:count,failed:0,isolated:true,scope:'first launch and deployment configuration'}));
}finally{await stop();await rm(folder,{recursive:true,force:true});}
