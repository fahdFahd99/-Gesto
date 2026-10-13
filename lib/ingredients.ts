/** Strict catalogue matching by DCI + labelled strength; NOT a clinical interchangeability decision. */
export const ingredientUnits = ['mg','g','µg','mg/ml','mg/5 ml','g/L','µg/ml','UI','UI/ml','%'] as const;
export type IngredientUnit = typeof ingredientUnits[number];
export type ActiveIngredient = {name:string;dose:number;unit:IngredientUnit};
export const EMPTY_INGREDIENT:ActiveIngredient = {name:'',dose:0,unit:'mg'};
export const MAX_INGREDIENTS = 4;
const conversion:Record<IngredientUnit,{dimension:string;factor:number}> = {
 'mg':{dimension:'mass-mg',factor:1},'g':{dimension:'mass-mg',factor:1000},'µg':{dimension:'mass-mg',factor:0.001},
 'mg/ml':{dimension:'conc-mg-ml',factor:1},'mg/5 ml':{dimension:'conc-mg-ml',factor:0.2},
 'g/L':{dimension:'conc-mg-ml',factor:1},'µg/ml':{dimension:'conc-mg-ml',factor:0.001},
 'UI':{dimension:'ui',factor:1},'UI/ml':{dimension:'ui-ml',factor:1},'%':{dimension:'percent',factor:1}
};
export function normalizeDci(name:string):string {
 return name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
}
export function ingredientKey(item:ActiveIngredient):string|null {
 const name=normalizeDci(item.name);
 if(!name||!Number.isFinite(item.dose)||item.dose<=0||item.dose>1000000||!conversion[item.unit])return null;
 const {dimension,factor}=conversion[item.unit];
 const integerStrength=Math.round(item.dose*factor*1e6);
 return integerStrength>0&&Number.isSafeInteger(integerStrength)?`${name}|${dimension}|${integerStrength}`:null;
}
export function validComposition(items:ActiveIngredient[]):boolean {
 if(!Array.isArray(items)||items.length<1||items.length>MAX_INGREDIENTS)return false;
 const names=items.map(i=>normalizeDci(i.name));
 return names.every(Boolean)&&new Set(names).size===names.length&&items.every(i=>ingredientKey(i)!==null);
}
export function compositionSignature(items:ActiveIngredient[]):string|null {
 if(!validComposition(items))return null;
 return items.map(i=>ingredientKey(i)!).sort().join('||');
}
export function parseActiveIngredients(value:unknown):ActiveIngredient[] {
 let v=value;
 if(typeof v==='string'){try{v=JSON.parse(v);}catch{return [];}}
 if(!Array.isArray(v)||v.length>MAX_INGREDIENTS)return [];
 const list=v.filter(i=>i&&typeof i.name==='string'&&typeof i.dose==='number'&&typeof i.unit==='string') as ActiveIngredient[];
 return list.length===v.length&&validComposition(list)?list:[];
}
/** Legacy DCI is used ONLY when unambiguously a single substance with numeric strength. */
export function ingredientsOf(product:{activeIngredients?:ActiveIngredient[]|string;dci?:string;dosage?:string;dosageUnit?:string}):ActiveIngredient[] {
 const stored=parseActiveIngredients(product.activeIngredients);
 if(stored.length)return stored;
 if(typeof product.activeIngredients==='string'&&product.activeIngredients.trim()!=='[]')return [];
 if(Array.isArray(product.activeIngredients)&&product.activeIngredients.length>0)return [];
 const dci=(product.dci||'').trim(),dosage=(product.dosage||'').trim().replace(',','.');
 if(!dci||/[+\/,;\n]/.test(dci)||!/^[\p{L}\p{M}\d\s()'’.-]+$/u.test(dci)||!/^\d+(?:\.\d+)?$/.test(dosage))return [];
 if(!ingredientUnits.includes(product.dosageUnit as IngredientUnit))return [];
 const single:ActiveIngredient={name:dci,dose:Number(dosage),unit:product.dosageUnit as IngredientUnit};
 return validComposition([single])?[single]:[];
}
export function sameComposition(a:ActiveIngredient[],b:ActiveIngredient[]):boolean {
 const signature=compositionSignature(a);
 return signature!==null&&signature===compositionSignature(b);
}
export function formatComposition(items:ActiveIngredient[]):string {
 return items.map(i=>`${i.name} ${String(i.dose).replace('.',',')} ${i.unit}`).join(' + ');
}
