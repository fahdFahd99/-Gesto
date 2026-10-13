import { z } from 'zod';
import type {Actor} from './access';
import {ingredientUnits, normalizeDci, ingredientsOf, formatComposition} from './ingredients';
export const kinds = { medicament:'Médicament', parapharmacie:'Parapharmacie' } as const;
export type Kind = keyof typeof kinds;
const str = z.string().trim().max(180).default('');
const count = z.number().int().min(0).max(1000000);
const money = z.number().int().min(0).max(100000000);
const ingredientSchema=z.object({name:z.string().trim().min(2).max(140),dose:z.number().finite().positive().max(1000000),unit:z.enum(ingredientUnits)});

export const productSchema = z.object({
 id:z.string().optional(),version:z.number().int().positive().optional(),barcode:z.string().trim().regex(/^[A-Za-z0-9._-]{3,48}$/, 'Code-barres : 3 à 48 caractères, sans espace.'), name:z.string().trim().min(2,'Le nom est obligatoire.').max(160), kind:z.enum(['medicament','parapharmacie']), category:str, subcategory:str, brand:str, dci:str, dosage:str, dosageUnit:str, activeIngredients:z.array(ingredientSchema).max(4).default([]), form:str, packaging:str, unitsPerBox:count.min(1).default(1), blisters:count.default(0), unitsPerBlister:count.default(0), volume:str,volumeUnit:str,weight:str,weightUnit:str,age:str,stage:str,gluten:z.enum(['non_renseigne','sans','avec']).default('non_renseigne'),purchaseCents:money,discountBp:z.number().int().min(0).max(10000),saleCents:money,taxId:z.string().min(1),minStock:count,location:str
}).superRefine((p,ctx)=>{if(p.activeIngredients.length && p.kind!=='medicament')ctx.addIssue({code:'custom',path:['activeIngredients'],message:'Les substances actives concernent uniquement les médicaments.'});
 const names=p.activeIngredients.map(i=>normalizeDci(i.name));if(new Set(names).size!==names.length)ctx.addIssue({code:'custom',path:['activeIngredients'],message:'Chaque matière active ne peut apparaître qu’une fois.'});
 if(p.blisters && p.unitsPerBlister && p.unitsPerBox !== p.blisters*p.unitsPerBlister) ctx.addIssue({code:'custom',path:['unitsPerBox'],message:'Le nombre d’unités doit correspondre aux plaquettes × unités par plaquette.'});});
