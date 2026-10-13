import type {SqlDatabase,SqlStatement} from './sql';
import { scrypt,randomBytes,timingSafeEqual,createHash } from 'node:crypto';
import { z } from 'zod';
import { DomainError } from './domain';
import { can,RIGHTS,type Actor,type Right } from './access';
import {isNetlify} from '../runtime/config.mjs';
export {can};
export const COOKIE='__Host-ijjai-session';
export function secureCookies(){if(isNetlify())return true;try{const origin=new URL(process.env.APP_ORIGIN||'');return !(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname));}catch{return true;}}
export const cookieName=()=>secureCookies()?COOKIE:'ijjai-local-session';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
export async function passwordHash(password:string){const salt=randomBytes(24).toString('hex');return `scrypt:32768:8:3:${salt}:${(await derive(password,salt)).toString('hex')}`;}
export async function verifyPassword(password:string,stored:string){const parts=stored.split(':');if(parts.length!==6||parts.slice(0,4).join(':')!=='scrypt:32768:8:3')return false;const key=await derive(password,parts[4]);const expected=Buffer.from(parts[5],'hex');return key.length===expected.length&&timingSafeEqual(key,expected);}
export function actorOf(row:any):Actor {return {id:row.id,name:row.name,username:row.username,email:row.email||'',role:row.role,rights:JSON.parse(row.rights),enabled:row.enabled,version:row.version};}
export function requireRight(actor:Actor|null,right:Right){if(!actor)throw new DomainError('Connectez-vous pour accéder à votre pharmacie.',401);if(!actor.enabled||!can(actor,right))throw new DomainError('Votre compte ne possède pas cette autorisation.',403);}
export function auditStatement(db:SqlDatabase,actor:Actor,action:string,reference:string,detail=''){return db.prepare('INSERT INTO audit (id,operatorId,operatorName,action,reference,detail,createdAt) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),actor.id,actor.name,action,reference,detail,new Date().toISOString());}
export async function identify(db:SqlDatabase,request:Request):Promise<Actor|null>{
 // Authentication is based only on an issued, server-side session cookie.
 const cookie=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName()+'='))?.slice(cookieName().length+1);
 if(cookie&&/^[a-f0-9]{64}$/.test(cookie)){const row=await db.prepare('SELECT e.* FROM sessions s JOIN employees e ON e.id=s.employeeId WHERE s.tokenHash=? AND s.expiresAt>? AND e.enabled=1').bind(hash(cookie),new Date().toISOString()).first();if(row)return actorOf(row);return null;}
 if(cookie)return null;
 return null;
}
export const sessionCookie=(token:string,maxAge=43200)=>`${cookieName()}=${token}; Path=/; HttpOnly;${secureCookies()?' Secure;':''} SameSite=Lax; Max-Age=${maxAge}`;
export async function issueSession(db:SqlDatabase,actor:Actor){const token=randomBytes(32).toString('hex');await db.batch([db.prepare('DELETE FROM sessions WHERE expiresAt<?').bind(new Date().toISOString()),db.prepare('INSERT INTO sessions (tokenHash,employeeId,expiresAt,createdAt) VALUES (?,?,?,?)').bind(hash(token),actor.id,new Date(Date.now()+43200000).toISOString(),new Date().toISOString()),auditStatement(db,actor,'session.login',actor.id)]);return {actor,cookie:sessionCookie(token)};}
export async function login(db:SqlDatabase,body:unknown,request:Request){const x=z.object({username:z.string().trim().min(1).max(180),password:z.string().min(1).max(256)}).parse(body);const name=x.username.toLowerCase();
 // Atomic account limiter precedes expensive hashing; no client-supplied IP is trusted.
 await db.prepare('DELETE FROM authAttempts WHERE expiresAt<?').bind(new Date().toISOString()).run();
 const key=hash(name),now=new Date().toISOString(),expires=new Date(Date.now()+900000).toISOString();const result=await db.prepare('INSERT INTO authAttempts (key,attempts,expiresAt) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expiresAt<? THEN 1 ELSE attempts+1 END,expiresAt=CASE WHEN expiresAt<? THEN excluded.expiresAt ELSE expiresAt END RETURNING attempts').bind(key,expires,now,now).first<{attempts:number}>();
 if((result?.attempts??99)>8)throw new DomainError('Trop de tentatives. Réessayez dans 15 minutes.',429);
 const row=await db.prepare('SELECT * FROM employees WHERE (username=? OR email=?) AND enabled=1').bind(name,name).first<any>();
 if(!row||!row.passwordHash||!await verifyPassword(x.password,row.passwordHash))throw new DomainError('Identifiant ou mot de passe incorrect.',401);
 await db.prepare('DELETE FROM authAttempts WHERE key=?').bind(key).run();return issueSession(db,actorOf(row));
}
export async function logout(db:SqlDatabase,request:Request){const value=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName()+'='))?.slice(cookieName().length+1);if(value)await db.prepare('DELETE FROM sessions WHERE tokenHash=?').bind(hash(value)).run();return sessionCookie('',0);}
export async function employeeMutation(db:SqlDatabase,actor:Actor,body:unknown){if(actor.role!=='owner')throw new DomainError('Seul le titulaire peut gérer les comptes et les droits.',403);
 const x=z.object({id:z.string().optional(),version:z.number().int().positive().optional(),name:z.string().trim().min(2).max(80),username:z.string().trim().regex(/^[A-Za-z0-9._-]{3,40}$/),password:z.string().min(15).max(128).optional(),currentPassword:z.string().max(256).optional(),email:z.union([z.string().trim().toLowerCase().email(),z.literal('')]).optional(),enabled:z.boolean(),rights:z.record(z.boolean())}).parse(body);
 const id=x.id??crypto.randomUUID(),old=x.id?await db.prepare('SELECT * FROM employees WHERE id=?').bind(id).first<any>():null;
 if(x.id&&!old)throw new DomainError('Employé introuvable.',404);if(old?.role==='owner'&&(!x.enabled||x.username!=='titulaire'))throw new DomainError('Le titulaire ne peut pas être désactivé ou renommé.');if(!old&&!x.password)throw new DomainError('Définissez un mot de passe de 15 caractères minimum.');
 const rights=Object.fromEntries(Object.keys(RIGHTS).map(k=>[k,k!=='employees'&&x.rights[k]===true]));if(rights.purchases&&!rights.margins)throw new DomainError('Les achats nécessitent aussi l’accès aux coûts.');if(rights.backups&&!rights.margins)throw new DomainError('Les sauvegardes nécessitent aussi l’accès aux coûts.');
 if(old?.role==='owner'&&x.password&&(!x.currentPassword||!await verifyPassword(x.currentPassword,old.passwordHash)))throw new DomainError('Confirmez votre mot de passe actuel.',403);
 const password=x.password?await passwordHash(x.password):old?.passwordHash??'';
 const statements=[old?db.prepare('UPDATE employees SET name=?,username=?,email=?,rights=?,passwordHash=?,enabled=?,version=CASE WHEN version=? THEN version+1 ELSE -1 END WHERE id=?').bind(x.name,x.username.toLowerCase(),x.email??old?.email??'',JSON.stringify(rights),password,x.enabled?1:0,x.version??0,id):db.prepare('INSERT INTO employees (id,name,username,email,rights,passwordHash,enabled,createdAt) VALUES (?,?,?,?,?,?,?,?)').bind(id,x.name,x.username.toLowerCase(),x.email??'',JSON.stringify(rights),password,x.enabled?1:0,new Date().toISOString()),auditStatement(db,actor,old?'employee.updated':'employee.created',id,JSON.stringify({name:x.name,enabled:x.enabled,rights}))];
 // Invalidate sessions immediately on account, permission, or password changes.
 if(old)statements.push(db.prepare('DELETE FROM sessions WHERE employeeId=?').bind(id));await db.batch(statements);return {id};
}
