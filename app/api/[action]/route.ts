import { database } from '@/lib/database';
import { initialize } from '@/lib/seed';
import { mutate,snapshot } from '@/lib/service';
import { DomainError } from '@/lib/domain';
import { identify,login,logout,requireRight } from '@/lib/auth';
import { ticket,scrub } from '@/lib/v9-service';
import {registrationStatus,register,invite,changePassword} from '@/lib/registration';
import {verifyOrigin,readJson} from '@/lib/http-security';
import { ZodError } from 'zod';
import {ConfigurationError,configuredOrigin} from '../../../runtime/config.mjs';
import {databaseFailure} from '../../../runtime/diagnostics.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
function json(data:unknown,status=200,extra:Record<string,string>={}){return Response.json(data,{status,headers:{...headers,...extra}});}
function fail(error:unknown){
 if(error instanceof ZodError)return json({error:error.issues.map(x=>`${x.path.join('.')} : ${x.message}`).join(' · ')},400);
 if(error instanceof DomainError)return json({error:error.message},error.status);
 const m=String(error);
 if(/employee_(email|username)|employees\.(username|email)/.test(m))return json({error:'Ce compte existe déjà.'},409);
 if(m.includes('products.barcode'))return json({error:'Ce code-barres existe déjà.'},409);
 if(m.includes('active_draft_per_operator'))return json({error:'Terminez ou mettez en attente votre brouillon actuel avant de reprendre cette vente.'},409);
 if(/constraint|version|return_quantity/i.test(m))return json({error:'Les données ont changé ou cette opération existe déjà. Actualisez avant de réessayer.'},409);
 const issue=databaseFailure(error),reference=crypto.randomUUID();
 console.error('Pharmacy service failure',{code:issue.code,reference});
 return json({...issue,reference},issue.code==='SERVER_ERROR'?500:503);
}
export async function GET(request:Request,{params}:{params:Promise<{action:string}>}){try{const {action}=await params,db=database();await initialize(db);const actor=await identify(db,request);if(action==='session'){configuredOrigin();const status=await registrationStatus(db);if(status.firstAccount&&!status.setupConfigured)throw new ConfigurationError('SETUP_TOKEN_INVALID','Code privé du premier compte absent ou invalide.');return json({actor,...status});}if(!actor)throw new DomainError('Connectez-vous pour accéder à votre pharmacie.',401);
 if(action==='snapshot')return json(await snapshot(db,actor));
 if(action==='ticket')return json(await ticket(db,actor,new URL(request.url).searchParams.get('id')??''));
 if(action==='purchase'){requireRight(actor,'purchases');requireRight(actor,'margins');const id=new URL(request.url).searchParams.get('id');const receipt=await db.prepare('SELECT r.*,s.name supplierName FROM receipts r LEFT JOIN suppliers s ON s.id=r.supplierId WHERE r.id=?').bind(id).first();if(!receipt)throw new DomainError('Réception introuvable.',404);const lines=await db.prepare('SELECT rl.*,l.series,l.manufacturerLot,l.expiry FROM receiptLines rl JOIN lots l ON l.id=rl.lotId WHERE receiptId=?').bind(id).all();return json(scrub({receipt,lines:lines.results},true));}
 if(action==='credit'){requireRight(actor,'returns');const id=new URL(request.url).searchParams.get('id'),credit=await db.prepare('SELECT * FROM returns WHERE id=?').bind(id).first();if(!credit)throw new DomainError('Avoir introuvable.',404);const lines=await db.prepare('SELECT rl.*,sl.name,sl.priceCents FROM returnLines rl JOIN saleLines sl ON sl.id=rl.saleLineId WHERE returnId=?').bind(id).all();return json(scrub({credit,lines:lines.results},false));}
 if(action==='backup'){requireRight(actor,'backups');requireRight(actor,'margins');const tables=['settings','taxes','suppliers','products','lots','movements','receipts','sales','saleLines','receiptLines','returns','returnLines','quarantine','drafts','audit'];const results=await db.batch(tables.map(t=>db.prepare(`SELECT * FROM ${t}`)));return json({format:'pharmacie-ijjai-business-v9',schemaVersion:11,createdAt:new Date().toISOString(),tables:Object.fromEntries(tables.map((t,i)=>[t,results[i].results]))});}
 throw new DomainError('Route inconnue.',404);
 }catch(e){return fail(e);}}
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){try{verifyOrigin(request);const body=await readJson(request);const {action}=await params,db=database();await initialize(db);
 if(action==='register'){const result=await register(db,body);return json({actor:result.actor},201,{'Set-Cookie':result.cookie});}
 if(action==='login'){const result=await login(db,body,request);return json({actor:result.actor},200,{'Set-Cookie':result.cookie});}
 if(action==='logout')return json({ok:true},200,{'Set-Cookie':await logout(db,request)});
 const actor=await identify(db,request);if(!actor)throw new DomainError('Votre session a expiré. Reconnectez-vous.',401);if(action==='invitations')return json(await invite(db,actor,body));if(action==='password'){const result=await changePassword(db,actor,body);return json(result,200,{'Set-Cookie':await logout(db,request)});}return json(await mutate(db,action,body,actor));
 }catch(e){return fail(e);}}
