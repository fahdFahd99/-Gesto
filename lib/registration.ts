import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {SqlDatabase} from './sql';
import {DomainError} from './domain';
import {RIGHTS,type Actor} from './access';
import {actorOf,passwordHash,issueSession,auditStatement,verifyPassword} from './auth';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const secretMatches=(a:string,b:string)=>timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
const configuredToken=()=>/^[a-f0-9]{64}$/i.test(process.env.SETUP_TOKEN||'');
const email=z.string().trim().toLowerCase().email().max(180);
export async function registrationStatus(db:SqlDatabase){
 const owner=await db.prepare("SELECT id FROM employees WHERE role='owner'").first();
 return {firstAccount:!owner,setupConfigured:configuredToken()};
}
async function registrationLimit(db:SqlDatabase){
 const now=new Date().toISOString(),expiry=new Date(Date.now()+900000).toISOString();
 await db.prepare('DELETE FROM authAttempts WHERE expiresAt<?').bind(now).run();
 const r=await db.prepare("INSERT INTO authAttempts (key,attempts,expiresAt) VALUES ('registration',1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts").bind(expiry).first<{attempts:number}>();
 if((r?.attempts??99)>30)throw new DomainError('Trop de demandes de création. Réessayez dans 15 minutes.',429);
}
export async function register(db:SqlDatabase,body:unknown){
 const x=z.object({name:z.string().trim().min(2).max(80),email,username:z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/).default('titulaire'),password:z.string().min(15).max(128),confirmPassword:z.string(),code:z.string().trim().min(16).max(256),pharmacyName:z.string().trim().min(2).max(100).optional()}).refine(x=>x.password===x.confirmPassword,{message:'Les mots de passe ne correspondent pas.',path:['confirmPassword']}).parse(body);
 await registrationLimit(db);
 const state=await registrationStatus(db),now=new Date().toISOString();
 let rights:Record<string,boolean>={},invitation:any=null;
 if(state.firstAccount){
   const token=process.env.SETUP_TOKEN||'';
   if(!configuredToken())throw new DomainError('Le code d’installation doit être configuré par le responsable du site.',503);
   if(!secretMatches(x.code,token))throw new DomainError('Code d’installation invalide.',403);
 }else{
   invitation=await db.prepare('SELECT * FROM invitations WHERE tokenHash=? AND usedAt IS NULL AND expiresAt>? AND email=?').bind(digest(x.code),now,x.email).first();
   if(!invitation)throw new DomainError('Invitation invalide, expirée ou déjà utilisée. Vérifiez aussi votre e-mail.',403);
   rights=JSON.parse(invitation.rights);
 }
 const id=state.firstAccount?'titulaire':crypto.randomUUID(),username=state.firstAccount?'titulaire':x.username;
 const exists=await db.prepare('SELECT id FROM employees WHERE username=? OR email=?').bind(username,x.email).first();
 if(exists)throw new DomainError('Ce compte existe déjà. Connectez-vous ou contactez le titulaire.',409);
 const actor:Actor={id,name:x.name,username,email:x.email,role:state.firstAccount?'owner':'employee',rights,enabled:1,version:1};
 const statements=[db.prepare('INSERT INTO employees (id,name,username,email,role,rights,passwordHash,enabled,createdAt) VALUES (?,?,?,?,?,?,?,1,?)').bind(id,x.name,username,x.email,actor.role,JSON.stringify(rights),await passwordHash(x.password),now),auditStatement(db,actor,'account.created',id)];
 if(invitation)statements.push(db.prepare('UPDATE invitations SET usedAt=?,version=CASE WHEN usedAt IS NULL AND expiresAt>? THEN version+1 ELSE -1 END WHERE tokenHash=?').bind(now,now,invitation.tokenHash));
 if(state.firstAccount&&x.pharmacyName)statements.push(db.prepare("INSERT INTO settings (key,value) VALUES ('pharmacyName',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(x.pharmacyName));
 await db.batch(statements);
 return issueSession(db,actor);
}
export async function invite(db:SqlDatabase,actor:Actor,body:unknown){
 if(actor.role!=='owner')throw new DomainError('Seul le titulaire peut inviter un collaborateur.',403);
 const x=z.object({email,rights:z.record(z.boolean())}).parse(body);
 const rights=Object.fromEntries(Object.keys(RIGHTS).filter(k=>k!=='employees').map(k=>[k,x.rights[k]===true]));
 if((rights.purchases||rights.backups)&&!rights.margins)throw new DomainError('Les achats et sauvegardes nécessitent l’accès aux coûts.');
 const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+48*3600000).toISOString();
 await db.batch([
 db.prepare('DELETE FROM invitations WHERE email=? AND usedAt IS NULL').bind(x.email),
 db.prepare('INSERT INTO invitations (tokenHash,email,rights,expiresAt,createdBy) VALUES (?,?,?,?,?)').bind(digest(token),x.email,JSON.stringify(rights),expiresAt,actor.id),
 auditStatement(db,actor,'account.invited',x.email),
 ]);
 return {code:token,email:x.email,expiresAt};
}
export async function changePassword(db:SqlDatabase,actor:Actor,body:unknown){
 const x=z.object({currentPassword:z.string().min(1).max(256),password:z.string().min(15).max(128),confirmPassword:z.string()}).refine(x=>x.password===x.confirmPassword,{message:'Les mots de passe ne correspondent pas.'}).parse(body);
 const row=await db.prepare('SELECT passwordHash FROM employees WHERE id=?').bind(actor.id).first<any>();
 if(!row||!await verifyPassword(x.currentPassword,row.passwordHash))throw new DomainError('Mot de passe actuel incorrect.',403);
 await db.batch([db.prepare('UPDATE employees SET passwordHash=?,version=version+1 WHERE id=?').bind(await passwordHash(x.password),actor.id),db.prepare('DELETE FROM sessions WHERE employeeId=?').bind(actor.id),auditStatement(db,actor,'account.password_changed',actor.id)]);
 return {ok:true};
}
