import type {SqlDatabase,SqlStatement} from './sql';
import {type Actor,can,type Right} from './access';
import {requireRight,auditStatement} from './auth';
import {transact,extraSnapshot,scrub} from './v9-service';
import { z } from 'zod';
import {parseActiveIngredients} from './ingredients';
import { productSchema, supplierSchema, receiptSchema, saleSchema, allocateLots, productLabel, taxIncluded, today, DomainError, type Product, type Lot } from './domain';
const uid=()=>crypto.randomUUID();
export async function snapshot(db:SqlDatabase,actor:Actor){
 const results=await db.batch([
 db.prepare(`SELECT p.*,t.label taxLabel,t.rateBp taxRateBp,COALESCE(SUM(l.quantity),0) stock,COALESCE(SUM(CASE WHEN l.expiry IS NULL OR l.expiry>=? THEN l.quantity ELSE 0 END),0) available,MIN(CASE WHEN l.quantity>0 THEN l.expiry END) nextExpiry FROM products p JOIN taxes t ON t.id=p.taxId LEFT JOIN lots l ON l.productId=p.id GROUP BY p.id ORDER BY p.name COLLATE NOCASE`).bind(today()),
 db.prepare('SELECT l.*,p.name FROM lots l JOIN products p ON p.id=l.productId ORDER BY l.expiry IS NULL,l.expiry,l.receivedAt'),
 db.prepare('SELECT m.*,p.name,l.code FROM movements m JOIN products p ON p.id=m.productId JOIN lots l ON l.id=m.lotId ORDER BY m.createdAt DESC'),
 db.prepare('SELECT * FROM sales ORDER BY createdAt DESC'),db.prepare('SELECT r.*,s.name supplierName FROM receipts r LEFT JOIN suppliers s ON s.id=r.supplierId ORDER BY r.createdAt DESC'),db.prepare('SELECT * FROM suppliers ORDER BY name'),db.prepare('SELECT * FROM taxes ORDER BY rateBp,label'),db.prepare('SELECT * FROM settings')]);
 const raw={products:results[0].results.map(p=>({...p,activeIngredients:parseActiveIngredients(p.activeIngredients)})),lots:results[1].results,movements:results[2].results,sales:results[3].results,receipts:results[4].results,suppliers:results[5].results,taxes:results[6].results,settings:Object.fromEntries(results[7].results.map((row)=>{const x=row as {key:string;value:string};return [x.key,x.value];}))};
 const extra=await extraSnapshot(db,actor);
 if(!can(actor,'sales')&&!can(actor,'reports')&&!can(actor,'returns'))raw.sales=[];
 if(!can(actor,'stock')&&!can(actor,'reports'))raw.movements=[];
 if(!can(actor,'purchases'))raw.receipts=[];
 if(!can(actor,'suppliers')&&!can(actor,'purchases'))raw.suppliers=[];
 let ledger:any[]=[];
 if(can(actor,'reports')){
 const rows=await db.batch([
 db.prepare(`SELECT sl.id,s.number reference,s.createdAt,sl.kind,'sale' event,sl.quantity,sl.quantity*sl.priceCents totalCents,sl.costTotalCents costCents,sl.taxTotalCents taxCents FROM saleLines sl JOIN sales s ON s.id=sl.saleId`),
 db.prepare(`SELECT rl.id,r.number reference,r.createdAt,sl.kind,'return' event,-rl.quantity quantity,-rl.totalCents totalCents,-rl.costCents costCents,-rl.taxCents taxCents FROM returnLines rl JOIN returns r ON r.id=rl.returnId JOIN saleLines sl ON sl.id=rl.saleLineId`),
 ...(can(actor,'margins')?[db.prepare(`SELECT rl.id,r.document reference,r.createdAt,rl.kind,'purchase' event,rl.quantity+rl.freeQuantity quantity,rl.totalCents,rl.totalCents costCents,0 taxCents FROM receiptLines rl JOIN receipts r ON r.id=rl.receiptId`)]:[])
 ]);ledger=rows.flatMap(r=>r.results);
 }
 return scrub({...raw,...extra,ledger},can(actor,'margins'));
}
export async function mutate(db:SqlDatabase,action:string,body:unknown,actor:Actor){
 const required:Record<string,Right>={products:'stock',archive:'stock',suppliers:'suppliers',adjust:'stock',settings:'settings',taxes:'settings'};
 if(required[action])requireRight(actor,required[action]);
 if(action==='products')requireRight(actor,'margins');
 const transaction=await transact(db,action,body,actor);if(transaction!==undefined)return scrub(transaction,can(actor,'margins'));
 const audit=(ref:string)=>auditStatement(db,actor,action,ref);
 const now=new Date().toISOString(); const prep=(sql:string,...args:unknown[])=>db.prepare(sql).bind(...args);
 if(action==='products'){
  const {id,version,...p}=productSchema.parse(body);
  if(!id&&p.kind==='medicament'&&!p.activeIngredients.length)throw new DomainError('Indiquez au moins une DCI avec son dosage et son unité pour tout nouveau médicament.');
  const canonical=p.activeIngredients.length?{
   dci:p.activeIngredients.map(i=>i.name.trim()).join(' + '),
   dosage:p.activeIngredients.length===1?String(p.activeIngredients[0].dose):'',
   dosageUnit:p.activeIngredients.length===1?p.activeIngredients[0].unit:''
  }:{dci:p.dci,dosage:p.dosage,dosageUnit:p.dosageUnit};
  const dbProduct={...p,...canonical,activeIngredients:JSON.stringify(p.activeIngredients)};if(!await prep('SELECT id FROM taxes WHERE id=?',p.taxId).first())throw new DomainError('Profil de TVA inconnu.');
  const duplicate=await prep('SELECT id FROM products WHERE barcode=?',p.barcode).first<{id:string}>();
  if(duplicate&&duplicate.id!==id)throw new DomainError('Ce code-barres est déjà enregistré dans le catalogue. Recherchez sa fiche avant de créer un autre produit.',409);
  if(id){if(!version)throw new DomainError('Version de la fiche manquante.');if(!await prep('SELECT id FROM products WHERE id=?',id).first())throw new DomainError('Produit introuvable.',404);await db.batch([prep(`UPDATE products SET ${Object.keys(dbProduct).map(x=>`${x}=?`).join(',')},version=CASE WHEN version=? THEN version+1 ELSE -1 END WHERE id=?`,...Object.values(dbProduct),version,id),audit(id)]);return {id};}
  const newId=uid(),obj={id:newId,...dbProduct,createdAt:now};await db.batch([prep(`INSERT INTO products (${Object.keys(obj).join(',')}) VALUES (${Object.keys(obj).map(()=>'?').join(',')})`,...Object.values(obj)),audit(newId)]);return {id:newId};
 }
 if(action==='archive'){const {id,archived}=z.object({id:z.string(),archived:z.boolean()}).parse(body);const found=await prep('SELECT id FROM products WHERE id=?',id).first();if(!found)throw new DomainError('Produit introuvable.',404);await db.batch([prep('UPDATE products SET archived=?,version=version+1 WHERE id=?',archived?1:0,id),audit(id)]);return{id};}
 if(action==='suppliers'){const {id,...s}=supplierSchema.parse(body);const key=id??uid();await db.batch([prep('INSERT INTO suppliers (id,name,phone,email,city,note) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,email=excluded.email,city=excluded.city,note=excluded.note',key,s.name,s.phone,s.email,s.city,s.note),audit(key)]);return{id:key};}
 if(action==='adjust'){
  const x=z.object({id:z.string().uuid(),lotId:z.string(),quantity:z.number().int().min(0).max(1000000),reason:z.string().trim().min(5).max(300)}).parse(body);const prev=await prep('SELECT requestKey FROM movements WHERE id=?',x.id).first();if(prev){if(prev.requestKey!==JSON.stringify(x))throw new DomainError('Cet ajustement a déjà été enregistré avec un autre contenu.',409);return{id:x.id};}const lot=await prep('SELECT * FROM lots WHERE id=?',x.lotId).first<Lot>();if(!lot)throw new DomainError('Lot introuvable.',404);const delta=x.quantity-lot.quantity;if(!delta)throw new DomainError('La quantité est déjà identique.');await db.batch([prep('UPDATE lots SET quantity=CASE WHEN quantity=? AND valueCents=? THEN ? ELSE -1 END,valueCents=? WHERE id=?',lot.quantity,lot.valueCents,x.quantity,lot.quantity?Math.round(lot.valueCents*x.quantity/lot.quantity):lot.unitCostCents*x.quantity,lot.id),prep('INSERT INTO movements (id,productId,lotId,kind,delta,reference,reason,createdAt,requestKey,operatorId,operatorName) VALUES (?,?,?,?,?,?,?,?,?,?,?)',x.id,lot.productId,lot.id,'adjustment',delta,x.id,x.reason,now,JSON.stringify(x),actor.id,actor.name),audit(x.id)]);return{id:x.id};
 }
 if(action==='settings'){
  const x=z.object({pharmacyName:z.string().trim().min(2).max(100),pharmacist:z.string().max(100),phone:z.string().max(40),address:z.string().max(300),expiryDays:z.number().int().min(1).max(365),ice:z.string().max(40).default(''),ifNumber:z.string().max(40).default('')}).parse(body);await db.batch([...Object.entries(x).map(([k,v])=>prep('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',k,String(v))),audit('pharmacy')]);return{saved:true};
 }
 if(action==='taxes'){
  const x=z.object({id:z.string().optional(),label:z.string().trim().min(2).max(80),rateBp:z.number().int().min(0).max(10000)}).parse(body);const id=x.id??uid();await db.batch([prep('INSERT INTO taxes (id,label,rateBp) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,rateBp=excluded.rateBp',id,x.label,x.rateBp),audit(id)]);return{id};
 }
 throw new DomainError('Action inconnue.',404);
}