export type ProductInput = z.infer<typeof productSchema>;
export type Product = ProductInput & {id:string;version:number;archived:number;createdAt:string;stock:number;available:number;nextExpiry:string|null;taxLabel:string;taxRateBp:number};
export interface Tax {id:string;label:string;rateBp:number}
export interface Supplier {id:string;name:string;phone:string;email:string;city:string;note:string}
export interface Lot {id:string;productId:string;name:string;code:string;expiry:string|null;quantity:number;unitCostCents:number;supplierId:string|null;receivedAt:string;series:number;manufacturerLot:string;valueCents:number}
export interface Movement {id:string;productId:string;name:string;code:string;kind:string;delta:number;reference:string;reason:string;createdAt:string}
export interface Sale {id:string;number:string;totalCents:number;costCents:number;taxCents:number;payment:string;receivedCents:number;createdAt:string;operatorId:string;operatorName:string;itemCount:number}
export interface Receipt {id:string;supplierId:string|null;supplierName:string|null;document:string;totalCents:number;createdAt:string;receptionDate:string;operatorId:string;operatorName:string}
export interface Snapshot {products:Product[];lots:Lot[];movements:Movement[];sales:Sale[];receipts:Receipt[];suppliers:Supplier[];taxes:Tax[];settings:Record<string,string>;actor:Actor;holds:Draft[];drafts:Draft[];returns:Credit[];quarantine:Quarantine[];employees:Actor[];audit:AuditEvent[];ledger:LedgerEntry[]}
export const defaultProduct: ProductInput = {barcode:'',name:'',kind:'medicament',category:'',subcategory:'',brand:'',dci:'',dosage:'',dosageUnit:'mg',activeIngredients:[],form:'Comprimé',packaging:'Boîte',unitsPerBox:1,blisters:0,unitsPerBlister:0,volume:'',volumeUnit:'ml',weight:'',weightUnit:'g',age:'',stage:'',gluten:'non_renseigne',purchaseCents:0,discountBp:0,saleCents:0,taxId:'exonere',minStock:5,location:''};
export const netCost = (gross:number, discountBp:number) => Math.round(gross*(10000-discountBp)/10000);
export const taxIncluded = (ttc:number, rateBp:number) => Math.round(ttc*rateBp/(10000+rateBp));
export const cents = (value:string|number) => Math.round(Number(String(value).replace(',','.'))*100);
export const moneyFmt = (value:number) => new Intl.NumberFormat('fr-MA',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100);
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Casablanca',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const dateFmt = (value:string, time=false) => new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Casablanca',day:'2-digit',month:'short',...(time?{hour:'2-digit',minute:'2-digit'}:{year:'numeric'})}).format(new Date(value.length===10?value+'T12:00:00Z':value));
export const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function matches(p:Product,query:string){const hay=normalize([p.barcode,p.name,p.brand,p.dci,...ingredientsOf(p).map(i=>i.name+' '+i.dose+' '+i.unit),p.category,p.subcategory,p.dosage,p.form,p.stage,p.age,p.location].join(' '));return normalize(query).split(/\s+/).every(x=>hay.includes(x));}
export function productLabel(p:ProductInput){const composition=ingredientsOf(p);return [p.name,p.kind==='medicament'&&composition.length?formatComposition(composition):p.kind==='medicament'&&p.dosage?`${p.dosage} ${p.dosageUnit}`:'',p.kind==='medicament'?p.form:'',p.kind==='parapharmacie'?p.stage:'',p.volume?`${p.volume} ${p.volumeUnit}`:'',p.weight?`${p.weight} ${p.weightUnit}`:'',p.kind==='medicament'&&p.unitsPerBox>1?`Boîte de ${p.unitsPerBox}`:''].filter(Boolean).join(' · ');}
export class DomainError extends Error {constructor(message:string,public status=400){super(message);}}
export function allocateLots(lots:Lot[],quantity:number,day:string){let left=quantity;const result:{lot:Lot;quantity:number}[]=[];for(const lot of [...lots].filter(l=>l.quantity>0&&(!l.expiry||l.expiry>=day)).sort((a,b)=>(a.expiry??'9999').localeCompare(b.expiry??'9999')||a.receivedAt.localeCompare(b.receivedAt))){const take=Math.min(left,lot.quantity);if(take>0)result.push({lot,quantity:take});left-=take;if(!left)break;}if(left>0)throw new DomainError('Stock disponible insuffisant. Les lots périmés sont exclus.',409);return result;}
export const idSchema=z.string().uuid();
export const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x=>{const d=new Date(x+'T12:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===x;},'Date invalide.');
export const receiptSchema=z.object({id:idSchema,supplierId:z.string().nullable(),document:z.string().trim().min(1).max(100),kind:z.enum(['entry','initial']).default('entry'),lines:z.array(z.object({productId:z.string(),code:z.string().trim().min(1).max(80),expiry:dateSchema.nullable(),quantity:count.min(1),unitCostCents:money})).min(1).max(60)});
export const saleSchema=z.object({id:idSchema,draftId:z.string().optional(),draftVersion:z.number().int().positive().optional(),payment:z.enum(['Espèces','Carte','Chèque','Virement']),expectedTotalCents:money,receivedCents:money,lines:z.array(z.object({productId:z.string(),quantity:count.min(1)})).min(1).max(60)});
export const supplierSchema=z.object({id:z.string().optional(),name:z.string().trim().min(2).max(120),phone:str,email:z.union([z.literal(''),z.string().email()]),city:str,note:z.string().max(1000)});

export interface Draft {id:string;type:'sale'|'purchase';ownerId:string;ownerName:string;label:string;payload:any;status:'draft'|'held'|'closed'|'abandoned';version:number;createdAt:string;updatedAt:string}
export interface Credit {id:string;saleId:string;number:string;totalCents:number;costCents:number;taxCents:number;payment:string;reason:string;operatorName:string;createdAt:string}
export interface Quarantine {id:string;productId:string;lotId:string;name:string;code:string;expiry:string|null;quantity:number;valueCents:number;status:string;reason:string;version:number;createdAt:string}
export interface AuditEvent {id:string;operatorId:string;operatorName:string;action:string;reference:string;detail:string;createdAt:string}
export const purchaseSchema=z.object({id:idSchema,draftId:z.string().optional(),draftVersion:z.number().int().positive().optional(),supplierId:z.string().nullable(),document:z.string().trim().min(1).max(100),kind:z.enum(['entry','initial']).default('entry'),receptionDate:dateSchema,lines:z.array(z.object({productId:z.string(),series:count.min(1).max(99999),manufacturerLot:z.string().trim().max(80).default(''),expiry:dateSchema.nullable(),quantity:count.min(1),freeQuantity:count.default(0),purchaseCents:money,discountBp:z.number().int().min(0).max(10000),saleCents:money})).min(1).max(60)});
export const purchaseLineTotal=(line:{purchaseCents:number;quantity:number;discountBp:number})=>Math.round(line.purchaseCents*line.quantity*(10000-line.discountBp)/10000);
export function nextDocument(previous:string){return previous.replace(/(\d+)(?!.*\d)/,n=>String(BigInt(n)+BigInt(1)).padStart(n.length,'0'))||(previous?'':'BL-0001');}
export const dateOf=(s:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Casablanca',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s));

export interface LedgerEntry {id:string;reference:string;createdAt:string;kind:Kind;event:'sale'|'return'|'purchase';quantity:number;totalCents:number;costCents:number;taxCents:number}
